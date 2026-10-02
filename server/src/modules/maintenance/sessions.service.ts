import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { ApiError } from "@/utils/apiError";
export async function sessionFamily(userId: string, token: string) {
  const { sid, sub } = verifyAccessToken(token);
  if (sub !== userId) throw ApiError.unauthorized();
  const current = await prisma.session.findFirst({ where: { id: sid, userId, revokedAt: null, expiresAt: { gt: new Date() } } });
  if (!current) throw ApiError.unauthorized();
  return current.familyId;
}
export async function listSessions(userId: string, token: string) {
  const family = await sessionFamily(userId, token);
  const rows = await prisma.session.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, distinct: ["familyId"], orderBy: { lastUsedAt: "desc" }, take: 200, select: { familyId: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true, expiresAt: true } });
  return rows.map(row => ({ ...row, current: row.familyId === family }));
}
export async function revokeSessions(userId: string, token: string, familyId?: string) {
  const current = await sessionFamily(userId, token);
  // Same user lock as refresh: a rotation cannot escape revocation.
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    await tx.session.updateMany({ where: { userId, revokedAt: null, ...(familyId ? { familyId } : { familyId: { not: current } }) }, data: { revokedAt: new Date() } });
  });
  return { signedOut: familyId === current };
}
