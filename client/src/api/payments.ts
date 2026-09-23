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
// The categories offered in the payment form, in display order (labels in
// i18n paymentCategories.*). Older categories still exist in the database for
// past records but aren't offered for new payments.
export const PAYMENT_CATEGORIES = [
  "COMMERCIAL_REGISTRATION",
  "MUNICIPAL_LICENSE",
  "CLEANING",
  "RENT",
  "TOBACCO_LICENSE",
  "PERMIT_24H",
  "IQAMA",
  "VISA",
  "SPONSORSHIP_TRANSFER",
  "PROFESSION_CHANGE",
] as const;

/** Sub-types a category requires (labels in i18n paymentSubtypes.*). Keep in
 * sync with PAYMENT_SUBTYPES in server/src/constants/paymentCategories.ts. */
export const PAYMENT_SUBTYPES: Record<string, readonly string[]> = {
  IQAMA: ["ISSUE", "RENEWAL"],
  COMMERCIAL_REGISTRATION: ["ISSUE", "RENEWAL"],
  MUNICIPAL_LICENSE: ["ISSUE", "RENEWAL", "CANCELLATION", "AMENDMENT"],
  VISA: ["EXIT_REENTRY", "FINAL_EXIT", "WORK_VISA"],
};
