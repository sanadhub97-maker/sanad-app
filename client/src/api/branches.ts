import { api } from "@/lib/api";
import { createResourceApi } from "@/api/createResourceApi";
import type { Branch } from "@/types/models";

export interface BranchInput {
  name: string;
  code: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  managerId?: string;
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
}

export const branchesApi = createResourceApi<Branch, BranchInput>("/branches");

export async function listActiveBranches() {
  const res = await api.get<{ data: { id: string; name: string; code: string }[] }>("/branches/active");
  return res.data.data;
}
