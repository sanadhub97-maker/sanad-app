import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: { findFirst: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: mock }));
vi.mock("@/lib/jwt", () => ({ verifyAccessToken: vi.fn() }));
import { loadAuthContext } from "@/middleware/auth";
import { hasPermission } from "@/lib/security";
import { requirePermission } from "@/middleware/rbac";
beforeEach(() => vi.resetAllMocks());
function fixture(role: string, permissions: string[]) {
  return { id: "fixture", fullName: "Test", email: "test@example.invalid", isActive: true, userRoles: [{ role: { name: role, rolePermissions: permissions.map(key => ({ permission: { key } })) } }] };
}
describe("Administration and accounting finance policy", () => {
  it.each(["Manager", "HR", "Viewer", "Employee"])("removes financial access from %s even with broad legacy permissions", async role => {
    mock.user.findFirst.mockResolvedValue(fixture(role, ["*", "payments.view", "payments.export", "taxReturns.view", "violations.pay", "employees.view"]));
    const auth = await loadAuthContext("fixture"); expect(auth?.financeAccess).toBe(false); expect(auth?.permissions.has("payments.view")).toBe(false);
    expect(hasPermission(auth!, "payments.view")).toBe(false); expect(hasPermission(auth!, "employees.view")).toBe(true);
    expect(hasPermission(auth!, "taxReturns.view")).toBe(false); expect(hasPermission(auth!, "violations.pay")).toBe(false);
    expect(auth?.permissions.has("taxReturns.view")).toBe(false); expect(auth?.permissions.has("violations.pay")).toBe(false);
    const next = vi.fn(); requirePermission("payments.export")({ auth } as any, {} as any, next); expect(next.mock.calls[0][0]?.statusCode).toBe(403);
  });
  it.each(["Admin", "Accountant", "Super Admin"])("allows the financial permissions granted to %s", async role => {
    mock.user.findFirst.mockResolvedValue(fixture(role, ["payments.view"])); const auth = await loadAuthContext("fixture");
    expect(auth?.financeAccess).toBe(true); expect(hasPermission(auth!, "payments.view")).toBe(true);
  });
  it("does not grant an accountant unassigned editing permissions", async () => {
    mock.user.findFirst.mockResolvedValue(fixture("Accountant", ["payments.view"]));
    const auth = await loadAuthContext("fixture"); expect(hasPermission(auth!, "payments.edit")).toBe(false);
  });
});
