import ms from "ms";
import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword } from "@/lib/password";
import { signAccessToken } from "@/lib/jwt";
import { generateOpaqueToken, hashToken } from "@/lib/tokens";
import { env } from "@/config/env";
import { ApiError } from "@/utils/apiError";
import { loadAuthContext } from "@/middleware/auth";
import { sendMail } from "@/services/email";
import type { LoginInput, RegisterInput } from "@/modules/auth/auth.schemas";

const REFRESH_COOKIE_NAME = "refresh_token";

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

async function ensureDefaultRole(roleName: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw ApiError.internal(`Default role "${roleName}" is missing — run the seed script.`);
  return role;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.badRequest("An account with this email already exists.");

  const employeeRole = await ensureDefaultRole("Employee");
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      userRoles: { create: [{ roleId: employeeRole.id }] },
    },
  });

  await issueEmailVerification(user.id, user.email, user.fullName);

  return user;
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
    html: `<p>Hello ${fullName},</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This verification link is invalid or has expired.");
  }
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
}

export async function login(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated.");

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const auth = await loadAuthContext(user.id);
  if (!auth) throw ApiError.unauthorized("Invalid email or password");

  const accessToken = signAccessToken({ sub: user.id });
  const refreshTtl = input.rememberMe ? env.JWT_REFRESH_EXPIRES_IN : "1d";
  const refreshToken = await createSession(user.id, refreshTtl, meta);

  return { accessToken, refreshToken, refreshTtl, auth };
}

async function createSession(userId: string, ttl: string, meta: RequestMeta) {
  const rawToken = generateOpaqueToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ms(ttl)),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });
  return rawToken;
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
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  const rawRefresh = generateOpaqueToken();
  await prisma.session.create({
    data: {
      userId: session.userId,
      tokenHash: hashToken(rawRefresh),
      expiresAt: new Date(Date.now() + remainingMs),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  const accessToken = signAccessToken({ sub: session.userId });
  return { accessToken, refreshToken: rawRefresh, remainingMs, auth };
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
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
  await sendMail({
    to: user.email,
    subject: "Reset your password",
    html: `<p>Hello ${user.fullName},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect.");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export const cookies = {
  name: REFRESH_COOKIE_NAME,
};
