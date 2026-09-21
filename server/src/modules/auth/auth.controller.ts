import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import { isProduction } from "@/config/env";
import * as authService from "@/modules/auth/auth.service";
import { loadAuthContext } from "@/middleware/auth";

const REFRESH_COOKIE = "refresh_token";

function setRefreshCookie(res: Response, token: string, ttlMs: number) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // Frontend and backend deploy as separate subdomains (e.g. on Render),
    // so the cookie must survive cross-site fetches in production —
    // SameSite=None requires Secure, which is only set once isProduction.
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
    maxAge: ttlMs,
  });
}

function clientMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

function serializeAuth(auth: { userId: string; fullName: string; email: string; roles: string[]; permissions: Set<string>; isSuperAdmin: boolean }) {
  return {
    id: auth.userId,
    fullName: auth.fullName,
    email: auth.email,
    roles: auth.roles,
    permissions: auth.isSuperAdmin ? ["*"] : Array.from(auth.permissions),
    isSuperAdmin: auth.isSuperAdmin,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json({
    data: { id: user.id, fullName: user.fullName, email: user.email },
    message: "Account created. Please check your email to verify your address.",
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, clientMeta(req));
  setRefreshCookie(res, result.refreshToken, msFromTtl(result.refreshTtl));
  res.json({ data: { accessToken: result.accessToken, user: serializeAuth(result.auth) } });
});

function msFromTtl(ttl: string): number {
  // Small local parser so the controller doesn't need the `ms` dependency
  // just for cookie maxAge; matches the same strings used for JWT/session TTLs.
  const match = /^(\d+)(d|h|m|s)$/.exec(ttl);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 }[unit] ?? 86_400_000;
  return value * unitMs;
}

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) throw ApiError.unauthorized("No refresh token provided");

  const result = await authService.refreshSession(rawToken, clientMeta(req));
  setRefreshCookie(res, result.refreshToken, result.remainingMs);
  res.json({ data: { accessToken: result.accessToken, user: serializeAuth(result.auth) } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(rawToken);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth", secure: isProduction, sameSite: isProduction ? "none" : "lax" });
  res.json({ message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const fresh = await loadAuthContext(req.auth.userId);
  if (!fresh) throw ApiError.unauthorized();
  res.json({ data: serializeAuth(fresh) });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.json({ message: "If an account exists for this email, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ message: "Password has been reset. Please log in." });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);
  res.json({ message: "Email verified successfully." });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await authService.changePassword(req.auth.userId, req.body.currentPassword, req.body.newPassword);
  res.json({ message: "Password changed successfully." });
});
