import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit, FileDown, Plus, Printer, Trash2, Wallet, Receipt, Percent, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppleIcon } from "@/components/common/apple-icon";
import { paymentsApi, paymentReceiptUrl, PAYMENT_SUBTYPES } from "@/api/payments";
import { reportsApi } from "@/api/reports";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { PaymentDialog } from "@/pages/payments/payment-dialog";
import type { Payment } from "@/types/models";

const columnHelper = createColumnHelper<Payment>();

export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; payment?: Payment }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["payments", { page, search }],
    queryFn: () => paymentsApi.list({ page, pageSize, q: search || undefined }),
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await paymentsApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns = [
    columnHelper.accessor("paymentNumber", {
      header: t("payments.table.paymentNumber"),
      cell: (c) => (
        <span className="inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border/60">
          {c.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("paymentDate", {
      header: t("payments.table.date"),
      cell: (c) => <span className="font-mono text-xs text-foreground">{formatDate(c.getValue())}</span>,
    }),
    columnHelper.accessor("category", {
      header: t("payments.table.category"),
      cell: (c) => {
        const { type, employee } = c.row.original;
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-block rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border/60">
              {t(`paymentCategories.${c.getValue()}`)}
              {type && PAYMENT_SUBTYPES[c.getValue()]?.includes(type) ? ` — ${t(`paymentSubtypes.${type}`)}` : ""}
            </span>
            {employee && (
              <span className="text-[11px] text-muted-foreground">
                <bdi>{isAr ? employee.fullNameAr : employee.fullNameEn || employee.fullNameAr}</bdi>
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.branch?.name, {
      id: "branch",
      header: t("payments.table.branch"),
      cell: (c) => <span className="text-xs font-medium text-muted-foreground">{c.getValue() ?? "—"}</span>,
    }),
    columnHelper.accessor("total", {
      header: t("payments.table.total"),
      cell: (c) => (
        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
          {formatCurrency(c.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            title={t("common.print")}
            onClick={() => openPdfInNewTab(paymentReceiptUrl(c.row.original.id))}
          >
            <Printer className="h-4 w-4" />
          </Button>
          {hasPermission("payments.edit") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => setDialog({ open: true, payment: c.row.original })}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission("payments.delete") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteTarget(c.row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("payments.title")}
        description={t("payments.subtitle")}
        actions={
          hasPermission("payments.create") && (
            <Button onClick={() => setDialog({ open: true })} className="h-10 rounded-xl font-bold bg-primary shadow-sm gap-2">
              <Plus className="h-4 w-4" /> {t("payments.addPayment")}
            </Button>
          )
        }
      />

      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-5 shadow-luxury backdrop-blur-md specular-border card-luxury-hover">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-muted-foreground/90">{t("payments.subtotal")}</p>
              <AppleIcon icon={Receipt} tone="blue" size="xs" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono tracking-tight">
              {formatCurrency(data.summary.totalAmount)}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-5 shadow-luxury backdrop-blur-md specular-border card-luxury-hover">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-muted-foreground/90">{t("payments.vat")}</p>
              <AppleIcon icon={Percent} tone="amber" size="xs" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono tracking-tight">
              {formatCurrency(data.summary.totalVat)}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-tr from-emerald-500/10 via-card to-card p-5 shadow-luxury backdrop-blur-md specular-border card-luxury-hover">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t("payments.grandTotal")}</p>
              <AppleIcon icon={CheckCircle2} tone="emerald" size="xs" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {formatCurrency(data.summary.grandTotal)}
            </p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        emptyTitle={t("payments.emptyTitle")}
        emptyAction={
          hasPermission("payments.create") ? (
            <Button size="sm" onClick={() => setDialog({ open: true })}>
              <Wallet className="h-4 w-4" /> {t("payments.addPayment")}
            </Button>
          ) : undefined
        }
        toolbar={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-2xl border-border/80 bg-background/80 font-semibold text-xs gap-1.5 shadow-xs">
                <FileDown className="h-4 w-4" /> {t("common.export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-luxury border-border/80 bg-background/95 backdrop-blur-xl">
              <DropdownMenuItem onSelect={() => reportsApi.payments.export({}, "xlsx")} className="rounded-xl text-xs font-semibold cursor-pointer">
                {t("employees.export.excel")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => reportsApi.payments.export({}, "csv")} className="rounded-xl text-xs font-semibold cursor-pointer">
                {t("employees.export.csv")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => reportsApi.payments.export({}, "pdf")} className="rounded-xl text-xs font-semibold cursor-pointer">
                {t("employees.export.pdf")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <PaymentDialog open={dialog.open} payment={dialog.payment} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("payments.deleteConfirmTitle")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
