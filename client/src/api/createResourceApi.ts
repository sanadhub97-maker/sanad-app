import { api } from "@/lib/api";
import type { Paginated } from "@/types/models";

/** Factory for the repeated list/get/create/update/remove shape that every
 * CRUD module's REST API follows — keeps each resource's api/*.ts file to
 * just its types + this one call. */
export function createResourceApi<TEntity, TCreateInput, TUpdateInput = Partial<TCreateInput>>(basePath: string) {
  return {
    list: async (params: Record<string, unknown> = {}) => {
      const res = await api.get<Paginated<TEntity> & Record<string, unknown>>(basePath, { params });
      return res.data;
    },
    getById: async (id: string) => {
      const res = await api.get<{ data: TEntity }>(`${basePath}/${id}`);
      return res.data.data;
    },
    create: async (input: TCreateInput) => {
      const res = await api.post<{ data: TEntity; message?: string }>(basePath, input);
      return res.data;
    },
    update: async (id: string, input: TUpdateInput) => {
      const res = await api.put<{ data: TEntity; message?: string }>(`${basePath}/${id}`, input);
      return res.data;
    },
    remove: async (id: string) => {
      const res = await api.delete<{ message?: string }>(`${basePath}/${id}`);
      return res.data;
    },
  };
}
