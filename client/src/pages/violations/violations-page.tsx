import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileSpreadsheet, Plus, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { PxBadge, PxPager, PxTabs, type BadgeTone } from "@/components/royal/px";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Kpis, Pill } from "@/components/royal/rp";
import { violationsApi, type Violation, type ViolationKind, type ViolationQuery } from "@/api/violations";
import { AUTHORITIES, STATE_LOOK, authorityOf, daysAr, nextDeadline } from "@/lib/violations";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { ViolationDialog } from "@/pages/violations/violation-dialogs";
import "@/styles/violations.css";

/* Violations, as in the approved preview: figures on top, a tab for the
   authorities' fines and one for staff penalties, filters, and a card per
   violation with its next deadline counting down. */

type StateFilter = NonNullable<ViolationQuery["state"]>;

export function ViolationCard({ v, onOpen }: { v: Violation; onOpen: () => void }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const look = STATE_LOOK[v.state];
  const staff = v.kind === "STAFF";
  const a = authorityOf(v.authority);
  const next = nextDeadline(v);
  const dc = !next ? "var(--muted)" : next.days < 0 ? "var(--bad)" : next.days <= 7 ? "var(--warn)" : "var(--ok)";
  const pct = !next ? 100 : Math.max(6, Math.min(100, 100 - (next.days / 30) * 100));
  const name = staff ? (isAr ? v.employee?.fullNameAr : v.employee?.fullNameEn || v.employee?.fullNameAr) ?? "—" : v.authorityLabel ?? "—";
  const branch = v.branch ? (isAr ? v.branch.name : v.branch.nameEn || v.branch.name) : "";
  const what = next?.which === "objection" ? (isAr ? "الاعتراض" : "objection") : isAr ? "السداد" : "payment";
  return (
    <button type="button" className="vio-card" onClick={onOpen} style={{ ["--sc" as string]: look.c, ["--dc" as string]: dc }}>
      <div className="vio-r1">
        <span className="vio-tile" style={{ background: staff ? "#4f46e5" : a.color }}>
          {staff ? name.trim().charAt(0) : a.short}
        </span>
        <span className="vio-who">
          <b>{name}</b>
          <small>{[staff ? v.employee?.employeeNumber : v.number, branch].filter(Boolean).join(" · ")}</small>
        </span>
        <Pill tone={look.tone}>{isAr ? look.ar : look.en}</Pill>
      </div>
      <div className="vio-reason">{v.reason}</div>
      {next && (
        <div className="vio-meter">
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="vio-r3">
        <span className="vio-amt">
          {staff ? (
            <>
              <b style={{ fontSize: 15 }}>{v.penalty}</b>
              {v.amount > 0 && <small>· {formatCurrency(v.amount)}</small>}
            </>
          ) : (
            <b>{formatCurrency(v.amount)}</b>
          )}
        </span>
        <span className="vio-due">
          <Clock />
          {next ? (
            next.days < 0 ? (
              <span>
                {isAr ? `فات ميعاد ${what} من ` : `${what} deadline passed `}
                <b>{isAr ? daysAr(next.days) : `${-next.days}d ago`}</b>
              </span>
            ) : (
              <span>
                {isAr ? `آخر ميعاد ${what}: ` : `${what} due: `}
                <b>{next.days === 0 ? (isAr ? "اليوم" : "today") : isAr ? `باقي ${daysAr(next.days)}` : `${next.days}d left`}</b>
              </span>
            )
          ) : v.payment ? (
            <span className="rp-mono">{v.payment.paymentNumber}</span>
          ) : (
            <span>{v.date.split("-").reverse().join("/")}</span>
          )}
        </span>
      </div>
    </button>
  );
}

export default function ViolationsPage() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [kind, setKind] = useState<ViolationKind>("AUTHORITY");
  const [state, setState] = useState<StateFilter>("all");
  const [authority, setAuthority] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const pageSize = 24;

  const query: ViolationQuery = { kind, state, authority: authority || undefined, q: q || undefined, page, pageSize };
  const { data, isLoading } = useQuery({ queryKey: ["violations", "list", query], queryFn: () => violationsApi.list(query) });
  const { data: stats } = useQuery({ queryKey: ["violations", "stats"], queryFn: violationsApi.stats });
  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const exportParams = { kind, state, authority: authority || undefined, q: q || undefined };

  const states: { value: StateFilter; label: string }[] = [
    { value: "all", label: isAr ? "الكل" : "All" },
    { value: "open", label: isAr ? "مفتوحة" : "Open" },
    ...(kind === "AUTHORITY"
      ? [
          { value: "overdue" as const, label: isAr ? "متأخرة" : "Overdue" },
          { value: "objection" as const, label: isAr ? "تحت الاعتراض" : "Objection" },
        ]
      : []),
    { value: "done", label: isAr ? "منتهية" : "Closed" },
  ];

  return (
    <div className="px">
      <PageHeader
        title={isAr ? "المخالفات" : "Violations"}
        description={isAr ? "مخالفات الجهات الحكومية على المنشآت، وجزاءات الموظفين." : "Government authority fines on the establishments, and staff penalties."}
        actions={
          <div className="flex flex-wrap gap-2">
            {hasPermission("violations.export") && (
              <>
                <Button variant="outline" onClick={() => openPdfInNewTab("/violations/export", { ...exportParams, format: "pdf" }, "violations.pdf")}>
                  <Printer className="h-4 w-4" /> {isAr ? "تقرير المخالفات" : "Report"}
                </Button>
                <Button variant="outline" onClick={() => downloadFile("/violations/export", { ...exportParams, format: "xlsx" }, "violations.xlsx").catch(() => undefined)}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
              </>
            )}
            {hasPermission("violations.create") && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> {isAr ? "مخالفة جديدة" : "New violation"}
              </Button>
            )}
          </div>
        }
      />

      <Kpis
        items={[
          {
            label: isAr ? "مخالفات مفتوحة" : "Open violations",
            value: stats?.open ?? "—",
            sub: stats?.overdue ? (isAr ? `${stats.overdue} متأخرة السداد` : `${stats.overdue} overdue`) : isAr ? "مفيش حاجة متأخرة" : "Nothing overdue",
            hero: true,
            onClick: () => {
              setKind("AUTHORITY");
              setState("open");
              setPage(1);
            },
          },
          { label: isAr ? "غرامات غير مسددة" : "Unpaid fines", value: stats ? formatCurrency(stats.unpaidAmount) : "—", sub: isAr ? `على ${stats?.open ?? 0} مخالفات` : `On ${stats?.open ?? 0} violations`, tone: "bad" },
          {
            label: isAr ? "ميعادها خلال أسبوعين" : "Due within 2 weeks",
            value: stats?.dueSoon ?? "—",
            sub: isAr ? "سداد أو اعتراض" : "Payment or objection",
            tone: "warn",
          },
          { label: isAr ? "اتسدد آخر شهرين" : "Paid, last 2 months", value: stats ? formatCurrency(stats.paidAmount) : "—", sub: isAr ? "بسندات صرف في المدفوعات" : "With payment vouchers", tone: "ok" },
        ]}
      />

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <PxTabs
            value={kind}
            onChange={(k) => {
              setKind(k);
              setState("all");
              setAuthority("");
              setPage(1);
            }}
            items={[
              { key: "AUTHORITY", label: isAr ? "مخالفات الجهات" : "Authority violations", count: stats?.authorityTotal },
              { key: "STAFF", label: isAr ? "جزاءات الموظفين" : "Staff penalties", count: stats?.staffTotal },
            ]}
          />
          <PxTabs
            value={state}
            onChange={(s) => {
              setState(s);
              setPage(1);
            }}
            items={states.map((s) => ({ key: s.value, label: s.label }))}
          />
          <span className="sp" />
          {kind === "AUTHORITY" && (
            <Select
              value={authority || "all"}
              onValueChange={(v) => {
                setAuthority(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-[38px] w-44 shrink-0 rounded-[10px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "كل الجهات" : "All authorities"}</SelectItem>
                {AUTHORITIES.map((a) => (
                  <SelectItem key={a.key} value={a.key}>
                    {isAr ? a.ar : a.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <label className="px-search">
            <Search />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={isAr ? "الرقم أو السبب أو الفرع أو الموظف" : "Number, reason, establishment or employee"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
        </div>
        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{kind === "STAFF" ? (isAr ? "الموظف" : "Employee") : isAr ? "الجهة" : "Authority"}</th>
                <th>{isAr ? "السبب" : "Reason"}</th>
                <th className="hm">{isAr ? "المؤسسة" : "Establishment"}</th>
                <th>{kind === "STAFF" ? (isAr ? "الجزاء" : "Penalty") : isAr ? "المبلغ" : "Amount"}</th>
                <th>{isAr ? "الميعاد الجاي" : "Next deadline"}</th>
                <th>{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="h-9 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                    </td>
                  </tr>
                ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="px-empty">
                      <b>{q || state !== "all" || authority ? (isAr ? "مفيش مخالفات بالفلتر ده" : "No violations match") : kind === "AUTHORITY" ? (isAr ? "مفيش مخالفات مسجلة" : "No violations yet") : isAr ? "مفيش جزاءات مسجلة" : "No penalties yet"}</b>
                      {hasPermission("violations.create") && !q && state === "all" && (
                        <div className="mt-3">
                          <Button onClick={() => setAdding(true)}>
                            <Plus className="h-4 w-4" /> {isAr ? "سجّل أول مخالفة" : "Record the first one"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                items.map((v, j) => {
                  const look = STATE_LOOK[v.state];
                  const staff = v.kind === "STAFF";
                  const a = authorityOf(v.authority);
                  const next = nextDeadline(v);
                  const name = staff ? (isAr ? v.employee?.fullNameAr : v.employee?.fullNameEn || v.employee?.fullNameAr) ?? "—" : v.authorityLabel ?? "—";
                  const branch = v.branch ? (isAr ? v.branch.name : v.branch.nameEn || v.branch.name) : "—";
                  const what = next?.which === "objection" ? (isAr ? "الاعتراض" : "Objection") : isAr ? "السداد" : "Payment";
                  const tone: BadgeTone = look.tone === "bad" ? "bad" : look.tone === "warn" ? "warn" : look.tone === "ok" ? "ok" : "mut";
                  return (
                    <tr key={v.id} className="click" style={{ ["--j" as string]: j }} onClick={() => navigate(`/violations/${v.id}`)}>
                      <td>
                        <div className="px-who">
                          <span className="px-av" style={staff ? undefined : { color: "#fff", background: a.color }}>
                            {staff ? name.trim().charAt(0) : a.short}
                          </span>
                          <div>
                            <b>{name}</b>
                            <small className="mono">{staff ? v.employee?.employeeNumber : v.number}</small>
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "normal", minWidth: 200 }}>{v.reason}</td>
                      <td className="hm">{branch}</td>
                      <td className="mono">
                        {staff ? (
                          <>
                            <b>{v.penalty}</b>
                            {v.amount > 0 && <small className="block text-[12px] text-[var(--l-muted)]">{formatCurrency(v.amount)}</small>}
                          </>
                        ) : (
                          <b>{formatCurrency(v.amount)}</b>
                        )}
                      </td>
                      <td>
                        {next ? (
                          <PxBadge tone={next.days < 0 ? "bad" : next.days <= 7 ? "warn" : "ok"}>
                            {what} ·{" "}
                            {next.days < 0 ? (isAr ? `فات من ${daysAr(next.days)}` : `${-next.days}d ago`) : next.days === 0 ? (isAr ? "اليوم" : "today") : isAr ? `باقي ${daysAr(next.days)}` : `${next.days}d left`}
                          </PxBadge>
                        ) : v.payment ? (
                          <span className="mono">{v.payment.paymentNumber}</span>
                        ) : (
                          <span className="mono">{v.date.split("-").reverse().join("/")}</span>
                        )}
                      </td>
                      <td>
                        <PxBadge tone={tone}>{isAr ? look.ar : look.en}</PxBadge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <PxPager page={page} pages={pages} total={total} pageSize={pageSize} onChange={setPage} />
      </section>

      <ViolationDialog open={adding} onOpenChange={setAdding} kind={kind} onSaved={(v) => navigate(`/violations/${v.id}`)} />
    </div>
  );
}
