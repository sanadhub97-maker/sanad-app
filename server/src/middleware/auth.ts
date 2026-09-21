import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { AuthContext } from "@/types/express";

export async function loadAuthContext(userId: string): Promise<AuthContext | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      userRoles: {
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      },
    },
  });
  if (!user || !user.isActive) return null;

  const roles = user.userRoles.map((ur) => ur.role.name);
  const isSuperAdmin = roles.includes("Super Admin");
  const permissions = new Set<string>();
  for (const ur of user.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.key);
    }
  }

  return { userId: user.id, fullName: user.fullName, email: user.email, roles, permissions, isSuperAdmin };
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing access token");
  }
  const token = header.slice("Bearer ".length);

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }

  const auth = await loadAuthContext(userId);
  if (!auth) throw ApiError.unauthorized("Account is inactive or no longer exists");

  req.auth = auth;
  next();
});

/** Attaches req.auth when a valid token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const userId = verifyAccessToken(header.slice("Bearer ".length)).sub;
      req.auth = (await loadAuthContext(userId)) ?? undefined;
    } catch {
      // ignore — request proceeds unauthenticated
    }
  }
  next();
});
