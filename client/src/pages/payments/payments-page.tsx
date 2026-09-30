import { useMemo, useState } from "react";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Edit, FileDown, MoreHorizontal, Plus, Printer, Receipt, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuPager } from "@/components/lulu/lulu-ui";
import { DayHeader, Kpis, Pill, groupByDay, type Tone } from "@/components/royal/rp";
import { paymentsApi, paymentReceiptUrl, PAYMENT_SUBTYPES } from "@/api/payments";
import { dashboardApi } from "@/api/dashboard";
import { reportsApi } from "@/api/reports";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { PaymentDialog } from "@/pages/payments/payment-dialog";
import type { Payment } from "@/types/models";

/* Payments in the Royal design, as in the approved preview: the summary
   band, six months of spending, spending by category (which also filters),
   and the vouchers by day with each day's total. */

const CAT_TONES: Tone[] = ["vio", "bad", "gold", "teal", "sky", "pri", "ok"];
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
  const [search, setSearch] = useState("");
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
  const catTone = (c: string) => CAT_TONES[Math.abs([...c].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % CAT_TONES.length];

  const max = Math.max(1, ...months.map((m) => m.total));

  const rows = data?.data ?? [];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const byDay = groupByDay(rows, (p) => p.paymentDate);
  const sar = isAr ? "ر.س" : "SAR";

  return (
    <div className="rp">
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

      <Kpis
        items={[
          {
            label: isAr ? "مدفوعات هذا الشهر" : "This month",
            value: (
              <>
                {money(thisMonth)} <small>{sar}</small>
              </>
            ),
            sub: change !== null ? `${change >= 0 ? "+" : ""}${change}% ${isAr ? "عن الشهر الماضي" : "vs last month"}` : isAr ? "هذا الشهر" : "This month",
            hero: true,
          },
          {
            label: months[4]?.label ?? (isAr ? "الشهر الماضي" : "Last month"),
            value: (
              <>
                {money(lastMonth)} <small>{sar}</small>
              </>
            ),
            sub: isAr ? "الشهر الماضي" : "Last month",
            tone: "sky",
          },
          {
            label: isAr ? "إجمالي المسجّل" : "All recorded",
            value: (
              <>
                {money(data?.summary?.grandTotal ?? 0)} <small>{sar}</small>
              </>
            ),
            sub: isAr ? `${data?.meta.total ?? 0} سند` : `${data?.meta.total ?? 0} vouchers`,
            tone: "pri",
          },
          {
            label: isAr ? "الضريبة" : "VAT",
            value: (
              <>
                {money(data?.summary?.totalVat ?? 0)} <small>{sar}</small>
              </>
            ),
            sub: isAr ? "ضمن الإجمالي" : "Included in the total",
            tone: "gold",
          },
        ]}
      />

      <div className="rp-pay2">
        <section className="rp-card rp-rise p-[18px]" style={{ ["--i" as string]: 2 }}>
          <div className="rp-sec">
            <h2>
              <BarChart3 />
              {isAr ? "آخر 6 شهور" : "Last 6 months"}
            </h2>
            <p>{`${money(months.reduce((a, m) => a + m.total, 0))} ${sar}`}</p>
          </div>
          <div className="rp-bars" role="img" aria-label={isAr ? "المصروفات في كل شهر" : "Spending each month"}>
            {months.map((m, i) => (
              <div key={m.key} className={cn("b", i === months.length - 1 && "now")} style={{ ["--k" as string]: i }}>
                <em>{m.total >= 1000 ? `${(Math.round(m.total / 100) / 10).toLocaleString("en-US")}${isAr ? " ألف" : "k"}` : money(m.total)}</em>
                <i style={{ height: `${(m.total / max) * 110}px` }} />
                <small>{m.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="rp-card rp-rise p-[18px]" style={{ ["--i" as string]: 3 }}>
          <div className="rp-sec mb-3">
            <h2>
              <Receipt />
              {isAr ? "حسب البند" : "By category"}
            </h2>
            <p>{isAr ? "اضغط على بند للتصفية" : "Tap one to filter"}</p>
          </div>
          <div className="grid gap-3">
            {cats.length === 0 && <span className="text-sm text-muted-foreground">{isAr ? "لا توجد مدفوعات بعد" : "No payments yet"}</span>}
            {cats.slice(0, 6).map((c) => (
              <button
                key={c.category}
                type="button"
                className={cn("grid gap-1.5 rounded-xl p-1 text-start transition-colors hover:bg-[var(--l-ground)]", `rp-${catTone(c.category)}`, category === c.category && "bg-[var(--l-ground)]")}
                aria-pressed={category === c.category}
                onClick={() => {
                  setCategory(category === c.category ? "" : c.category);
                  setPage(1);
                }}
              >
                <span className="flex items-center justify-between gap-2 text-[13px]">
                  <Pill tone={catTone(c.category)} dot={false}>
                    {t(`paymentCategories.${c.category}`, { defaultValue: c.category })}
                  </Pill>
                  <b className="rp-num">{money(c.total)}</b>
                </span>
                <span className="rp-bar">
                  <i style={{ width: `${(c.total / catSum) * 100}%` }} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 4 }}>
        <label className="rp-search">
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
        <button
          type="button"
          className="rp-chip rp-pri"
          aria-pressed={!category}
          onClick={() => {
            setCategory("");
            setPage(1);
          }}
        >
          <i />
          {isAr ? "كل البنود" : "All categories"}
        </button>
        {cats.slice(0, 6).map((c) => (
          <button
            key={c.category}
            type="button"
            className={cn("rp-chip", `rp-${catTone(c.category)}`)}
            aria-pressed={category === c.category}
            onClick={() => {
              setCategory(c.category);
              setPage(1);
            }}
          >
            <i />
            {t(`paymentCategories.${c.category}`, { defaultValue: c.category })}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rp-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rp-item">
              <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--l-ground)]" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rp-card rp-empty rp-rise">
          <b>{t("payments.emptyTitle")}</b>
          {hasPermission("payments.create") && (
            <div className="mt-3">
              <Button onClick={() => setDialog({ open: true })}>
                <Plus className="h-4 w-4" /> {t("payments.addPayment")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: 5 }}>
          {byDay.map((g) => (
            <div key={g.day.toISOString()}>
              <DayHeader
                day={g.day}
                right={
                  <>
                    <b>{money(g.items.reduce((n, p) => n + (Number(p.total) || 0), 0))}</b>
                    {sar} · {isAr ? `${g.items.length} سند` : `${g.items.length} voucher${g.items.length === 1 ? "" : "s"}`}
                  </>
                }
              />
              {g.items.map((p) => {
                const sub = p.type && PAYMENT_SUBTYPES[p.category]?.includes(p.type) ? ` — ${t(`paymentSubtypes.${p.type}`)}` : "";
                const who = p.employee ? (isAr ? p.employee.fullNameAr : p.employee.fullNameEn || p.employee.fullNameAr) : p.supplierName;
                const branch = localized(p.branch?.name, p.branch?.nameEn);
                const edit = () => hasPermission("payments.edit") && setDialog({ open: true, payment: p });
                return (
                  <div key={p.id} role="button" tabIndex={0} className="rp-item cursor-pointer hover:bg-[var(--l-ground)]" onClick={edit} onKeyDown={(e) => e.key === "Enter" && edit()}>
                    <span className={cn("rp-ico sm", `rp-${catTone(p.category)}`)}>
                      <Receipt />
                    </span>
                    <span className="t">
                      <b>
                        {t(`paymentCategories.${p.category}`)}
                        {sub}
                        {branch ? ` — ${branch}` : ""}
                      </b>
                      <small>
                        <span className="rp-mono">{p.paymentNumber}</span>
                        {who ? ` · ${who}` : ""} · {t(`paymentMethods.${p.method}`, { defaultValue: p.method })}
                      </small>
                    </span>
                    <span className="end">
                      <b>{money(Number(p.total) || 0)}</b>
                      <small>{sar}</small>
                    </span>
                    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="lu-kebab" aria-label={t("common.actions")}>
                            <MoreHorizontal className="h-4 w-4" />
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
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      <PaymentDialog open={dialog.open} payment={dialog.payment} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("payments.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
