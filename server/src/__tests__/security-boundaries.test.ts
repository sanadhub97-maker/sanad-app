import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";

const mock = vi.hoisted(() => ({
  session: { findFirst: vi.fn() }, user: { findFirst: vi.fn() }, file: { findUnique: vi.fn() },
  companySettings: { findUnique: vi.fn() }, employee: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mock }));
vi.mock("@/config/env", () => ({ env: {
  CLIENT_URL: "https://app.example", TRUSTED_ORIGINS: "https://trusted.example",
  JWT_ACCESS_SECRET: "synthetic-access-0123456789-abcdefghijklmnopqrstuvwxyz",
  JWT_ACCESS_EXPIRES_IN: "15m", JWT_REFRESH_EXPIRES_IN: "30d",
}, isProduction: true }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/services/settingsStore", () => ({ getExpirationRules: vi.fn(async () => ({ expiringSoonThresholdDays: 30, notifyDaysBefore: [7, 30] })), readSetting: vi.fn(async (_key: string, fallback: unknown) => fallback), writeSetting: vi.fn(async () => undefined) }));

import { signAccessToken, verifyAccessToken } from "@/lib/jwt";
import { authenticateAccessToken } from "@/middleware/auth";
import { trustedOrigin } from "@/middleware/security";
import { errorHandler } from "@/middleware/errorHandler";
import { assertBrandFile, assertFileAccess, isPublicBrandAsset } from "@/modules/files/files.access";
import { validateFileContent } from "@/modules/files/files.validation";
import { assertMetaApiUrl, assertPushEndpoint, canViewSource, notificationVisibility } from "@/lib/security";
import { allowedRenderUrl } from "@/services/pdf";
import { openToken, sealToken } from "@/services/pushCard";
import { validateWorkbookArchive } from "@/modules/importExport/archiveLimits";
import { resetPasswordSchema } from "@/modules/auth/auth.schemas";
import { getById as employeeProfile } from "@/modules/employees/employees.service";

beforeEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

describe("Authentication and request boundaries", () => {
  it("requires a session claim and rejects tokens with another audience or algorithm", () => {
    const token = signAccessToken({ sub: "user", sid: "session" });
    expect(verifyAccessToken(token)).toMatchObject({ sub: "user", sid: "session" });
    const secret = "synthetic-access-0123456789-abcdefghijklmnopqrstuvwxyz";
    for (const payload of [{ sub: "user" }, { sub: "user", sid: "session", aud: "other" }]) {
      expect(() => verifyAccessToken(jwt.sign(payload, secret, { issuer: "sanad-hr" }))).toThrow();
    }
    expect(() => verifyAccessToken(jwt.sign({ sub: "user", sid: "session" }, secret, { algorithm: "HS384", audience: "sanad-client", issuer: "sanad-hr" }))).toThrow();
  });
  it("denies a revoked session before loading user information", async () => {
    mock.session.findFirst.mockResolvedValue(null);
    await expect(authenticateAccessToken(signAccessToken({ sub: "user", sid: "revoked" }))).rejects.toThrow();
    expect(mock.user.findFirst).not.toHaveBeenCalled();
  });
  it("accepts a live session and uses current roles from the database", async () => {
    mock.session.findFirst.mockResolvedValue({ id: "live" });
    mock.user.findFirst.mockResolvedValue({ id: "user", isActive: true, userRoles: [] });
    expect(await authenticateAccessToken(signAccessToken({ sub: "user", sid: "live" }))).toMatchObject({ userId: "user", isSuperAdmin: false });
    expect(mock.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "live", userId: "user", revokedAt: null }) }));
  });
  it("denies untrusted origins and accepts the configured origin", async () => {
    const app = express().use(trustedOrigin).post("/api/edit", (_req, res) => res.sendStatus(204)).use(errorHandler);
    expect((await request(app).post("/api/edit").set("Origin", "https://evil.example")).status).toBe(403);
    expect((await request(app).post("/api/edit").set("Origin", "https://app.example")).status).toBe(204);
    expect((await request(app).post("/api/edit").set("Sec-Fetch-Site", "cross-site")).status).toBe(403);
  });
  it("requires strong new passwords without silent bcrypt byte truncation", () => {
    const accepts = (password: string) => resetPasswordSchema.safeParse({ token: "synthetic", password }).success;
    expect(accepts("StrongPass123456")).toBe(true);
    expect(accepts("Short123")).toBe(false);
    expect(accepts("Ab1" + "ع".repeat(40))).toBe(false);
  });
});

describe("Files and outbound network boundaries", () => {
  it("exposes only configured branding images with the correct module", async () => {
    mock.companySettings.findUnique.mockResolvedValue({ logoFileId: "logo", logoDarkFileId: null, printLogoFileId: null, faviconFileId: null });
    expect(await isPublicBrandAsset({ id: "logo", mimeType: "image/png", module: "company-logo" })).toBe(true);
    expect(await isPublicBrandAsset({ id: "private", mimeType: "image/png", module: "company-logo" })).toBe(false);
    expect(await isPublicBrandAsset({ id: "logo", mimeType: "image/png", module: "employee" })).toBe(false);
  });
  it("limits linked payments and documents in an employee profile", async () => {
    mock.employee.findFirst.mockImplementation(async ({ include }: any) => ({
      id: "employee", documents: include.documents.where.id ? [] : [{ id: "document", expiryDate: null }],
      payments: include.payments.where.id ? [] : [{ id: "payment" }],
    }));
    const auth = { userId: "user", isSuperAdmin: false, permissions: new Set(["employees.view"]) } as any;
    const limited = await employeeProfile("employee", auth);
    expect(limited.documents).toEqual([]); expect(limited.payments).toEqual([]);
    auth.permissions.add("employeeDocuments.view"); auth.permissions.add("payments.view");
    const permitted = await employeeProfile("employee", auth);
    expect(permitted.documents).toHaveLength(1); expect(permitted.payments).toHaveLength(1);
  });
  it("rechecks source permissions when listing historical notifications", () => {
    const auth = { userId: "user", isSuperAdmin: false, permissions: new Set(["employees.view"]) } as any;
    expect(canViewSource(auth, "EMPLOYEE_IQAMA")).toBe(true);
    expect(canViewSource(auth, "EMPLOYEE_DOCUMENT")).toBe(false);
    expect(canViewSource(auth, "PAYMENT")).toBe(false);
    expect(notificationVisibility(auth)).toEqual({ OR: [{ relatedType: null }, { relatedType: { notIn: expect.arrayContaining(["PAYMENT", "EMPLOYEE_DOCUMENT", "COMPANY_DOCUMENT"]) } }] });
  });
  it("cannot link an employee attachment as a public logo", async () => {
    mock.file.findUnique.mockResolvedValue({ module: "employee", mimeType: "image/png" });
    await expect(assertBrandFile("private", ["company-logo"])).rejects.toThrow();
    mock.file.findUnique.mockResolvedValue({ module: "company-logo", mimeType: "image/png" });
    await expect(assertBrandFile("logo", ["company-logo"])).resolves.toBeUndefined();
  });
  it("requires document download permission in addition to view permission", () => {
    const auth = { userId: "user", isSuperAdmin: false, permissions: new Set(["companyDocuments.view"]) } as any;
    const file = { module: "company-document", uploadedById: "other", relatedId: null };
    expect(() => assertFileAccess(file, auth, "download")).toThrow();
    auth.permissions.add("companyDocuments.download");
    expect(() => assertFileAccess(file, auth, "download")).not.toThrow();
  });
  it("rejects an HTML payload labelled as a PDF", async () => {
    await expect(validateFileContent(Buffer.from("<script>alert(1)</script>"), "application/pdf", "file.pdf")).rejects.toThrow();
    await expect(validateFileContent(Buffer.from("%PDF-1.7\n%%EOF"), "application/pdf", "file.pdf")).resolves.toBeUndefined();
  });
  it("denies private, deceptive, and credential-bearing provider URLs", () => {
    for (const url of ["http://127.0.0.1/x", "https://graph.facebook.com.evil.example/v25.0", "https://user@graph.facebook.com/v25.0", "https://graph.facebook.com:444/v25.0"]) expect(() => assertMetaApiUrl(url)).toThrow();
    expect(() => assertMetaApiUrl("https://graph.facebook.com/v25.0")).not.toThrow();
    expect(() => assertPushEndpoint("https://fcm.googleapis.com.evil.example/push")).toThrow();
    expect(() => assertPushEndpoint("https://fcm.googleapis.com/fcm/send/synthetic")).not.toThrow();
  });
  it("blocks file, metadata, arbitrary HTTPS and active data URLs in Chromium", () => {
    for (const url of ["file:///etc/passwd", "http://169.254.169.254/latest/meta-data", "https://evil.example/file", "data:text/html,<script>1</script>", "data:image/svg+xml,<svg/>"]) expect(allowedRenderUrl(url)).toBe(false);
    expect(allowedRenderUrl("https://fonts.googleapis.com/css2?family=Cairo")).toBe(true);
    expect(allowedRenderUrl("data:image/png;base64,aGVsbG8=")).toBe(true);
  });
  it("encrypts push capabilities, rejects tampering and expires them", () => {
    const value = { user: "synthetic-private-user", document: "confidential" };
    const token = sealToken(value);
    expect(Buffer.from(token.slice(3), "base64url").toString()).not.toContain(value.user);
    expect(openToken(token)).toEqual(value);
    const altered = Buffer.from(token.slice(3), "base64url"); altered[altered.length - 1] ^= 1;
    expect(openToken(`v2.${altered.toString("base64url")}`)).toBeNull();
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 8 * 86400_000);
    expect(openToken(token)).toBeNull();
    vi.useRealTimers();
  });
  it("accepts normal Excel archives and rejects excessive compressed content", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees"); sheet.addRow(["Employee number", "Full name Arabic"]); sheet.addRow(["1", "Example"]);
    await expect(validateWorkbookArchive(Buffer.from(await workbook.xlsx.writeBuffer()))).resolves.toBeUndefined();
    sheet.addRow(["A".repeat(1_500_000)]);
    await expect(validateWorkbookArchive(Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toThrow();
    await expect(validateWorkbookArchive(Buffer.from("not a zip"))).rejects.toThrow();
  });
});
