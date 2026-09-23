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
// Grouped as they appear in the payment form; labels live in i18n
// (paymentCategories.*, paymentCategoryGroups.*).
export const PAYMENT_CATEGORY_GROUPS = [
  {
    key: "commercial",
    categories: [
      "COMMERCIAL_REGISTRATION_ISSUE",
      "COMMERCIAL_REGISTRATION_RENEWAL",
      "COMMERCIAL_REGISTRATION_AMENDMENT",
      "COMMERCIAL_REGISTRATION_CANCELLATION",
      "MUNICIPAL_LICENSE_ISSUE",
      "MUNICIPAL_LICENSE_RENEWAL",
      "MUNICIPAL_LICENSE_AMENDMENT",
      "MUNICIPAL_LICENSE_CANCELLATION",
      "CHAMBER_OF_COMMERCE",
      "CIVIL_DEFENSE",
      "MUNICIPALITY",
      "LICENSES",
    ],
  },
  {
    key: "residency",
    categories: [
      "IQAMA_ISSUE",
      "IQAMA_RENEWAL",
      "WORK_PERMIT",
      "EXPAT_LEVY",
      "DEPENDENTS_FEE",
      "PROFESSION_CHANGE",
      "SPONSORSHIP_TRANSFER",
      "WORK_VISA",
      "EXIT_REENTRY_VISA",
      "FINAL_EXIT_VISA",
      "IQAMA",
      "VISA",
      "PASSPORT",
    ],
  },
  {
    key: "government",
    categories: ["GOSI", "MEDICAL_INSURANCE", "ZAKAT_TAX", "GOVERNMENT_FINES", "GOVERNMENT_FEES", "EMPLOYEE_DOCUMENTS"],
  },
  {
    key: "operational",
    categories: ["RENT", "CLEANING", "INSURANCE", "MEDICAL", "OTHER"],
  },
] as const;

export const PAYMENT_CATEGORIES = PAYMENT_CATEGORY_GROUPS.flatMap((g) => g.categories);
