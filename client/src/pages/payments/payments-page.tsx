import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarDays, Edit, FileDown, MoreHorizontal, Plus, Printer, Receipt, Search, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dmy } from "@/components/royal/rp";
import { PxBadge, PxBars, PxCard, PxDonut, PxPager, PxStat, PxTabs } from "@/components/royal/px";
import { paymentsApi, paymentReceiptUrl, PAYMENT_SUBTYPES } from "@/api/payments";
import { dashboardApi } from "@/api/dashboard";
import { reportsApi } from "@/api/reports";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { PaymentDialog } from "@/pages/payments/payment-dialog";
import type { Payment } from "@/types/models";

/* Payments in the Royal design, as in the approved preview: the summary
   band, six months of spending, spending by category (which also filters),
   and the vouchers by day with each day's total. */

const CAT_COLORS = ["var(--lx)", "#7c3aed", "#0891b2", "#16a34a"];
const money = (n: number) => Math.round(n).toLocaleString("en-US");
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function useNarrow() {
  const [n] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(max-width: 599px)").matches);
  return Boolean(n);
}

export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  // Opened from a violation's voucher link: /payments?q=PAY-000123.
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; payment?: Payment }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const pageSize = 30;
  const narrow = useNarrow();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", { page, search, category }],
    queryFn: () => paymentsApi.list({ page, pageSize, q: search || undefined, category: category || undefined, sortBy: "paymentDate", sortDir: "desc" }),
  });
  const { data: charts } = useQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });

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

  // Six months, oldest first.
  const months = useMemo(() => {
    const byKey = new Map((charts?.monthlyPayments ?? []).map((m) => [String(m.month).slice(0, 7), Number(m.total) || 0]));
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: monthKey(d), label: d.toLocaleDateString(locale, { month: narrow ? "short" : "long" }), total: byKey.get(monthKey(d)) ?? 0 };
    });
  }, [charts, locale, narrow]);
  const thisMonth = months[5]?.total ?? 0;
  const lastMonth = months[4]?.total ?? 0;
  const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const cats = (charts?.paymentsByCategory ?? []).map((c) => ({ ...c, total: Number(c.total) || 0 })).sort((a, b) => b.total - a.total);
  const catSum = cats.reduce((a, c) => a + c.total, 0) || 1;


  const rows = data?.data ?? [];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const sar = isAr ? "ر.س" : "SAR";

  return (
    <div className="px">
      <PageHeader
        title={t("payments.title")}
        description={new Date().toLocaleDateString(locale, { month: "long", year: "numeric" })}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-3xl p-2">
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.payments.export({}, "xlsx")}>
                  {t("employees.export.excel")}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.payments.export({}, "csv")}>
                  {t("employees.export.csv")}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.payments.export({}, "pdf")}>
                  {t("employees.export.pdf")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission("payments.create") && (
              <Button onClick={() => setDialog({ open: true })}>
                <Plus className="h-4 w-4" /> {t("payments.addPayment")}
              </Button>
            )}
          </>
        }
      />

      <div className="px-stats">
        <PxStat
          i={1}
          label={isAr ? "هذا الشهر" : "This month"}
          value={Math.round(thisMonth)}
          unit={sar}
          icon={Wallet}
          color="#16a34a"
          chip={change === null ? undefined : { text: `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%`, tone: change >= 0 ? "up" : "dn" }}
          sub={change === null ? (isAr ? "هذا الشهر" : "This month") : isAr ? "عن الشهر الماضي" : "vs last month"}
          spark={months.map((m) => m.total)}
        />
        <PxStat i={2} label={isAr ? "الشهر الماضي" : "Last month"} value={Math.round(lastMonth)} unit={sar} icon={CalendarDays} color="#2563eb" sub={months[4]?.label} />
        <PxStat i={3} label={isAr ? "آخر 6 أشهر" : "Last 6 months"} value={Math.round(months.reduce((a, m) => a + m.total, 0))} unit={sar} icon={BarChart3} color="#7c3aed" sub={isAr ? `${data?.meta.total ?? 0} سند مسجّل` : `${data?.meta.total ?? 0} vouchers`} />
        <PxStat i={4} label={isAr ? "الضريبة" : "VAT"} value={Math.round(data?.summary?.totalVat ?? 0)} unit={sar} icon={Receipt} color="#d97706" sub={isAr ? "ضمن الإجمالي" : "Included in the total"} />
      </div>

      <div className="px-g2">
        <PxCard i={5} title={isAr ? "المدفوعات الشهرية" : "Monthly payments"} sub={isAr ? "بالريال السعودي" : "In Saudi riyals"}>
          <PxBars labels={months.map((m) => m.label)} values={months.map((m) => m.total)} unit={sar} />
        </PxCard>
        <PxCard i={6} title={isAr ? "حسب البند" : "By category"} sub={isAr ? "اضغط على بند من التبويبات تحت للتصفية" : "Filter with the tabs below"}>
          {cats.length === 0 ? (
            <div className="px-empty">{isAr ? "لا توجد مدفوعات بعد" : "No payments yet"}</div>
          ) : (
            <PxDonut
              center={`${Math.round(((cats[0]?.total ?? 0) / catSum) * 100)}%`}
              centerLabel={t(`paymentCategories.${cats[0]?.category}`, { defaultValue: cats[0]?.category })}
              parts={[
                ...cats.slice(0, 4).map((c, k) => ({ label: t(`paymentCategories.${c.category}`, { defaultValue: c.category }), value: Math.round(c.total), color: CAT_COLORS[k] })),
                ...(cats.length > 4 ? [{ label: isAr ? "أخرى" : "Other", value: Math.round(cats.slice(4).reduce((a, c) => a + c.total, 0)), color: "#94a3b8" }] : []),
              ]}
            />
          )}
        </PxCard>
      </div>

      <section className="px-card" style={{ ["--i" as string]: 7 }}>
        <div className="px-chd">
          <h3>{isAr ? "سندات الصرف" : "Vouchers"}</h3>
          <small>{isAr ? `${data?.meta.total ?? 0} سند · ${money(data?.summary?.grandTotal ?? 0)} ${sar}` : `${data?.meta.total ?? 0} vouchers · ${money(data?.summary?.grandTotal ?? 0)} ${sar}`}</small>
        </div>
        <div className="px-toolbar no-print">
          <PxTabs
            value={category}
            onChange={(k) => {
              setCategory(k);
              setPage(1);
            }}
            items={[{ key: "", label: isAr ? "كل البنود" : "All" }, ...cats.slice(0, 6).map((c) => ({ key: c.category, label: t(`paymentCategories.${c.category}`, { defaultValue: c.category }) }))]}
          />
          <span className="sp" />
          <label className="px-search">
            <Search />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isAr ? "رقم السند أو الوصف" : "Voucher number or description"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
        </div>
        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{isAr ? "رقم السند" : "Voucher"}</th>
                <th>{isAr ? "البند" : "Category"}</th>
                <th className="hm">{isAr ? "المؤسسة" : "Establishment"}</th>
                <th>{isAr ? "المبلغ" : "Amount"}</th>
                <th className="hm">{isAr ? "طريقة الدفع" : "Method"}</th>
                <th>{isAr ? "التاريخ" : "Date"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-9 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                    </td>
                  </tr>
                ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="px-empty">
                      <b>{t("payments.emptyTitle")}</b>
                      {hasPermission("payments.create") && (
                        <div className="mt-3">
                          <Button onClick={() => setDialog({ open: true })}>
                            <Plus className="h-4 w-4" /> {t("payments.addPayment")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((p, j) => {
                  const sub = p.type && PAYMENT_SUBTYPES[p.category]?.includes(p.type) ? ` — ${t(`paymentSubtypes.${p.type}`)}` : "";
                  const who = p.employee ? (isAr ? p.employee.fullNameAr : p.employee.fullNameEn || p.employee.fullNameAr) : p.supplierName;
                  const branch = localized(p.branch?.name, p.branch?.nameEn);
                  const edit = () => hasPermission("payments.edit") && setDialog({ open: true, payment: p });
                  return (
                    <tr key={p.id} className="click" style={{ ["--j" as string]: j }} onClick={edit}>
                      <td className="mono">
                        <b>{p.paymentNumber}</b>
                      </td>
                      <td>
                        <b>
                          {t(`paymentCategories.${p.category}`)}
                          {sub}
                        </b>
                        {who && <small className="block text-[12.5px] text-[var(--l-muted)]">{who}</small>}
                      </td>
                      <td className="hm">{branch ?? "—"}</td>
                      <td className="mono">
                        <b>{(Number(p.total) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> {sar}
                      </td>
                      <td className="hm">
                        <PxBadge tone="mut">{t(`paymentMethods.${p.method}`, { defaultValue: p.method })}</PxBadge>
                      </td>
                      <td className="mono">{dmy(p.paymentDate)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="px-iconbtn" aria-label={t("common.actions")}>
                              <MoreHorizontal />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                            <DropdownMenuItem className="rounded-2xl" onSelect={() => openPdfInNewTab(paymentReceiptUrl(p.id))}>
                              <Printer className="me-2 h-4 w-4" /> {t("common.print")}
                            </DropdownMenuItem>
                            {hasPermission("payments.edit") && (
                              <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, payment: p })}>
                                <Edit className="me-2 h-4 w-4" /> {t("common.edit")}
                              </DropdownMenuItem>
                            )}
                            {hasPermission("payments.delete") && (
                              <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(p)}>
                                <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <PxPager page={page} pages={pages} total={data?.meta.total ?? 0} pageSize={pageSize} onChange={setPage} />
      </section>

      <PaymentDialog open={dialog.open} payment={dialog.payment} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("payments.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
