import { api } from "@/lib/api";
import { createResourceApi } from "@/api/createResourceApi";
import type { Paginated, Payment } from "@/types/models";

export interface PaymentInput {
  paymentNumber?: string;
  paymentDate: string;
  type?: string;
  category: string;
  description?: string;
  amount: number;
  vat: number;
  method: string;
  paidBy?: string;
  branchId?: string;
  employeeId?: string;
  supplierName?: string;
  referenceNumber?: string;
  fileId?: string;
  notes?: string;
}

export interface PaymentsSummary {
  totalAmount: number;
  totalVat: number;
  grandTotal: number;
}

const basePaymentsApi = createResourceApi<Payment, PaymentInput>("/payments");

export const paymentsApi = {
  ...basePaymentsApi,
  list: async (params: Record<string, unknown> = {}) => {
    const res = await api.get<Paginated<Payment> & { summary: PaymentsSummary }>("/payments", { params });
    return res.data;
  },
};

export function paymentReceiptUrl(id: string) {
  return `/payments/${id}/receipt.pdf`;
}

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"] as const;
export const PAYMENT_CATEGORIES = [
  "GOVERNMENT_FEES",
  "EMPLOYEE_DOCUMENTS",
  "LICENSES",
  "INSURANCE",
  "RENT",
  "CLEANING",
  "CIVIL_DEFENSE",
  "MUNICIPALITY",
  "VISA",
  "IQAMA",
  "PASSPORT",
  "MEDICAL",
  "OTHER",
] as const;
