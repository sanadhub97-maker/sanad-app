import { useMemo, useState, type CSSProperties } from "react";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Clock, Edit, FileDown, MoreHorizontal, Plus, Printer, Search, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuEmpty, LuPager, useArmed } from "@/components/lulu/lulu-ui";
import { paymentsApi, paymentReceiptUrl, PAYMENT_SUBTYPES } from "@/api/payments";
import { dashboardApi } from "@/api/dashboard";
import { reportsApi } from "@/api/reports";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { PaymentDialog } from "@/pages/payments/payment-dialog";
import type { Payment } from "@/types/models";

/* Payments in the Pearl design, as in the approved preview: three colour
   cards, six months of spending, spending by category, and the latest
   payments as rows. */

const v = (o: Record<string, string | number>) => o as CSSProperties;
const CAT_TONES = ["violet", "rose", "amber", "teal", "sky", "indigo", "green"];
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
  const [dialog, setDialog] = useState<{ open: boolean; payment?: Payment }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const pageSize = 20;
  const armed = useArmed();
  const narrow = useNarrow();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", { page, search }],
    queryFn: () => paymentsApi.list({ page, pageSize, q: search || undefined }),
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

  const W = narrow ? 360 : 620;
  const H = 210;
  const pl = 16;
  const bot = 34;
  const top = 30;
  const cw = narrow ? 34 : 46;
  const max = Math.max(1, ...months.map((m) => m.total));
  const step = (W - pl * 2) / months.length;

  const rows = data?.data ?? [];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const kpis = [
    { tone: "violet", label: isAr ? "مدفوعات هذا الشهر" : "This month", value: thisMonth, icon: Wallet, note: change !== null ? `${change >= 0 ? "+" : ""}${change}% ${isAr ? "عن الشهر الماضي" : "vs last month"}` : isAr ? "هذا الشهر" : "This month", pay: true },
    { tone: "sky", label: months[4]?.label ?? "", value: lastMonth, icon: BarChart3, note: isAr ? "الشهر الماضي" : "Last month", pay: false },
    { tone: "amber", label: isAr ? "إجمالي المسجّل" : "All recorded", value: data?.summary?.grandTotal ?? 0, icon: Clock, note: isAr ? `منها ضريبة ${money(data?.summary?.totalVat ?? 0)} ر.س` : `incl. ${money(data?.summary?.totalVat ?? 0)} SAR VAT`, pay: false },
  ];

  return (
    <>
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

      <div className="lu-grid">
        <div className="lu-kpis">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <section key={i} className={cn("lu-cc lu-rise lu-tilt lu-kpi", `lt-${k.tone}`)} style={v({ "--i": i })}>
                <span className="lu-hd">
                  <span className="lbl">{k.label}</span>
                  <span className="lu-sq ic">
                    <Icon />
                  </span>
                </span>
                <span className="val lu-num">
                  <span>{money(k.value)}</span>
                  <small>{isAr ? "ر.س" : "SAR"}</small>
                </span>
                <span className="lu-note">{k.note}</span>
                {k.pay && (
                  <span className="fx" aria-hidden="true">
                    <span className="lu-pay" style={{ display: "block" }}>
                      <svg width="96" height="46" viewBox="0 0 96 46" style={{ direction: "ltr" }}>
                        <path d="M2 40 L18 30 L32 34 L48 20 L62 24 L80 8" fill="none" stroke="var(--c)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="coin" />
                    </span>
                  </span>
                )}
              </section>
            );
          })}
        </div>

        <section className="lu-cc lu-rise lt-violet lu-s8" style={v({ "--i": 3 })}>
          <div className="lu-hd">
            <h2>{isAr ? "المصروفات آخر 6 أشهر" : "Spending, last 6 months"}</h2>
            <span className="lu-note">{`${money(months.reduce((a, m) => a + m.total, 0))} ${isAr ? "ر.س" : "SAR"}`}</span>
          </div>
          <svg className="lu-chart" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ direction: "ltr", marginTop: 8 }} role="img" aria-label={isAr ? "المصروفات في كل شهر" : "Spending each month"}>
            <line x1={pl} x2={W - pl} y1={H - bot} y2={H - bot} stroke="var(--l-line)" />
            {months.map((m, i) => {
              const x = isAr ? W - pl - (i + 0.5) * step : pl + (i + 0.5) * step;
              const hg = m.total ? (m.total / max) * (H - top - bot) : 4;
              const y = H - bot - hg;
              const last = i === months.length - 1;
              const label = m.total >= 1000 ? `${(Math.round(m.total / 100) / 10).toLocaleString("en-US")}${narrow ? "k" : isAr ? " ألف" : "k"}` : money(m.total);
              return (
                <g key={m.key}>
                  <rect className="col" style={{ animationDelay: `${0.3 + i * 0.08}s` }} x={x - cw / 2} y={y} width={cw} height={hg} rx="12" fill={last ? "var(--c)" : "var(--d)"} />
                  <text x={x} y={y - 9} textAnchor="middle" style={{ fill: "var(--l-ink)", fontWeight: 600 }}>
                    {label}
                  </text>
                  <text x={x} y={H - 10} textAnchor="middle">
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        <section className="lu-cc lu-rise lt-amber lu-s4" style={v({ "--i": 4 })}>
          <div className="lu-hd">
            <h2>{isAr ? "حسب البند" : "By category"}</h2>
            <span className="lu-note">{isAr ? "كل المدفوعات" : "All payments"}</span>
          </div>
          <div className="lu-types">
            {cats.length === 0 && <span className="text-sm text-muted-foreground">{isAr ? "لا توجد مدفوعات بعد" : "No payments yet"}</span>}
            {cats.slice(0, 6).map((c) => (
              <div key={c.category} className={`lt-${catTone(c.category)}`}>
                <span>{t(`paymentCategories.${c.category}`, { defaultValue: c.category })}</span>
                <b className="lu-num">{money(c.total)}</b>
                <em>
                  <i style={{ width: armed ? `${(c.total / catSum) * 100}%` : 0 }} />
                </em>
              </div>
            ))}
          </div>
        </section>

        <section className="lu-cc lu-rise lt-sky lu-s12" style={v({ "--i": 5 })}>
          <div className="lu-hd">
            <h2>{isAr ? "آخر المدفوعات" : "Latest payments"}</h2>
            <span className="lu-note">{isAr ? `${data?.meta.total ?? 0} دفعة` : `${data?.meta.total ?? 0} payments`}</span>
          </div>
          <div className="lu-tools no-print" style={{ marginTop: 12 }}>
            <label className="lu-field">
              <Search />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={isAr ? "رقم الدفعة أو الوصف" : "Payment number or description"}
                aria-label={isAr ? "بحث" : "Search"}
              />
            </label>
          </div>
          {isLoading ? (
            <div className="lu-list mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[68px] animate-pulse rounded-[18px] bg-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-3">
              <LuEmpty
                tone="violet"
                title={t("payments.emptyTitle")}
                action={
                  hasPermission("payments.create") ? (
                    <Button onClick={() => setDialog({ open: true })}>
                      <Plus className="h-4 w-4" /> {t("payments.addPayment")}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="lu-list mt-3">
              {rows.map((p, j) => {
                const sub = p.type && PAYMENT_SUBTYPES[p.category]?.includes(p.type) ? ` — ${t(`paymentSubtypes.${p.type}`)}` : "";
                const who = p.employee ? (isAr ? p.employee.fullNameAr : p.employee.fullNameEn || p.employee.fullNameAr) : p.supplierName;
                const branch = localized(p.branch?.name, p.branch?.nameEn);
                const edit = () => hasPermission("payments.edit") && setDialog({ open: true, payment: p });
                return (
                  <div key={p.id} role="button" tabIndex={0} className={cn("lu-row", `lt-${catTone(p.category)}`)} style={v({ "--j": Math.min(j, 12) })} onClick={edit} onKeyDown={(e) => e.key === "Enter" && edit()}>
                    <span className="lu-pi">
                      <Wallet />
                    </span>
                    <span className="lu-cell">
                      <b>
                        {t(`paymentCategories.${p.category}`)}
                        {sub}
                      </b>
                      <small>{[who, branch, p.paymentNumber].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className="lu-cell lu-hide-s">
                      <small>{isAr ? "التاريخ" : "Date"}</small>
                      <b className="lu-num">{formatDate(p.paymentDate)}</b>
                    </span>
                    <span className="lu-cell lu-hide-m">
                      <small>{isAr ? "طريقة الدفع" : "Method"}</small>
                      <b>{t(`paymentMethods.${p.method}`, { defaultValue: p.method })}</b>
                    </span>
                    <span className="lu-amt lu-num">
                      {money(Number(p.total) || 0)}
                      <small>{isAr ? "ر.س" : "SAR"}</small>
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
          )}
          <div className="mt-3">
            <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />
          </div>
        </section>
      </div>

      <PaymentDialog open={dialog.open} payment={dialog.payment} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("payments.deleteConfirmTitle")} onConfirm={handleDelete} />
    </>
  );
}
