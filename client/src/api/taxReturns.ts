import { api } from "@/lib/api";
import { createResourceApi } from "@/api/createResourceApi";
import type { Paginated, TaxReturn, TaxReturnKind, TaxReturnStatus } from "@/types/models";

export interface TaxReturnInput {
  kind: TaxReturnKind;
  branchId?: string | null;
  branchIds?: string[];
  year: number;
  quarter?: number | null;
  dueDate: string;
  status: TaxReturnStatus;
  salesStandard?: number;
  salesZero?: number;
  salesExports?: number;
  salesExempt?: number;
  purchasesStandard?: number;
  purchasesImports?: number;
  purchasesZero?: number;
  purchasesExempt?: number;
  outputVat?: number;
  inputVat?: number;
  corrections?: number;
  zakatBase?: number | null;
  amount?: number;
  penalty?: number;
  filedDate?: string | null;
  reference?: string | null;
  ownerName?: string | null;
  sadadNumber?: string | null;
  fileId?: string | null;
  notes?: string | null;
}

export interface QuarterStats {
  quarter: number;
  nameAr: string;
  nameEn: string;
  dueDate: string;
  daysRemaining: number;
  hasRecord: boolean;
  recordId: string | null;
  status: string;
  salesStandard: number;
  purchasesStandard: number;
  totalSales: number;
  totalPurchases: number;
  outputVat: number;
  inputVat: number;
  netVat: number;
  sadadNumber: string | null;
  reference: string | null;
}

export interface TaxReturnsStatsResponse {
  year: number;
  kpis: {
    vatTotalSales: number;
    vatTotalPurchases: number;
    vatTotalOutput: number;
    vatTotalInput: number;
    vatTotalNet: number;
    zakatTotalBase: number;
    zakatTotalAmount: number;
    paidCount: number;
    filedCount: number;
    draftCount: number;
    totalReturns: number;
  };
  quarters: QuarterStats[];
  quarterlyVatAlert: {
    quarter: number;
    nameAr: string;
    nameEn: string;
    year: number;
    dueDate: string;
    daysRemaining: number;
    status: string;
    isUrgent: boolean;
    isOverdue: boolean;
  };
  zakatAlert: {
    year: number;
    dueDate: string;
    daysRemaining: number;
    hasRecord: boolean;
    recordId: string | null;
    status: string;
    zakatBase: number;
    amount: number;
    sadadNumber: string | null;
    reference: string | null;
    isUrgent: boolean;
    isOverdue: boolean;
  };
  recentReturns: TaxReturn[];
}

const baseApi = createResourceApi<TaxReturn, TaxReturnInput>("/tax-returns");

export const taxReturnsApi = {
  ...baseApi,
  getStatsAndAlerts: async (params: { year?: number; branchId?: string } = {}) => {
    const res = await api.get<TaxReturnsStatsResponse>("/tax-returns/stats-alerts", { params });
    return res.data;
  },
  list: async (params: Record<string, unknown> = {}) => {
    const res = await api.get<Paginated<TaxReturn>>("/tax-returns", { params });
    return res.data;
  },
};
