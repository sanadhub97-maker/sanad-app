import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/apiError";

/** Super Admin (permission set containing "*") bypasses every check. */
export function requirePermission(...permissionKeys: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return next(ApiError.unauthorized());
    if (auth.isSuperAdmin || auth.permissions.has("*")) return next();

    const hasAny = permissionKeys.some((key) => auth.permissions.has(key));
    if (!hasAny) {
      return next(ApiError.forbidden(`Missing permission: ${permissionKeys.join(" or ")}`));
    }
    next();
  };
}
