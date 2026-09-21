import { api } from "@/lib/api";

export interface SearchResultItem {
  type: "employee" | "companyDocument" | "payment" | "branch";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function globalSearch(q: string) {
  const res = await api.get<{ data: SearchResultItem[] }>("/search", { params: { q } });
  return res.data.data;
}
