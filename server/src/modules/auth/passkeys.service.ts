import { randomBytes } from "node:crypto";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { env, isProduction } from "@/config/env";
import { comparePassword } from "@/lib/password";
import { hashToken } from "@/lib/tokens";
import { ApiError } from "@/utils/apiError";
import { loginWithPasskey, type RequestMeta } from "./auth.service";

export function passkeyOrigin(raw?: string) {
  if (!raw) throw ApiError.badRequest("Open the website in a browser to use a passkey.");
  const allowed = [env.CLIENT_URL, ...env.TRUSTED_ORIGINS.split(",").filter(Boolean)].map(s => new URL(s.trim()).origin);
  let url: URL;
  try { url = new URL(raw); } catch { throw ApiError.forbidden("Untrusted passkey origin."); }
  if (url.origin !== raw || !allowed.includes(raw) || (isProduction && url.protocol !== "https:")) throw ApiError.forbidden("Untrusted passkey origin.");
  return { origin: url.origin, rpId: url.hostname };
}

const failure = () => ApiError.unauthorized("Unable to verify this passkey. Please try again or use your password.");
async function passwordUser(userId: string, password: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, isActive: true, deletedAt: null } });
  if (!user || !await comparePassword(password, user.passwordHash)) throw ApiError.unauthorized("Current password is incorrect.");
  return user;
}
async function saveChallenge(data: { challenge: string; purpose: string; origin: string; rpId: string; userId?: string; passwordProof?: string; rememberMe?: boolean }) {
  await prisma.passkeyChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  const id = randomBytes(32).toString("base64url");
  await prisma.passkeyChallenge.create({ data: { ...data, id, expiresAt: new Date(Date.now() + 5 * 60_000) } });
  return id;
}
export async function claimChallenge(id: string, purpose: string, origin: string, userId?: string) {
  const ceremony = await prisma.passkeyChallenge.findUnique({ where: { id } });
  if (!ceremony || ceremony.purpose !== purpose || ceremony.origin !== origin || ceremony.userId !== (userId ?? null) || ceremony.expiresAt <= new Date()) throw failure();
  // Atomic claim also prevents parallel verification and replay after success.
  const claimed = await prisma.passkeyChallenge.deleteMany({ where: { id, expiresAt: { gt: new Date() } } });
  if (claimed.count !== 1) throw failure();
  return ceremony;
}
export async function registrationOptions(userId: string, password: string, rawOrigin?: string) {
  const origin = passkeyOrigin(rawOrigin);
  const user = await passwordUser(userId, password);
  const keys = await prisma.passkey.findMany({ where: { userId, rpId: origin.rpId } });
  if (keys.length >= 10) throw ApiError.badRequest("Remove an old passkey before adding another.");
  const options = await generateRegistrationOptions({ rpName: "SanaD — سند", rpID: origin.rpId, userID: new Uint8Array(Buffer.from(userId)), userName: user.email, userDisplayName: user.fullName, attestationType: "none", timeout: 60_000, authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" }, excludeCredentials: keys.map(k => ({ id: k.id, transports: k.transports })) });
  const ceremonyId = await saveChallenge({ ...origin, purpose: "register", challenge: options.challenge, userId, passwordProof: hashToken(user.passwordHash) });
  return { options, ceremonyId };
}
const topOrigins = () => [env.CLIENT_URL, ...env.TRUSTED_ORIGINS.split(",").filter(Boolean)].map(s => new URL(s.trim()).origin);
export async function finishRegistration(userId: string, ceremonyId: string, response: RegistrationResponseJSON, name: string, rawOrigin?: string) {
  const { origin } = passkeyOrigin(rawOrigin);
  const ceremony = await claimChallenge(ceremonyId, "register", origin, userId);
  // Enrollment requires opening the account directly, not through another site's frame.
  try {
    if (JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")).crossOrigin === true) throw failure();
  } catch { throw failure(); }
  let verification;
  try { verification = await verifyRegistrationResponse({ response, expectedChallenge: ceremony.challenge, expectedOrigin: ceremony.origin, expectedRPID: ceremony.rpId, requireUserVerification: true }); } catch { throw failure(); }
  if (!verification.verified) throw failure();
  const { credential } = verification.registrationInfo;
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ passwordHash: string; isActive: boolean; deletedAt: Date | null }[]>`SELECT "passwordHash", "isActive", "deletedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const current = rows[0];
    if (!current?.isActive || current.deletedAt || hashToken(current.passwordHash) !== ceremony.passwordProof) throw failure();
    if (await tx.passkey.count({ where: { userId, rpId: ceremony.rpId } }) >= 10) throw ApiError.badRequest("Passkey limit reached.");
    await tx.passkey.create({ data: { id: credential.id, userId, rpId: ceremony.rpId, publicKey: Buffer.from(credential.publicKey), counter: BigInt(credential.counter), transports: credential.transports ?? [], name } });
  });
}
export async function authenticationOptions(rememberMe: boolean, rawOrigin?: string) {
  const origin = passkeyOrigin(rawOrigin);
  // Discoverable credentials select the account on the device, without exposing emails.
  const options = await generateAuthenticationOptions({ rpID: origin.rpId, userVerification: "required", timeout: 60_000 });
  return { options, ceremonyId: await saveChallenge({ ...origin, challenge: options.challenge, purpose: "login", rememberMe }) };
}
export async function finishAuthentication(ceremonyId: string, response: AuthenticationResponseJSON, meta: RequestMeta, rawOrigin?: string) {
  const { origin } = passkeyOrigin(rawOrigin);
  const ceremony = await claimChallenge(ceremonyId, "login", origin);
  const key = await prisma.passkey.findUnique({ where: { id: response.id } });
  if (!key || key.rpId !== ceremony.rpId || response.response.userHandle !== Buffer.from(key.userId).toString("base64url")) throw failure();
  let verification;
  try { verification = await verifyAuthenticationResponse({ response, expectedChallenge: ceremony.challenge, expectedOrigin: ceremony.origin, expectedRPID: ceremony.rpId, expectedTopOrigin: topOrigins(), credential: { id: key.id, publicKey: new Uint8Array(key.publicKey), counter: Number(key.counter), transports: key.transports }, requireUserVerification: true }); } catch { throw failure(); }
  if (!verification.verified) throw failure();
  return loginWithPasskey(key.userId, ceremony.rememberMe, meta, { id: key.id, counter: key.counter, newCounter: verification.authenticationInfo.newCounter });
}
export async function listPasskeys(userId: string) {
  return prisma.passkey.findMany({ where: { userId }, select: { id: true, name: true, rpId: true, createdAt: true, lastUsedAt: true }, orderBy: { createdAt: "desc" } });
}
export async function removePasskey(userId: string, id: string, password: string) {
  const user = await passwordUser(userId, password);
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ passwordHash: string; isActive: boolean; deletedAt: Date | null }[]>`SELECT "passwordHash", "isActive", "deletedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (!rows[0]?.isActive || rows[0].deletedAt || rows[0].passwordHash !== user.passwordHash) throw failure();
    await tx.session.updateMany({ where: { userId, passkeyId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    const removed = await tx.passkey.deleteMany({ where: { id, userId } });
    if (!removed.count) throw ApiError.notFound("Passkey not found.");
  });
}
