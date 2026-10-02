import type { Request, Response, NextFunction } from "express";
import { env, isProduction } from "@/config/env";
import { ApiError } from "@/utils/apiError";

export function trustedOrigin(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  // Signed push actions use bearer capabilities from the service worker.
  if (/^\/api\/push\/act\//.test(req.path)) return next();
  const origin = req.get("origin");
  const allowed = new Set([new URL(env.CLIENT_URL).origin, ...env.TRUSTED_ORIGINS.split(",").filter(Boolean).map((value) => new URL(value.trim()).origin)]);
  if (origin && !allowed.has(origin)) return next(ApiError.forbidden("Untrusted request origin."));
  if (!origin && req.get("sec-fetch-site") === "cross-site") return next(ApiError.forbidden("Cross-site request rejected."));
  // Non-browser API clients must prove possession of a token. Same-origin
  // browsers send Origin on POST; an absent Origin cannot authorize cookies.
  if (isProduction && !origin && req.cookies?.refresh_token && !req.headers.authorization && !req.body?.refreshToken) {
    return next(ApiError.forbidden("Origin is required for cookie-authenticated requests."));
  }
  next();
}

export function privateResponse(_req: Request, res: Response, next: NextFunction) {
  res.set("Cache-Control", "no-store");
  next();
}
