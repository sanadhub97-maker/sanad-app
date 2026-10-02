import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  prisma: { passkeyChallenge: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() }, passkey: { findUnique: vi.fn(), findMany: vi.fn() }, user: { findFirst: vi.fn() } },
  login: vi.fn(), password: vi.fn(), verifyAuthentication: vi.fn(), verifyRegistration: vi.fn(), generateAuthentication: vi.fn(), generateRegistration: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/config/env", () => ({ env: { CLIENT_URL: "https://app.example", TRUSTED_ORIGINS: "https://trusted.example" }, isProduction: true }));
vi.mock("@/lib/password", () => ({ comparePassword: mocks.password }));
vi.mock("@/modules/auth/auth.service", () => ({ loginWithPasskey: mocks.login }));
vi.mock("@simplewebauthn/server", () => ({ generateAuthenticationOptions: mocks.generateAuthentication, generateRegistrationOptions: mocks.generateRegistration, verifyAuthenticationResponse: mocks.verifyAuthentication, verifyRegistrationResponse: mocks.verifyRegistration }));
import { passkeyOrigin, claimChallenge, registrationOptions, finishAuthentication, finishRegistration, authenticationOptions } from "@/modules/auth/passkeys.service";
const challenge = { id: "once", challenge: "random", purpose: "login", origin: "https://app.example", rpId: "app.example", userId: null, expiresAt: new Date(Date.now() + 300000), rememberMe: false };
const response = { id: "key", rawId: "key", type: "public-key" as const, clientExtensionResults: {}, response: { clientDataJSON: "e30", authenticatorData: "data", signature: "sig", userHandle: Buffer.from("owner").toString("base64url") } };
beforeEach(() => { vi.resetAllMocks(); mocks.prisma.passkeyChallenge.findUnique.mockResolvedValue({ ...challenge, expiresAt: new Date(Date.now() + 300000) }); mocks.prisma.passkeyChallenge.deleteMany.mockResolvedValue({ count: 1 }); });
describe("Passkey boundaries", () => {
  it("accepts only exact configured HTTPS origins", () => {
    expect(passkeyOrigin("https://app.example")).toEqual({ origin: "https://app.example", rpId: "app.example" });
    for (const origin of [undefined, "not-url", "http://app.example", "https://app.example.evil", "https://app.example/path"]) expect(() => passkeyOrigin(origin)).toThrow();
  });
  it("rejects expired, mismatched-user, wrong-origin and wrong-purpose challenges without claiming them", async () => {
    for (const delta of [{ expiresAt: new Date(0) }, { userId: "another" }, { origin: "https://evil.example" }, { purpose: "register" }]) {
      mocks.prisma.passkeyChallenge.findUnique.mockResolvedValue({ ...challenge, ...delta });
      await expect(claimChallenge("once", "login", challenge.origin)).rejects.toThrow();
    }
    expect(mocks.prisma.passkeyChallenge.deleteMany).not.toHaveBeenCalled();
  });
  it("rejects a replay or parallel claim", async () => {
    mocks.prisma.passkeyChallenge.deleteMany.mockResolvedValue({ count: 0 });
    await expect(claimChallenge("once", "login", challenge.origin)).rejects.toThrow();
  });
  it("requires the current password before offering enrollment", async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({ id: "owner", passwordHash: "hash" });
    mocks.password.mockResolvedValue(false);
    await expect(registrationOptions("owner", "wrong", challenge.origin)).rejects.toThrow("password");
    expect(mocks.generateRegistration).not.toHaveBeenCalled();
  });
  it("requires discoverable login with user verification and never enumerates accounts", async () => {
    mocks.generateAuthentication.mockResolvedValue({ challenge: "random" });
    await authenticationOptions(true, challenge.origin);
    expect(mocks.generateAuthentication).toHaveBeenCalledWith(expect.objectContaining({ userVerification: "required", rpID: "app.example" }));
    expect(mocks.prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it("rejects credentials belonging to another RP or a mismatched account handle", async () => {
    for (const delta of [{ rpId: "other.example" }, { userId: "another" }]) {
      mocks.prisma.passkey.findUnique.mockResolvedValue({ id: "key", userId: "owner", rpId: "app.example", ...delta });
      await expect(finishAuthentication("once", response, {}, challenge.origin)).rejects.toThrow();
    }
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.verifyAuthentication).not.toHaveBeenCalled();
  });
  it("requires cryptographic verification before issuing a session", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue({ id: "key", userId: "owner", rpId: "app.example", publicKey: Buffer.from("public"), counter: 1n, transports: ["internal"] });
    mocks.verifyAuthentication.mockResolvedValue({ verified: false });
    await expect(finishAuthentication("once", response, {}, challenge.origin)).rejects.toThrow();
    expect(mocks.login).not.toHaveBeenCalled();
    mocks.verifyAuthentication.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 2 } });
    await finishAuthentication("once", response, {}, challenge.origin);
    expect(mocks.verifyAuthentication).toHaveBeenCalledWith(expect.objectContaining({ requireUserVerification: true, expectedChallenge: "random", expectedOrigin: challenge.origin, expectedRPID: "app.example" }));
    expect(mocks.login).toHaveBeenCalledWith("owner", false, {}, { id: "key", counter: 1n, newCounter: 2 });
  });
  it("does not enroll a passkey inside a cross-origin frame", async () => {
    mocks.prisma.passkeyChallenge.findUnique.mockResolvedValue({ ...challenge, purpose: "register", userId: "owner" });
    const registration = { ...response, response: { clientDataJSON: Buffer.from(JSON.stringify({ crossOrigin: true })).toString("base64url"), attestationObject: "data" } };
    await expect(finishRegistration("owner", "once", registration, "device", challenge.origin)).rejects.toThrow();
    expect(mocks.verifyRegistration).not.toHaveBeenCalled();
  });
});
