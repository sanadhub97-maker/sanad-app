import { describe, expect, it } from "vitest";
import { databaseTarget } from "@/lib/databaseTarget";
describe("Database transport and schema targeting", () => {
  it.each(["disable", "require", "verify-ca"])("requires verified TLS in production despite %s", sslmode => {
    const target = databaseTarget(`postgresql://fixture:synthetic@db.example/test?sslmode=${sslmode}&uselibpqcompat=true`, true);
    const url = new URL(target.connectionString);
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
    expect(url.searchParams.has("uselibpqcompat")).toBe(false);
  });
  it("targets raw SQL and generated SQL at the same isolated schema", () => {
    const target = databaseTarget("postgresql://fixture:synthetic@db.example/test?schema=sanad_test_0123456789abcdef", false);
    expect(target.schema).toBe("sanad_test_0123456789abcdef");
    expect(new URL(target.connectionString).searchParams.get("options")).toBe("-c search_path=sanad_test_0123456789abcdef");
  });
  it("keeps the default production schema unchanged", () => expect(databaseTarget("postgresql://fixture:synthetic@db.example/test", true).schema).toBe("public"));
  it("rejects a schema that could alter connection options", () => expect(() => databaseTarget("postgresql://fixture:synthetic@db.example/test?schema=public%2Cother", false)).toThrow("schema"));
});
