import { afterEach, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { installAuthCacheIsolation } from "../src/lib/auth-query-cache";
import { useAuthStore, type AuthUser } from "../src/stores/authStore";

afterEach(() => useAuthStore.getState().clearAuth());
const user = (id: string): AuthUser => ({ id, fullName: id, email: `${id}@example.com`, roles: [], permissions: [], isSuperAdmin: false });

it("removes private cached results when the account changes or signs out", () => {
  const client = new QueryClient();
  const stop = installAuthCacheIsolation(client);
  useAuthStore.getState().setAuth("first-token", user("first"));
  client.setQueryData(["payments"], [{ amount: 500 }]);
  useAuthStore.getState().setAuth("second-token", user("second"));
  expect(client.getQueryData(["payments"])).toBeUndefined();
  client.setQueryData(["employees"], [{ fullName: "Private" }]);
  useAuthStore.getState().clearAuth();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  stop();
});

it("retains cached results when the same account refreshes its token", () => {
  const client = new QueryClient();
  const stop = installAuthCacheIsolation(client);
  useAuthStore.getState().setAuth("old-token", user("first"));
  client.setQueryData(["dashboard"], { count: 10 });
  useAuthStore.getState().setAuth("new-token", user("first"));
  expect(client.getQueryData(["dashboard"])).toEqual({ count: 10 });
  stop();
});
