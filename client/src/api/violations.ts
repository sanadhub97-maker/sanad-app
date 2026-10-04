import { api } from "@/lib/api";

export type ViolationKind = "AUTHORITY" | "STAFF";
export type ViolationStatus = "NEW" | "OBJECTION" | "ACCEPTED" | "REJECTED" | "PAID" | "OPEN" | "APPLIED";
/** The status as shown: an unpaid one past its payment deadline is OVERDUE. */
export type ViolationState = ViolationStatus | "OVERDUE";
export type PayMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "ONLINE" | "OTHER";

export interface Violation {
  id: string;
  kind: ViolationKind;
  authority: string | null;
  authorityName: string | null;
  authorityLabel: string | null;
  number: string | null;
  /** YYYY-MM-DD */
  date: string;
  reason: string;
  penalty: string | null;
  amount: number;
  payDeadline: string | null;
  objectionDeadline: string | null;
  status: ViolationStatus;
  state: ViolationState;
  open: boolean;
  daysToPay: number | null;
  daysToObject: number | null;
  relatedType: string | null;
  relatedId: string | null;
  relatedLabel: string | null;
  notes: string | null;
  branch: { id: string; name: string; nameEn?: string | null } | null;
  employee: { id: string; fullNameAr: string; fullNameEn: string | null; employeeNumber: string } | null;
  payment: { id: string; paymentNumber: string; paymentDate: string; total: number } | null;
  file: { id: string; originalName: string; mimeType: string; size: number } | null;
  assignee: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface ViolationEvent {
  id: string;
  type: "created" | "objection" | "accepted" | "rejected" | "paid" | "applied" | "edited";
  date: string;
  note: string | null;
  user: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface ViolationStats {
  open: number;
  overdue: number;
  unpaidAmount: number;
  dueSoon: number;
  paidAmount: number;
  paidCount: number;
  staffOpen: number;
  authorityTotal: number;
  staffTotal: number;
}

export interface ViolationInput {
  kind?: ViolationKind;
  authority?: string;
  authorityName?: string;
  number?: string;
  date?: string;
  branchId?: string;
  employeeId?: string;
  reason?: string;
  penalty?: string;
  amount?: number;
  payDeadline?: string | null;
  objectionDeadline?: string | null;
  relatedType?: string;
  relatedId?: string;
  relatedLabel?: string;
  fileId?: string;
  assigneeId?: string;
  notes?: string;
}

export interface RelatedOption {
  type: string;
  id: string;
  label: string;
  expiry: string | null;
  expired: boolean;
}

export interface ViolationQuery {
  kind?: ViolationKind;
  state?: "all" | "open" | "overdue" | "objection" | "done";
  authority?: string;
  branchId?: string;
  employeeId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

const one = (r: { data: { data: Violation & { events: ViolationEvent[] } } }) => r.data.data;

export const violationsApi = {
  list: async (params: ViolationQuery) =>
    (await api.get<{ data: Violation[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }>("/violations", { params })).data,
  stats: async () => (await api.get<{ data: ViolationStats }>("/violations/stats")).data.data,
  get: async (id: string) => one(await api.get(`/violations/${id}`)),
  create: async (input: ViolationInput) => one(await api.post("/violations", input)),
  update: async (id: string, input: ViolationInput) => one(await api.patch(`/violations/${id}`, input)),
  remove: async (id: string) => api.delete(`/violations/${id}`),
  pay: async (id: string, input: { date: string; method: PayMethod; referenceNumber?: string; paidBy?: string; fileId?: string }) => one(await api.post(`/violations/${id}/pay`, input)),
  objection: async (id: string, input: { date: string; reference?: string; note?: string }) => one(await api.post(`/violations/${id}/objection`, input)),
  objectionResult: async (id: string, input: { accepted: boolean; date: string; note?: string }) => one(await api.post(`/violations/${id}/objection-result`, input)),
  apply: async (id: string, input: { date: string; note?: string }) => one(await api.post(`/violations/${id}/apply`, input)),
  related: async (params: { employeeId?: string; branchId?: string }) => (await api.get<{ data: RelatedOption[] }>("/violations/related-options", { params })).data.data,
};
