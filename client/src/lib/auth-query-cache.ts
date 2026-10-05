import type { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

export function installAuthCacheIsolation(client: QueryClient) {
  return useAuthStore.subscribe((next, previous) => {
    if (next.user?.id !== previous.user?.id) client.clear();
  });
}
