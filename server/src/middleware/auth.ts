import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { AuthContext } from "@/types/express";

export async function authenticateAccessToken(token: string) {
  const { sub, sid } = verifyAccessToken(token);
  const session = await prisma.session.findFirst({ where: { id: sid, userId: sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, lastUsedAt: true } });
  if (!session) throw ApiError.unauthorized("Session has been revoked or expired");
  if (session.lastUsedAt && session.lastUsedAt.getTime() < Date.now() - 5 * 60_000) {
    await prisma.session.updateMany({ where: { id: sid, revokedAt: null, lastUsedAt: { lt: new Date(Date.now() - 5 * 60_000) } }, data: { lastUsedAt: new Date() } });
  }
  return loadAuthContext(sub);
}

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

  const financeAccess = isSuperAdmin || roles.some(role => ["Admin", "Accountant"].includes(role));
  if (!financeAccess) for (const key of permissions) if (key.startsWith("payments.") || key.startsWith("taxReturns.") || key === "violations.pay") permissions.delete(key);
  return { userId: user.id, fullName: user.fullName, email: user.email, roles, permissions, isSuperAdmin, financeAccess, avatarFileId: user.avatarFileId, avatarKey: user.avatarKey };
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing access token");
  }
  const token = header.slice("Bearer ".length);

  let auth: AuthContext | null;
  try {
    auth = await authenticateAccessToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }

  if (!auth) throw ApiError.unauthorized("Account is inactive or no longer exists");

  req.auth = auth;
  next();
});

/** Attaches req.auth when a valid token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.auth = (await authenticateAccessToken(header.slice("Bearer ".length))) ?? undefined;
    } catch {
      // ignore — request proceeds unauthenticated
    }
  }
  next();
});
