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

const baseBranchesApi = createResourceApi<Branch, BranchInput>("/branches");

export const branchesApi = {
  ...baseBranchesApi,
  getNextCode: async () => {
    const res = await api.get<{ data: { nextCode: string } }>("/branches/next-code");
    return res.data.data.nextCode;
  },
};

export async function listActiveBranches() {
  const res = await api.get<{ data: { id: string; name: string; nameEn?: string | null; code: string }[] }>("/branches/active");
  return res.data.data;
}
