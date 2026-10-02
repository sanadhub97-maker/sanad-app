import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const mock = vi.hoisted(() => ({
  user: { findFirst: vi.fn() }, session: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  employee: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() }, branch: { findFirst: vi.fn() },
  documentRevision: { create: vi.fn(), findFirst: vi.fn() }, file: { findUnique: vi.fn() }, auditLog: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mock }));
vi.mock("@/config/env", () => ({ env: { SETTINGS_ENCRYPTION_KEY: "synthetic-backup-secret-0123456789", CLIENT_URL: "https://app.example" } }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/storage", () => ({ storage: {}, validateStoredName: (name: string) => { if (!/^[a-z0-9._-]+$/i.test(name)) throw new Error("Invalid storage key"); return name; } }));
vi.mock("@/lib/jwt", () => ({ verifyAccessToken: () => ({ sub: "owner", sid: "current" }) }));
vi.mock("@/lib/password", () => ({ comparePassword: vi.fn(async () => false) }));
import { sealBackup, openBackup, modelOrder, backupModels, encodeRows, decodeRows } from "@/modules/maintenance/backup-format";
import { confirmBackupPassword, validateManifest } from "@/modules/maintenance/backups.service";
import { revokeSessions, listSessions } from "@/modules/maintenance/sessions.service";
import { assertTrashPermission, restoreTrash } from "@/modules/maintenance/trash.service";
import { updateTrackedDocument } from "@/modules/maintenance/revisions.service";
import { remove as removeFile } from "@/modules/files/files.service";
const auth: any = { userId: "owner", fullName: "Test Admin", isSuperAdmin: true, permissions: new Set(), roles: ["Super Admin"] };
beforeEach(() => { vi.resetAllMocks(); mock.$transaction.mockImplementation(async (fn: any) => fn(mock)); });
describe("Encrypted backups", () => {
  it("retains attachments referenced by earlier document versions", async () => {
    mock.file.findUnique.mockResolvedValue({ id: "file", storedName: "sample.bin" });
    mock.documentRevision.findFirst.mockResolvedValue({ id: "revision" });
    await expect(removeFile("file")).rejects.toThrow("retained in document history");
    expect(mock.documentRevision.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: expect.arrayContaining([{ before: { path: ["iqamaFileId"], equals: "file" } }, { after: { path: ["passportFileId"], equals: "file" } }]) } }));
  });
  it("round-trips bytes with randomized authenticated encryption", () => {
    const data = Buffer.from("Synthetic private backup"); const first = sealBackup(data), second = sealBackup(data);
    expect(first.equals(second)).toBe(false); expect(first.includes(data)).toBe(false); expect(openBackup(first)).toEqual(data);
  });
  it("rejects corruption, truncated files and an altered encryption salt", () => {
    const bytes = sealBackup(Buffer.from("synthetic"));
    for (const position of [10, 45, 60, bytes.length - 1]) { const changed = Buffer.from(bytes); changed[position] ^= 1; expect(() => openBackup(changed)).toThrow(); }
    expect(() => openBackup(bytes.subarray(0, 30))).toThrow();
  });
  it("restores parent models before dependent models", () => {
    const ordered = modelOrder().map(m => m.name);
    for (const model of backupModels) for (const field of model.fields) if (field.kind === "object" && field.relationFromFields.length && field.type !== model.name && ordered.includes(field.type)) expect(ordered.indexOf(field.type)).toBeLessThan(ordered.indexOf(model.name));
    expect(ordered.indexOf("User")).toBeLessThan(ordered.indexOf("File"));
  });
  it("preserves required JSON null, date values, binary keys and bigint counters", () => {
    const date = new Date("2026-01-01");
    const encoded = encodeRows("Setting", [{ key: "sample", value: null, updatedAt: date }]);
    expect(decodeRows("Setting", encoded)[0]).toMatchObject({ value: Prisma.JsonNull, updatedAt: date });
    const row = { id: "key", userId: "owner", rpId: "app.example", publicKey: Buffer.from("public-key"), counter: 4294967295n, transports: ["internal"], name: "device", createdAt: date, lastUsedAt: null };
    expect(decodeRows("Passkey", encodeRows("Passkey", [row]))[0]).toEqual(row);
  });
  it("rejects incompatible schemas, unknown columns and missing required fields", () => {
    expect(() => validateManifest({ format: 1, schema: "other" })).toThrow();
    expect(() => decodeRows("Setting", [{ key: "sample", value: {}, updatedAt: new Date().toISOString(), unknown: true }])).toThrow();
    expect(() => decodeRows("Setting", [{ value: {}, updatedAt: new Date().toISOString() }])).toThrow();
  });
  it("requires a currently active super administrator and their current password", async () => {
    mock.user.findFirst.mockResolvedValue({ passwordHash: "hash", userRoles: [{ role: { name: "Manager" } }] });
    await expect(confirmBackupPassword("owner", "password")).rejects.toThrow();
    mock.user.findFirst.mockResolvedValue({ passwordHash: "hash", userRoles: [{ role: { name: "Super Admin" } }] });
    await expect(confirmBackupPassword("owner", "wrong")).rejects.toThrow();
  });
});
describe("Session management", () => {
  it("lists only the owner's active sessions and marks the current family", async () => {
    mock.session.findFirst.mockResolvedValue({ familyId: "current-family" }); mock.session.findMany.mockResolvedValue([{ familyId: "current-family" }, { familyId: "other" }]);
    expect(await listSessions("owner", "token")).toMatchObject([{ current: true }, { current: false }]);
    expect(mock.session.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", revokedAt: null }) }));
  });
  it("locks the owner and revokes every rotated successor while keeping the current family", async () => {
    mock.session.findFirst.mockResolvedValue({ familyId: "current-family" });
    await revokeSessions("owner", "token"); expect(mock.$queryRaw).toHaveBeenCalled();
    expect(mock.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner", revokedAt: null, familyId: { not: "current-family" } } }));
  });
  it("does not accept a token for another account", async () => { await expect(listSessions("another", "token")).rejects.toThrow(); expect(mock.session.findMany).not.toHaveBeenCalled(); });
});
describe("Recycle bin and document revisions", () => {
  it("requires view, delete and edit permissions, and restricts user-account restoration", () => {
    const limited = { ...auth, isSuperAdmin: false, permissions: new Set(["employees.view", "employees.delete"]) };
    expect(() => assertTrashPermission(limited, "employee")).not.toThrow(); expect(() => assertTrashPermission(limited, "employee", true)).toThrow(); expect(() => assertTrashPermission(limited, "user")).toThrow();
  });
  it("refuses restoring a record whose parent is still deleted", async () => {
    mock.employee.findFirst.mockResolvedValue({ id: "deleted", branchId: "gone" }); mock.branch.findFirst.mockResolvedValue(null);
    await expect(restoreTrash(auth, "employee", "deleted")).rejects.toThrow("parent"); expect(mock.employee.updateMany).not.toHaveBeenCalled();
  });
  it("does not overwrite another record's original identifier", async () => {
    mock.employee.findFirst.mockResolvedValueOnce({ id: "deleted", employeeNumber: "EMP-1__deleted_123" }).mockResolvedValueOnce({ id: "collision" });
    await expect(restoreTrash(auth, "employee", "deleted")).rejects.toThrow("original identifier"); expect(mock.employee.updateMany).not.toHaveBeenCalled();
  });
  it("keeps document values before and after an edit without copying unrelated employee fields", async () => {
    mock.employee.findFirst.mockResolvedValue({ id: "employee", fullNameAr: "Test Employee", iqamaExpiryDate: new Date("2027-01-01"), mobile: "private-number" });
    mock.employee.update.mockResolvedValue({ id: "employee", iqamaExpiryDate: new Date("2028-01-01"), mobile: "private-number" });
    await updateTrackedDocument("employee", "employee", { iqamaExpiryDate: new Date("2028-01-01") }, auth);
    const record = mock.documentRevision.create.mock.calls[0][0].data;
    expect(record).toMatchObject({ actorId: "owner", actorName: "Test Admin", before: { iqamaExpiryDate: "2027-01-01T00:00:00.000Z" }, after: { iqamaExpiryDate: "2028-01-01T00:00:00.000Z" } });
    expect(record.before.mobile).toBeUndefined(); expect(record.after.mobile).toBeUndefined();
  });
});
