import { api } from "@/lib/api";
import type { Role } from "@/types/models";

export interface PermissionCatalogueEntry {
  module: string;
  permissions: { key: string; action: string }[];
}

export interface RoleInput {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export const rolesApi = {
  list: async () => {
    const res = await api.get<{ data: Role[] }>("/roles");
    return res.data.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ data: Role }>(`/roles/${id}`);
    return res.data.data;
  },
  permissionsCatalogue: async () => {
    const res = await api.get<{ data: PermissionCatalogueEntry[] }>("/roles/permissions");
    return res.data.data;
  },
  create: async (input: RoleInput) => {
    const res = await api.post<{ data: Role; message?: string }>("/roles", input);
    return res.data;
  },
  update: async (id: string, input: Partial<RoleInput>) => {
    const res = await api.put<{ data: Role; message?: string }>(`/roles/${id}`, input);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete<{ message?: string }>(`/roles/${id}`);
    return res.data;
  },
};
