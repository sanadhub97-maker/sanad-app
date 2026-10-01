import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import { isProduction } from "@/config/env";
import * as authService from "@/modules/auth/auth.service";
import { loadAuthContext } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import * as filesService from "@/modules/files/files.service";
import type { AuthContext } from "@/types/express";

const REFRESH_COOKIE = "refresh_token";

function setRefreshCookie(res: Response, token: string, ttlMs: number) {
  // A cookie set before partitioning is a separate cookie with the same name;
  // left in place it would come first and carry a token that was already
  // rotated, so it is cleared each time the partitioned one is set.
  if (isProduction) res.clearCookie(REFRESH_COOKIE, { path: "/api/auth", secure: true, sameSite: "none" });
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // Frontend and backend deploy as separate subdomains (e.g. on Render),
    // so the cookie must survive cross-site fetches in production —
    // SameSite=None requires Secure, which is only set once isProduction.
    sameSite: isProduction ? "none" : "lax",
    // Partitioned (CHIPS): when the app is shown inside another site's frame
    // (sanad-hr.sept.cloud), browsers keep this cookie for that site only
    // instead of dropping it as a third-party cookie.
    partitioned: isProduction,
    path: "/api/auth",
    maxAge: ttlMs,
  });
}

/* Inside a frame some browsers (Safari above all) keep no cookie at all, so
   the app there says so (X-Embedded) and keeps the refresh token itself: it
   comes back in the body, and is accepted from the body when no cookie came. */
const embedded = (req: Request) => req.get("X-Embedded") === "1";
const bodyToken = (req: Request): string | undefined => {
  const t = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  return typeof t === "string" && t.length > 10 && t.length < 500 ? t : undefined;
};

function clientMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

function serializeAuth(auth: AuthContext) {
  return {
    id: auth.userId,
    fullName: auth.fullName,
    email: auth.email,
    roles: auth.roles,
    permissions: auth.isSuperAdmin ? ["*"] : Array.from(auth.permissions),
    isSuperAdmin: auth.isSuperAdmin,
    avatarFileId: auth.avatarFileId,
    avatarKey: auth.avatarKey,
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, clientMeta(req));
  setRefreshCookie(res, result.refreshToken, msFromTtl(result.refreshTtl));
  res.json({ data: { accessToken: result.accessToken, user: serializeAuth(result.auth), ...(embedded(req) ? { refreshToken: result.refreshToken } : {}) } });
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
  const rawToken = req.cookies?.[REFRESH_COOKIE] ?? bodyToken(req);
  if (!rawToken) throw ApiError.unauthorized("No refresh token provided");

  const result = await authService.refreshSession(rawToken, clientMeta(req));
  setRefreshCookie(res, result.refreshToken, result.remainingMs);
  res.json({ data: { accessToken: result.accessToken, user: serializeAuth(result.auth), ...(embedded(req) ? { refreshToken: result.refreshToken } : {}) } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE] ?? bodyToken(req);
  await authService.logout(rawToken);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth", secure: isProduction, sameSite: isProduction ? "none" : "lax", partitioned: isProduction });
  if (isProduction) res.clearCookie(REFRESH_COOKIE, { path: "/api/auth", secure: true, sameSite: "none" });
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

// ---- The signed-in user's own avatar: a photo, a ready-made one, or initials ----

async function currentAuth(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  const fresh = await loadAuthContext(req.auth.userId);
  if (!fresh) throw ApiError.unauthorized();
  return fresh;
}

async function dropOldPhoto(fileId: string | null) {
  if (fileId) await filesService.remove(fileId).catch(() => undefined);
}

/** PUT /auth/avatar { avatarKey } — a ready-made avatar, or null for initials. */
export const setAvatar = asyncHandler(async (req: Request, res: Response) => {
  const before = await currentAuth(req);
  const avatarKey = (req.body.avatarKey as string | null) ?? null;
  await prisma.user.update({ where: { id: before.userId }, data: { avatarKey, avatarFileId: null } });
  await dropOldPhoto(before.avatarFileId);
  res.json({ data: serializeAuth(await currentAuth(req)) });
});

/** POST /auth/avatar/photo (multipart "file") — the user's own photo. */
export const uploadAvatarPhoto = asyncHandler(async (req: Request, res: Response) => {
  const before = await currentAuth(req);
  if (!req.file) throw ApiError.badRequest("No image was uploaded.");
  if (!["image/jpeg", "image/png"].includes(req.file.mimetype)) throw ApiError.badRequest("The photo must be a JPG or PNG image.");
  if (req.file.size > 2 * 1024 * 1024) throw ApiError.badRequest("The photo must be under 2 MB.");
  const file = await filesService.saveFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname || "avatar.jpg",
    mimeType: req.file.mimetype,
    uploadedById: before.userId,
    module: "user-avatar",
    relatedId: before.userId,
  });
  await prisma.user.update({ where: { id: before.userId }, data: { avatarFileId: file.id, avatarKey: null } });
  await dropOldPhoto(before.avatarFileId);
  res.json({ data: serializeAuth(await currentAuth(req)) });
});
