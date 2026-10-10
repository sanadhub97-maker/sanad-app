import { api } from "@/lib/api";

export interface SearchResultItem {
  type: "employee" | "employeeDocument" | "companyDocument" | "payment" | "branch" | "task" | "vehicle" | "custody" | "clearance" | "violation";
  id: string;
  title: string;
  titleEn?: string | null;
  subtitle?: string;
  href: string;
}

export async function globalSearch(q: string) {
  const res = await api.get<{ data: SearchResultItem[] }>("/search", { params: { q } });
  return res.data.data;
}
