import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/utils/apiError";
import rateLimit from "express-rate-limit";

let activeUploads = 0;
export function uploadBudget(req: Request, res: Response, next: NextFunction) {
  if (activeUploads >= 2) return next(ApiError.tooMany("Upload capacity reached. Please retry shortly."));
  activeUploads++;
  let released = false;
  const release = () => { if (!released) { released = true; activeUploads--; } };
  res.once("finish", release);
  res.once("close", release);
  req.once("aborted", release);
  next();
}

export const uploadLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooMany("Too many uploads. Please retry shortly.")),
});
