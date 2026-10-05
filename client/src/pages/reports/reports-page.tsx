import { DeclarationViolationReports } from "./declaration-violation-reports";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ArrowDownToLine, Bell, Building2, ChevronLeft, Clock, FileSpreadsheet, FileText, Printer, User, Users, Wallet, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { reportsApi } from "@/api/reports";
import { listActiveBranches } from "@/api/branches";
import { openPdfInNewTab } from "@/lib/download";
import { formatCurrency } from "@/lib/utils";
import { localized } from "@/lib/names";
import { DayHeader, Initials, Kpis, LeftPill, daysFromToday, dayKey, dayOf, dmy, groupByDay, hijri, weekday } from "@/components/royal/rp";
import { Seg, actionLook, kindColor, timeOf } from "@/components/royal/cards";
import { COMPANY_DOCUMENT_CATEGORY_ICONS, EMPLOYEE_DOCUMENT_TYPE_ICONS } from "@/lib/document-type-icons";
import { useAuthStore } from "@/stores/authStore";

/* Reports in the Royal card design: the figures that matter, a card per
   report with its count and what it holds (PDF, Excel, print), and the open
   report below with its filters and its rows — documents by how soon they
   end, payments and activity by day, employees by establishment. */

type EmployeeRow = { id: string; employeeNumber: string; fullName: string; fullNameEn: string; jobTitle: string | null; jobTitleEn: string | null; branch: string | null; branchEn: string | null; employmentStatus: string; iqamaNumber: string | null; iqamaExpiryDate: string | null };
type DocumentRow = { recordId: string; employeeId: string | null; sourceType: string; kind: string; kindAr?: string; kindEn?: string; owner?: string; ownerEn?: string; ownerTypeEn?: string; documentNumber?: string | null; branch?: string | null; branchEn?: string | null; expiryDate: string; status: string };
type PaymentRow = { paymentNumber: string; paymentDate: string; category: string; method: string; branch: string | null; branchEn: string | null; employee: string | null; employeeEn: string | null; total: number };
type ActivityRow = { date: string; user: string; action: string; module: string; recordId: string | null; description: string | null };

type Report = "employees" | "documents" | "payments" | "activity";
type TileId = "expired" | "soon" | "documents" | "employees" | "payments" | "activity";
const TILE_LOOK: Record<TileId, { report: Report; icon: LucideIcon; c: string; title: [string, string]; text: [string, string] }> = {
  expired: { report: "documents", icon: Bell, c: "var(--bad)", title: ["الوثائق المنتهية", "Expired documents"], text: ["كل وثيقة انتهت ويلزم تجديدها، مع صاحبها وتاريخ انتهائها", "Every document that has ended and needs renewing"] },
  soon: { report: "documents", icon: Clock, c: "var(--warn)", title: ["القريبة من الانتهاء", "Ending soon"], text: ["ما ينتهي قريبًا لتبدأ تجديده قبل موعده", "What ends soon, so you can renew it in time"] },
  documents: { report: "documents", icon: FileText, c: "var(--sky)", title: ["كل الوثائق", "All documents"], text: ["وثائق الموظفين والشركة وحالة كل منها", "Employee and company documents with their status"] },
  employees: { report: "employees", icon: Users, c: "var(--pri)", title: ["بيانات الموظفين", "Employees"], text: ["المؤسسة والحالة وانتهاء الإقامة لكل موظف", "Establishment, status and iqama expiry for everyone"] },
  payments: { report: "payments", icon: Wallet, c: "var(--vio)", title: ["المدفوعات", "Payments"], text: ["ما صُرف في كل بند وكل مؤسسة، يومًا بيوم", "What was spent, day by day"] },
  activity: { report: "activity", icon: Activity, c: "var(--teal)", title: ["سجل النشاط", "Activity log"], text: ["من أضاف أو عدّل ماذا ومتى", "Who added or changed what, and when"] },
};
const TILES = Object.keys(TILE_LOOK) as TileId[];
const STEP = 120;

const isoDay = (d: Date) => dayKey(d);
const daysAgo = (n: number) => {
  const d = dayOf(new Date());
  d.setDate(d.getDate() - n);
  return d;
};
const docPath = (r: DocumentRow) =>
  r.sourceType === "COMPANY_DOCUMENT" ? `/company-documents/${r.recordId}` : r.employeeId ? `/employee-documents/${r.employeeId}/${r.sourceType === "EMPLOYEE_IQAMA" ? "IQAMA" : r.sourceType === "EMPLOYEE_PASSPORT" ? "PASSPORT" : r.recordId}` : null;

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const L = (a: string, e: string) => (isAr ? a : e);
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReadReport = (report: Report) => hasPermission("reports.view") && (report === "payments" ? hasPermission("payments.view") : report === "activity" ? hasPermission("auditLogs.view") : report === "employees" ? hasPermission("employees.view") : ["employees.view", "employeeDocuments.view", "companyDocuments.view"].some(hasPermission));
  const [params] = useSearchParams();
  const initial = ((): TileId | null => {
    const tab = params.get("tab");
    const status = params.get("status");
    if (tab === "documents") return status === "EXPIRED" ? "expired" : status === "EXPIRING_SOON" ? "soon" : "documents";
    return TILES.includes(tab as TileId) ? (tab as TileId) : null;
  })();
  const [open, setOpen] = useState<TileId | "tax" | "violations" | null>(initial);
  const panel = useRef<HTMLDivElement>(null);

  // Filters of the open report
  const [docStatus, setDocStatus] = useState<"" | "EXPIRED" | "EXPIRING_SOON" | "VALID">(initial === "expired" ? "EXPIRED" : initial === "soon" ? "EXPIRING_SOON" : "");
  const [docSource, setDocSource] = useState<"" | "COMPANY_DOCUMENT" | "EMPLOYEE">("");
  const [branchId, setBranchId] = useState("");
  const [empStatus, setEmpStatus] = useState("");
  const [from, setFrom] = useState(isoDay(daysAgo(30)));
  const [to, setTo] = useState(isoDay(dayOf(new Date())));
  const [shown, setShown] = useState(STEP);

  function openTile(id: TileId) {
    if (open === id) return setOpen(null);
    setOpen(id);
    setShown(STEP);
    setDocStatus(id === "expired" ? "EXPIRED" : id === "soon" ? "EXPIRING_SOON" : "");
    setDocSource("");
  }
  useEffect(() => {
    if (!open || open === "tax" || open === "violations") return;
    const timer = setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(timer);
  }, [open]);

  // The figures on the cards
  const since30 = useMemo(() => daysAgo(30).toISOString(), []);
  const { data: allDocs } = useQuery({ queryKey: ["reports", "documents", {}], queryFn: () => reportsApi.documents.fetch({}) as Promise<DocumentRow[]>, staleTime: 60_000, enabled: canReadReport("documents") });
  const { data: allEmps } = useQuery({ queryKey: ["reports", "employees", {}], queryFn: () => reportsApi.employees.fetch({}) as Promise<EmployeeRow[]>, staleTime: 60_000, enabled: canReadReport("employees") });
  const { data: monthPays } = useQuery({ queryKey: ["reports", "payments", { dateFrom: since30 }], queryFn: () => reportsApi.payments.fetch({ dateFrom: since30 }) as Promise<PaymentRow[]>, staleTime: 60_000, enabled: canReadReport("payments") });
  const { data: monthAct } = useQuery({ queryKey: ["reports", "activity", { dateFrom: since30 }], queryFn: () => reportsApi.activity.fetch({ dateFrom: since30 }) as Promise<ActivityRow[]>, staleTime: 60_000, enabled: canReadReport("activity") });
  const { data: branches = [] } = useQuery({ queryKey: ["active-branches"], queryFn: listActiveBranches, staleTime: 300_000, enabled: hasPermission("branches.view") });

  const docs = allDocs ?? [];
  const nExpired = docs.filter((d) => d.status === "EXPIRED").length;
  const nSoon = docs.filter((d) => d.status === "EXPIRING_SOON").length;
  const emps = allEmps ?? [];
  const pays = monthPays ?? [];
  const paid = pays.reduce((n, p) => n + Number(p.total || 0), 0);
  const acts = monthAct ?? [];

  // The open report, with its filters
  const look = open && open !== "tax" && open !== "violations" ? TILE_LOOK[open] : null;
  const report = look?.report;
  const query = useMemo(() => {
    if (report === "documents") return { ...(docStatus ? { status: docStatus } : {}), ...(docSource ? { sourceType: docSource } : {}) };
    if (report === "employees") return { ...(branchId ? { branchId } : {}), ...(empStatus ? { employmentStatus: empStatus } : {}) };
    const range = { dateFrom: dayOf(from).toISOString(), dateTo: new Date(dayOf(to).getTime() + 86_399_999).toISOString() };
    if (report === "payments") return { ...range, ...(branchId ? { branchId } : {}) };
    return range;
  }, [report, docStatus, docSource, branchId, empStatus, from, to]);
  const { data: rowsRaw, isFetching } = useQuery({ queryKey: ["reports", report, query], queryFn: () => reportsApi[report!].fetch(query), enabled: !!report && canReadReport(report) });
  let rows = (rowsRaw as unknown[]) ?? [];
  if (report === "documents" && docSource === "EMPLOYEE") rows = (rows as DocumentRow[]).filter((r) => r.sourceType !== "COMPANY_DOCUMENT");

  const pdf = () => report && void reportsApi[report].export(query, "pdf").catch(() => undefined);
  const excel = () => report && void reportsApi[report].export(query, "xlsx").catch(() => undefined);
  const print = () => report && void openPdfInNewTab(`/reports/${report}`, { ...query, format: "pdf" }, `${report}-report.pdf`).catch(() => undefined);
  const tileExport = (id: TileId, format: "pdf" | "xlsx") => {
    const p = id === "expired" ? { status: "EXPIRED" } : id === "soon" ? { status: "EXPIRING_SOON" } : {};
    void reportsApi[TILE_LOOK[id].report].export(p, format).catch(() => undefined);
  };

  const figure: Record<TileId, { value: string | number; sub: string; parts?: [number, string][] }> = {
    expired: { value: nExpired, sub: L("وثيقة منتهية", "expired"), parts: [[nExpired, "var(--bad)"]] },
    soon: { value: nSoon, sub: L("تنتهي خلال 30 يوم", "end within 30 days"), parts: [[nSoon, "var(--warn)"]] },
    documents: { value: docs.length, sub: L("وثيقة", "documents"), parts: [[nExpired, "var(--bad)"], [nSoon, "var(--warn)"], [docs.length - nExpired - nSoon, "var(--ok)"]] },
    employees: { value: emps.length, sub: L(`موظف · ${emps.filter((e) => e.employmentStatus === "ACTIVE").length} على رأس العمل`, `employees · ${emps.filter((e) => e.employmentStatus === "ACTIVE").length} on duty`) },
    payments: { value: formatCurrency(paid), sub: L(`${pays.length} دفعة في آخر 30 يوم`, `${pays.length} payments in 30 days`) },
    activity: { value: acts.length, sub: L("عملية في آخر 30 يوم", "actions in 30 days") },
  };
  const docsTotal = Math.max(1, docs.length);
  const branchName = (ar?: string | null, en?: string | null) => localized(ar, en);

  return (
    <div className="rp rc">
      <PageHeader title={L("التقارير", "Reports")} description={L("اختر تقريرًا لتعرض بياناته وتطبعه أو تصدّره", "Pick a report to see its data, print or export it")} />

      <Kpis
        items={[
          { label: L("وثائق منتهية", "Expired documents"), value: allDocs ? nExpired : "—", sub: L("تحتاج تجديد فورًا", "Renew now"), hero: true, onClick: () => openTile("expired"), active: open === "expired" },
          { label: L("تنتهي خلال 30 يوم", "Ending within 30 days"), value: allDocs ? nSoon : "—", sub: L("جهّز التجديد", "Get the renewal ready"), tone: "warn", onClick: () => openTile("soon"), active: open === "soon" },
          { label: L("الموظفون", "Employees"), value: allEmps ? emps.length : "—", sub: L("في كل المؤسسات", "Across the establishments"), tone: "pri", onClick: () => openTile("employees"), active: open === "employees" },
          { label: L("مدفوعات آخر 30 يوم", "Payments, last 30 days"), value: monthPays ? formatCurrency(paid) : "—", sub: L(`${pays.length} دفعة`, `${pays.length} payments`), tone: "vio", onClick: () => openTile("payments"), active: open === "payments" },
        ]}
      />

      <div className="rc-rp-grid">
        {TILES.filter(id => canReadReport(TILE_LOOK[id].report)).map((id, j) => {
          const x = TILE_LOOK[id];
          const f = figure[id];
          const sum = f.parts?.reduce((n, [v]) => n + v, 0) ?? 0;
          return (
            <article key={id} className="rc-rp rp-rise" style={{ ["--i" as string]: j + 2, ["--c" as string]: x.c }} aria-current={open === id}>
              <button type="button" className="rc-rp-hd" onClick={() => openTile(id)}>
                <span className="rc-rp-ico">
                  <x.icon />
                </span>
                <span className="t">
                  <b>{L(x.title[0], x.title[1])}</b>
                  <small>{L(x.text[0], x.text[1])}</small>
                </span>
                <ChevronLeft className="go" />
              </button>
              <div className="rc-rp-fig">
                <b>{f.value}</b>
                <small>{f.sub}</small>
              </div>
              {f.parts && (
                <div className="rc-rp-bar" aria-hidden="true">
                  {f.parts.map(([v, c], k) => (v ? <i key={k} style={{ width: `${(v / (id === "documents" ? docsTotal : Math.max(1, docs.length))) * 100}%`, background: c }} /> : null))}
                  {id !== "documents" && sum === 0 && <i style={{ width: "100%", background: "var(--ok)" }} />}
                </div>
              )}
              <div className="rc-rp-ft">
                <button type="button" className="rc-btn pri" onClick={() => tileExport(id, "pdf")}>
                  <ArrowDownToLine />
                  PDF
                </button>
                <button type="button" className="rc-btn" onClick={() => tileExport(id, "xlsx")}>
                  <FileSpreadsheet />
                  Excel
                </button>
                <span className="sp" />
                <button type="button" className="rc-btn" aria-pressed={open === id} onClick={() => openTile(id)}>
                  {open === id ? L("إخفاء", "Hide") : L("عرض البيانات", "Show data")}
                </button>
              </div>
            </article>
          );
        })}
        <DeclarationViolationReports kind={open === "tax" || open === "violations" ? open : null} onKindChange={setOpen} />
      </div>

      {open && look && canReadReport(look.report) && (
        <section ref={panel} className="rc-dcard rc-rpanel rp-rise" style={{ ["--c" as string]: look.c }}>
          <h2>
            <span className="ico">
              <look.icon />
            </span>
            {L(look.title[0], look.title[1])}
            <span className="r">{isFetching ? L("جارٍ التحميل…", "Loading…") : L(`${rows.length} سجل`, `${rows.length} records`)}</span>
          </h2>
          <div className="rc-rp-tools no-print">
            {report === "documents" && (
              <>
                <Seg
                  label={L("الحالة", "Status")}
                  value={docStatus}
                  onChange={(v) => (setDocStatus(v), setShown(STEP))}
                  items={[
                    { value: "", label: L("الكل", "All") },
                    { value: "EXPIRED", label: L("منتهية", "Expired") },
                    { value: "EXPIRING_SOON", label: L("قريبة", "Soon") },
                    { value: "VALID", label: L("سارية", "Valid") },
                  ]}
                />
                <Seg
                  label={L("المصدر", "Source")}
                  value={docSource}
                  onChange={(v) => (setDocSource(v), setShown(STEP))}
                  items={[
                    { value: "", label: L("الكل", "All") },
                    { value: "EMPLOYEE", label: L("الموظفون", "Employees"), icon: User },
                    { value: "COMPANY_DOCUMENT", label: L("الشركة", "Company"), icon: Building2 },
                  ]}
                />
              </>
            )}
            {(report === "employees" || report === "payments") && branches.length > 0 && (
              <Select value={branchId || "all"} onValueChange={(v) => (setBranchId(v === "all" ? "" : v), setShown(STEP))}>
                <SelectTrigger className="h-[38px] w-56 shrink-0 rounded-[11px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
                  <SelectValue placeholder={L("جميع المؤسسات", "All establishments")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{L("جميع المؤسسات", "All establishments")}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <bdi>{localized(b.name, b.nameEn)}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {report === "employees" && (
              <Seg
                label={L("الحالة", "Status")}
                value={empStatus}
                onChange={(v) => (setEmpStatus(v), setShown(STEP))}
                items={[
                  { value: "", label: L("الكل", "All") },
                  { value: "ACTIVE", label: t("status.ACTIVE", { defaultValue: "ACTIVE" }) },
                  { value: "ON_LEAVE", label: t("status.ON_LEAVE", { defaultValue: "ON_LEAVE" }) },
                  { value: "INACTIVE", label: t("status.INACTIVE", { defaultValue: "INACTIVE" }) },
                  { value: "TERMINATED", label: t("status.TERMINATED", { defaultValue: "TERMINATED" }) },
                ]}
              />
            )}
            {(report === "payments" || report === "activity") && (
              <div className="rc-range">
                <label>
                  {L("من", "From")}
                  <input type="date" value={from} max={to} onChange={(e) => e.target.value && (setFrom(e.target.value), setShown(STEP))} />
                </label>
                <label>
                  {L("إلى", "To")}
                  <input type="date" value={to} min={from} onChange={(e) => e.target.value && (setTo(e.target.value), setShown(STEP))} />
                </label>
                {[7, 30, 90].map((n) => (
                  <button key={n} type="button" className="rc-btn" onClick={() => (setFrom(isoDay(daysAgo(n))), setTo(isoDay(dayOf(new Date()))), setShown(STEP))}>
                    {L(`آخر ${n} يوم`, `Last ${n} days`)}
                  </button>
                ))}
              </div>
            )}
            <span className="sp" />
            <button type="button" className="rc-btn pri" onClick={pdf}>
              <ArrowDownToLine />
              PDF
            </button>
            <button type="button" className="rc-btn" onClick={excel}>
              <FileSpreadsheet />
              Excel
            </button>
            <button type="button" className="rc-btn" onClick={print}>
              <Printer />
              {L("طباعة", "Print")}
            </button>
          </div>

          {isFetching && !rows.length ? (
            <div className="rc-none">{L("جارٍ التحميل…", "Loading…")}</div>
          ) : !rows.length ? (
            <div className="rc-none">{L("لا توجد بيانات بهذا الفلتر", "Nothing matches this filter")}</div>
          ) : report === "documents" ? (
            <DocumentsBody rows={(rows as DocumentRow[]).slice(0, shown)} isAr={isAr} onOpen={(r) => { const p = docPath(r); if (p) navigate(p); }} />
          ) : report === "employees" ? (
            <EmployeesBody rows={(rows as EmployeeRow[]).slice(0, shown)} isAr={isAr} onOpen={(id) => navigate(`/employees/${id}`)} statusLabel={(s) => t(`status.${s}`, { defaultValue: s })} branchName={branchName} />
          ) : report === "payments" ? (
            <PaymentsBody rows={(rows as PaymentRow[]).slice(0, shown)} isAr={isAr} methodLabel={(m) => t(`paymentMethods.${m}`, { defaultValue: m })} categoryLabel={(c) => t(`paymentCategories.${c}`, { defaultValue: c })} branchName={branchName} />
          ) : (
            <ActivityBody rows={(rows as ActivityRow[]).slice(0, shown)} isAr={isAr} actionLabel={(a) => t(`auditLogs.actions.${a}`, { defaultValue: a })} moduleLabel={(m) => t(`moduleNames.${m}`, { defaultValue: m })} canOpen={hasPermission("auditLogs.view")} onOpen={navigate} />
          )}
          {rows.length > shown && (
            <div className="rc-more no-print">
              <button type="button" className="rc-btn" onClick={() => setShown((n) => n + STEP)}>
                {L(`عرض المزيد (${rows.length - shown} متبقي)`, `Show more (${rows.length - shown} left)`)}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------- The open report's rows ---------- */

function DocumentsBody({ rows, isAr, onOpen }: { rows: DocumentRow[]; isAr: boolean; onOpen: (r: DocumentRow) => void }) {
  const buckets: { key: string; label: string; tone: string; has: (n: number | null) => boolean }[] = [
    { key: "expired", label: isAr ? "منتهية" : "Expired", tone: "bad", has: (n) => n !== null && n < 0 },
    { key: "week", label: isAr ? "خلال 7 أيام" : "Within 7 days", tone: "warn", has: (n) => n !== null && n >= 0 && n <= 7 },
    { key: "month", label: isAr ? "خلال 30 يوم" : "Within 30 days", tone: "gold", has: (n) => n !== null && n > 7 && n <= 30 },
    { key: "valid", label: isAr ? "سارية" : "Valid", tone: "ok", has: (n) => n !== null && n > 30 },
  ];
  return (
    <div>
      {buckets.map((bk) => {
        const list = rows.filter((r) => bk.has(daysFromToday(r.expiryDate)));
        if (!list.length) return null;
        return (
          <div key={bk.key}>
            <div className={`rp-bucket rp-${bk.tone}`}>
              <i />
              {bk.label}
              <span>{isAr ? `${list.length} وثيقة` : `${list.length} documents`}</span>
            </div>
            {list.map((r) => {
              const company = r.sourceType === "COMPANY_DOCUMENT";
              const Icon = (company ? COMPANY_DOCUMENT_CATEGORY_ICONS[r.kind] : EMPLOYEE_DOCUMENT_TYPE_ICONS[r.kind]) ?? FileText;
              const branch = localized(r.branch, r.branchEn);
              return (
                <button key={`${r.sourceType}-${r.recordId}`} type="button" className="rc-line" onClick={() => onOpen(r)}>
                  <span className="rc-kico" style={{ ["--kc" as string]: kindColor(r.kind) }}>
                    <Icon />
                  </span>
                  <span className="t">
                    <b>{(isAr ? r.owner : r.ownerEn) || "—"}</b>
                    <small>
                      {isAr ? r.kindAr : r.kindEn}
                      {r.documentNumber && (
                        <>
                          {" · "}
                          <span className="rp-mono">{r.documentNumber}</span>
                        </>
                      )}
                      {branch && !company && ` · ${branch}`}
                    </small>
                  </span>
                  <span className="when">
                    <b className="rp-num">{dmy(r.expiryDate)}</b>
                    <small>
                      {weekday(r.expiryDate)} · {hijri(r.expiryDate)}
                    </small>
                  </span>
                  <LeftPill days={daysFromToday(r.expiryDate)} />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function EmployeesBody({ rows, isAr, onOpen, statusLabel, branchName }: { rows: EmployeeRow[]; isAr: boolean; onOpen: (id: string) => void; statusLabel: (s: string) => string; branchName: (a?: string | null, e?: string | null) => string | null | undefined }) {
  const groups = new Map<string, EmployeeRow[]>();
  rows.forEach((r) => {
    const k = branchName(r.branch, r.branchEn) || (isAr ? "بدون مؤسسة" : "No establishment");
    groups.set(k, [...(groups.get(k) ?? []), r]);
  });
  return (
    <div>
      {[...groups.entries()].map(([name, list]) => (
        <div key={name}>
          <div className="rp-bucket rp-pri">
            <i />
            {name}
            <span>{isAr ? `${list.length} موظف` : `${list.length} employees`}</span>
          </div>
          {list.map((r) => (
            <button key={r.id} type="button" className="rc-line" onClick={() => onOpen(r.id)}>
              <Initials name={(isAr ? r.fullName : r.fullNameEn) || r.employeeNumber} />
              <span className="t">
                <b>{(isAr ? r.fullName : r.fullNameEn) || "—"}</b>
                <small>{[localized(r.jobTitle, r.jobTitleEn), r.employeeNumber, statusLabel(r.employmentStatus)].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="when">
                <b className="rp-num">{r.iqamaExpiryDate ? dmy(r.iqamaExpiryDate) : "—"}</b>
                <small>{isAr ? "انتهاء الإقامة" : "Iqama expiry"}</small>
              </span>
              <LeftPill days={daysFromToday(r.iqamaExpiryDate)} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function PaymentsBody({ rows, isAr, methodLabel, categoryLabel, branchName }: { rows: PaymentRow[]; isAr: boolean; methodLabel: (m: string) => string; categoryLabel: (c: string) => string; branchName: (a?: string | null, e?: string | null) => string | null | undefined }) {
  const days = groupByDay(rows, (r) => r.paymentDate);
  return (
    <div>
      {days.map((g) => (
        <div key={dayKey(g.day)}>
          <DayHeader
            day={g.day}
            right={
              <>
                <b className="rp-num">{formatCurrency(g.items.reduce((n, p) => n + Number(p.total || 0), 0))}</b>
                {isAr ? `${g.items.length} دفعة` : `${g.items.length} payments`}
              </>
            }
          />
          {g.items.map((p) => (
            <div key={p.paymentNumber} className="rc-line">
              <span className="rc-kico" style={{ ["--kc" as string]: "var(--vio)" }}>
                <Wallet />
              </span>
              <span className="t">
                <b>{categoryLabel(p.category)}</b>
                <small>{[<span key="n" className="rp-mono">{p.paymentNumber}</span>, branchName(p.branch, p.branchEn), isAr ? p.employee : p.employeeEn].filter(Boolean).map((x, i) => (i ? <span key={i}> · {x}</span> : x))}</small>
              </span>
              <span className="when">
                <b className="rp-num">{formatCurrency(p.total)}</b>
                <small>{methodLabel(p.method)}</small>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ActivityBody({ rows, isAr, actionLabel, moduleLabel, canOpen, onOpen }: { rows: ActivityRow[]; isAr: boolean; actionLabel: (a: string) => string; moduleLabel: (m: string) => string; canOpen: boolean; onOpen: (p: string) => void }) {
  const days = groupByDay(rows, (r) => r.date);
  const path = (r: ActivityRow) => {
    if (!canOpen || !r.recordId || r.action === "DELETE") return null;
    if (r.module === "employees") return `/employees/${r.recordId}`;
    if (r.module === "companyDocuments" || r.module === "licenses") return `/company-documents/${r.recordId}`;
    if (r.module === "branches") return `/branches/${r.recordId}`;
    return null;
  };
  return (
    <div>
      {days.map((g) => (
        <div key={dayKey(g.day)}>
          <DayHeader
            day={g.day}
            right={
              <>
                <b>{g.items.length}</b>
                {isAr ? "عملية" : "actions"}
              </>
            }
          />
          <div className="rc-tl">
            {g.items.map((r, i) => {
              const a = actionLook(r.action);
              const p = path(r);
              return (
                <div key={i} className="rc-ev">
                  <span className="dot" style={{ ["--c" as string]: a.c, ["--t" as string]: `color-mix(in srgb, ${a.c} 13%, var(--surf))` }}>
                    <a.icon />
                  </span>
                  <div className="rc-ev-card">
                    <div className="rc-ev-top">
                      <span className="rp-pill nodot" style={{ ["--c" as string]: a.c, ["--t" as string]: `color-mix(in srgb, ${a.c} 13%, var(--surf))` }}>
                        {actionLabel(r.action)}
                      </span>
                      <b>{moduleLabel(r.module)}</b>
                      <span className="time">{timeOf(r.date)}</span>
                    </div>
                    {r.description && <p className="rc-ev-desc">{r.description}</p>}
                    <div className="rc-ev-foot">
                      <Initials name={r.user} />
                      <span>{r.user}</span>
                      {p && (
                        <button type="button" className="rc-btn" style={{ height: 24 }} onClick={() => onOpen(p)}>
                          {isAr ? "فتح السجل" : "Open record"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
