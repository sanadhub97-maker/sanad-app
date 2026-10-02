import ms from "ms";
import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword } from "@/lib/password";
import { signAccessToken } from "@/lib/jwt";
import { generateOpaqueToken, hashToken } from "@/lib/tokens";
import { env } from "@/config/env";
import { ApiError } from "@/utils/apiError";
import { loadAuthContext } from "@/middleware/auth";
import { sendMail } from "@/services/email";
import { logger } from "@/lib/logger";
import type { LoginInput } from "@/modules/auth/auth.schemas";
import { escapeHtml } from "@/lib/security";

const REFRESH_COOKIE_NAME = "refresh_token";

// Serialize session issuance with password changes and account deactivation.
async function lockUser(tx: Pick<typeof prisma, "$queryRaw">, userId: string) {
  const users = await tx.$queryRaw<{ id: string; passwordHash: string; isActive: boolean; deletedAt: Date | null }[]>`SELECT "id", "passwordHash", "isActive", "deletedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  const user = users[0];
  if (!user || !user.isActive || user.deletedAt) throw ApiError.unauthorized("Account is inactive or no longer exists");
  return user;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export async function issueEmailVerification(userId: string, email: string, fullName: string) {
  const rawToken = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + ms("24h")) },
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  await sendMail({
    to: email,
    subject: "Verify your email address",
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Please verify your email by clicking the link below:</p><p><a href="${escapeHtml(verifyUrl)}">Verify email</a></p>`,
  });
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This verification link is invalid or has expired.");
  }
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw ApiError.badRequest("Verification link is no longer valid.");
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  });
}

export async function login(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
  // Compare a real-cost dummy hash for unknown users to limit enumeration.
  const valid = await comparePassword(input.password, user?.passwordHash ?? "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxFqG7KfCz08WeAzMjRVGm4CZRu");
  if (!user || !user.isActive || !valid) throw ApiError.unauthorized("Invalid email or password");

  const auth = await loadAuthContext(user.id);
  if (!auth) throw ApiError.unauthorized("Invalid email or password");

  const refreshTtl = input.rememberMe ? env.JWT_REFRESH_EXPIRES_IN : "1d";
  const { refreshToken, sessionId } = await createSession(user.id, refreshTtl, meta, user.passwordHash);
  const accessToken = signAccessToken({ sub: user.id, sid: sessionId });

  return { accessToken, refreshToken, refreshTtl, auth };
}

async function createSession(userId: string, ttl: string, meta: RequestMeta, expectedPasswordHash: string) {
  const rawToken = generateOpaqueToken();
  const session = await prisma.$transaction(async (tx) => {
    const current = await lockUser(tx, userId);
    if (current.passwordHash !== expectedPasswordHash) throw ApiError.unauthorized("Password changed. Please sign in again.");
    await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return tx.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ms(ttl)),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
    });
  });
  return { refreshToken: rawToken, sessionId: session.id };
}

export async function refreshSession(rawToken: string, meta: RequestMeta) {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized("Session expired, please log in again.");
  }

  const auth = await loadAuthContext(session.userId);
  if (!auth) throw ApiError.unauthorized("Account is inactive or no longer exists");

  // Rotate: revoke the used refresh token and issue a fresh one.
  const remainingMs = session.expiresAt.getTime() - Date.now();
  const rawRefresh = generateOpaqueToken();
  const successor = await prisma.$transaction(async (tx) => {
    await lockUser(tx, session.userId);
    const claimed = await tx.session.updateMany({ where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
    if (claimed.count !== 1) throw ApiError.unauthorized("Refresh token has already been used.");
    return tx.session.create({
    data: {
      userId: session.userId,
      tokenHash: hashToken(rawRefresh),
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      familyId: session.familyId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
    });
  });

  const accessToken = signAccessToken({ sub: session.userId, sid: successor.id });
  return { accessToken, refreshToken: rawRefresh, remainingMs, auth };
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) return;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${session.userId} FOR UPDATE`;
    // Revoke every successor, including one created during this request.
    await tx.session.updateMany({ where: { userId: session.userId, familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  // Always behave the same way whether or not the account exists, so the
  // endpoint can't be used to enumerate registered emails.
  if (!user) return;

  const rawToken = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + ms("1h")) },
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  // Same reasoning as registration: an SMTP hiccup must not surface as a
  // failure here — that would leak whether the account exists, defeating
  // the point of behaving identically either way.
  try {
    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>This link expires in 1 hour.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`,
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to send password reset email");
  }
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, record.userId);
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw ApiError.badRequest("Reset link is no longer valid.");
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect.");

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const changed = await tx.user.updateMany({ where: { id: userId, passwordHash: user.passwordHash }, data: { passwordHash } });
    if (changed.count !== 1) throw ApiError.badRequest("Password changed concurrently. Please sign in again.");
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  });
}

export const cookies = {
  name: REFRESH_COOKIE_NAME,
};
