import { Seg } from "@/components/royal/cards";
import { Initials } from "@/components/royal/rp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, ChevronLeft, FileSpreadsheet, FileText, Printer, ShieldAlert } from "lucide-react";
import { taxReturnsApi } from "@/api/taxReturns";
import { violationsApi, type ViolationQuery } from "@/api/violations";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { collectReportPages, buildReportDocument } from "./print-report-utils";

export function DeclarationViolationReports({ kind, onKindChange }: { kind: "tax" | "violations" | null; onKindChange: (kind: "tax" | "violations" | null) => void }) {
  const isAr = useTranslation().i18n.language.startsWith("ar");
  const L = (ar: string, en: string) => isAr ? ar : en;
  const has = useAuthStore(s => s.hasPermission);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [type, setType] = useState("all");
  const [quarter, setQuarter] = useState("all");
  const [owner, setOwner] = useState("all");
  const [category, setCategory] = useState<NonNullable<ViolationQuery["state"]>>("all");
  const [showPreview, setShowPreview] = useState(false);
  const [shown, setShown] = useState(120);
  useEffect(() => { setShowPreview(false); setShown(120); }, [kind, year, type, quarter, owner, category]);
  const frame = useRef<HTMLIFrameElement>(null);
  const panel = useRef<HTMLElement>(null);
  function openReport(next: "tax" | "violations") { onKindChange(kind === next ? null : next); }
  useEffect(() => { if (!kind) return; const timer = setTimeout(() => panel.current?.scrollIntoView({behavior:"smooth",block:"start"}),120); return () => clearTimeout(timer); },[kind]);
  const exportParams = kind === "tax" ? {year:Number(year),...(type!=="all"?{kind:type}:{}),...(type!=="ZAKAT"&&quarter!=="all"?{quarter:Number(quarter)}:{}),...(owner!=="all"?{ownerName:owner}:{})} : {state:category};
  const exportPath = kind === "tax" ? "/reports/tax-declarations" : "/reports/violations";
  const exportReport = (format: "pdf" | "xlsx", target: "tax" | "violations" = kind ?? "tax") => {
    const params = target === "tax" ? { year: Number(year), ...(type !== "all" ? {kind:type} : {}), ...(type !== "ZAKAT" && quarter !== "all" ? {quarter:Number(quarter)} : {}), ...(owner !== "all" ? {ownerName:owner} : {}) } : {state:category};
    return void downloadFile(target === "tax" ? "/reports/tax-declarations" : "/reports/violations", {...params,format}, `${target}-report.${format}`).catch(() => undefined);
  };
  const printReport = () => void openPdfInNewTab(exportPath,{...exportParams,format:"pdf"},"report.pdf").catch(()=>undefined);

  const tax = useQuery({ queryKey: ["print-reports", "tax", year], enabled: kind === "tax" && has("taxReturns.view"), queryFn: () => collectReportPages(page => taxReturnsApi.list({ year: Number(year), page, pageSize: 100 })) });
  const violations = useQuery({ queryKey: ["print-reports", "violations", category], enabled: kind === "violations" && has("violations.view"), queryFn: () => collectReportPages(page => violationsApi.list({ state: category, page, pageSize: 100 })) });
  const active = kind === "tax" ? tax : violations;
  const owners = [...new Set((tax.data ?? []).map(r => r.ownerName).filter((v): v is string => !!v))].sort();
  const taxRows = (tax.data ?? []).filter(r => (owner === "all" || r.ownerName === owner) && (type === "all" || r.kind === type) && (r.kind === "ZAKAT" || quarter === "all" || r.quarter === Number(quarter)));
  const violationRows = violations.data ?? [];
  const title = kind === "tax" ? L("تقرير الإقرارات الضريبية والزكاة", "Tax and zakat declarations report") : L("تقرير المخالفات", "Violations report");
  const categories = { all: L("الكل", "All"), overdue: L("متأخرة", "Overdue"), open: L("مفتوحة", "Open"), objection: L("تم الاعتراض", "Objected"), done: L("منتهية", "Completed") };
  const statuses: Record<string, string> = { DRAFT: L("مسودة", "Draft"), FILED: L("تم التقديم", "Filed"), PAID: L("تم السداد", "Paid"), NEW: L("جديدة", "New"), OBJECTION: L("تم الاعتراض", "Objected"), ACCEPTED: L("تم قبول الاعتراض", "Objection accepted"), REJECTED: L("تم رفض الاعتراض", "Objection rejected"), OPEN: L("مفتوحة", "Open"), APPLIED: L("تم التنفيذ", "Applied"), OVERDUE: L("متأخرة", "Overdue") };
  const taxHeaders = [L("المالك", "Owner"), L("المنشآت", "Establishments"), L("النوع", "Type"), L("الفترة", "Period"), L("المبلغ", "Amount"), L("الغرامة", "Penalty"), L("الحالة", "Status")];
  const violationHeaders = [L("رقم المخالفة", "Number"), L("الجهة", "Authority"), L("المنشأة / الموظف", "Establishment / employee"), L("المخالفة", "Reason"), L("موعد السداد", "Payment deadline"), L("القيمة", "Amount"), L("الحالة", "Status")];
  const rows = kind === "tax" ? taxRows.map(r => [r.ownerName || "—", r.selectedBranches?.map(b => b.nameSnapshot).join("، ") || r.branch?.name || L("عام للشركة", "Company-wide"), r.kind === "VAT" ? L("القيمة المضافة", "VAT") : L("الزكاة", "Zakat"), r.kind === "VAT" ? `${r.year} / Q${r.quarter ?? "—"}` : `${r.year} / ${L("سنوي", "Annual")}`, formatCurrency(r.amount), formatCurrency(r.penalty), statuses[r.status] || r.status]) : violationRows.map(r => [r.number || "—", r.authorityLabel || r.authorityName || "—", r.branch?.name || r.employee?.fullNameAr || "—", r.reason, r.payDeadline || "—", formatCurrency(r.amount), statuses[r.state] || r.state]);
  const total = kind === "tax" ? taxRows.reduce((n, r) => n + r.amount, 0) : violationRows.reduce((n, r) => n + r.amount, 0);
  const subtitle = kind === "tax" ? `${L("المالك", "Owner")}: ${owner === "all" ? L("جميع الملاك", "All owners") : owner} · ${year} · ${type === "ZAKAT" ? L("سنوي", "Annual") : quarter === "all" ? L("جميع الأرباع", "All quarters") : `Q${quarter}`}` : `${L("التصنيف", "Category")}: ${categories[category]}`;
  const document = buildReportDocument({ title, subtitle, headers: kind === "tax" ? taxHeaders : violationHeaders, rows, total: formatCurrency(total), isAr });
  return <>
      {([{ id: "tax" as const, allowed: has("taxReturns.view"), title: L("الإقرارات الضريبية والزكاة", "Tax and zakat declarations"), text: L("اختيار المالك والسنة والربع، ومعاينة قبل الطباعة", "Owner, year and quarter filters with print preview"), Icon: FileText }, { id: "violations" as const, allowed: has("violations.view"), title: L("تقرير المخالفات", "Violations report"), text: L("الكل · متأخرة · مفتوحة · تم الاعتراض · منتهية", "All · overdue · open · objected · completed"), Icon: ShieldAlert }]).filter(x => x.allowed).map(x => <article className="rc-rp rp-rise" aria-current={kind === x.id} key={x.id} style={{ ["--c" as string]: x.id === "tax" ? "var(--pri)" : "var(--warn)" }}><button className="rc-rp-hd" type="button" onClick={() => { openReport(x.id); }}><span className="rc-rp-ico"><x.Icon /></span><span className="t"><b>{x.title}</b><small>{x.text}</small></span><ChevronLeft className="go" /></button><div className="rc-rp-fig"><b>{x.id === "tax" ? tax.data?.length ?? "—" : violations.data?.length ?? "—"}</b><small>{x.id === "tax" ? L("إقرار في السنة المختارة", "declarations in selected year") : L("مخالفة حسب التصنيف", "violations in selected category")}</small></div><div className="rc-rp-ft"><button className="rc-btn pri" type="button" disabled={!has("reports.export")} onClick={() => exportReport("pdf", x.id)}><ArrowDownToLine />PDF</button><button className="rc-btn" type="button" disabled={!has("reports.export")} onClick={() => exportReport("xlsx", x.id)}><FileSpreadsheet />Excel</button><span className="sp" /><button className="rc-btn" type="button" aria-pressed={kind === x.id} onClick={() => openReport(x.id)}>{L("عرض البيانات", "Show data")}</button></div></article>)}
    {kind && has(kind === "tax" ? "taxReturns.view" : "violations.view") && <section ref={panel} className="rc-dcard rc-rpanel rp-rise" style={{gridColumn:"1 / -1", ["--c" as string]: kind === "tax" ? "var(--pri)" : "var(--warn)"}}>
      <h2><span className="ico">{kind === "tax" ? <FileText /> : <ShieldAlert />}</span>{title}<span className="r">{active.isFetching ? L("جارٍ التحميل…", "Loading…") : L(`${rows.length} سجل`, `${rows.length} records`)}</span></h2>
      <div className="rc-rp-tools no-print">
        {kind === "tax" ? <>
          <Select value={owner} onValueChange={setOwner}><SelectTrigger className="h-[38px] w-56 shrink-0 rounded-[11px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold" aria-label={L("المالك", "Owner")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{L("جميع الملاك", "All owners")}</SelectItem>{owners.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select>
          <div className="rc-range"><label>{L("السنة", "Year")}<input type="number" min="2000" max="2100" value={year} onChange={e => { setYear(e.target.value); setOwner("all"); }} /></label></div>
          <Seg label={L("النوع", "Type")} value={type} onChange={setType} items={[{value:"all",label:L("الكل", "All")},{value:"VAT",label:L("القيمة المضافة", "VAT")},{value:"ZAKAT",label:L("الزكاة", "Zakat")}]} />
          {type !== "ZAKAT" && <Seg label={L("الربع", "Quarter")} value={quarter} onChange={setQuarter} items={[{value:"all",label:L("الكل", "All")}, ...[1,2,3,4].map(q => ({value:String(q),label:L(`الربع ${q}`,`Q${q}`)}))]} />}
        </> : <Seg label={L("التصنيف", "Category")} value={category} onChange={v => setCategory(v as typeof category)} items={Object.entries(categories).map(([value,label])=>({value,label}))} />}
        <span className="sp" />
        <button className="rc-btn pri" type="button" disabled={active.isFetching || active.isError || !rows.length || !has("reports.export")} onClick={() => exportReport("pdf")}><ArrowDownToLine />PDF</button>
        <button className="rc-btn" type="button" disabled={active.isFetching || active.isError || !rows.length || !has("reports.export")} onClick={() => exportReport("xlsx")}><FileSpreadsheet />Excel</button>
        <button className="rc-btn" type="button" disabled={active.isFetching || active.isError || !rows.length || !has("reports.export")} onClick={printReport}><Printer />{L("طباعة", "Print")}</button>
        <button className="rc-btn" type="button" aria-pressed={showPreview} disabled={active.isFetching || active.isError} onClick={() => setShowPreview(v => !v)}><FileText />{L("معاينة الطباعة", "Print preview")}</button>
      </div>
      {active.isFetching ? <div className="rc-none" role="status">{L("جارٍ التحميل…", "Loading…")}</div> : active.isError ? <div className="rc-none" role="alert">{getErrorMessage(active.error)}</div> : !rows.length ? <div className="rc-none">{L("لا توجد بيانات بهذا الفلتر", "Nothing matches this filter")}</div> : <div>
        {[...new Set(rows.slice(0,shown).map(row => kind === "tax" ? row[0] : row[6]))].map(group => <div key={group}><div className="rp-bucket rp-pri"><i />{group}<span>{rows.filter(row => (kind === "tax" ? row[0] : row[6]) === group).length} {L("سجل", "records")}</span></div>
          {rows.slice(0,shown).filter(row => (kind === "tax" ? row[0] : row[6]) === group).map((row,index) => <div className="rc-line" key={index}><Initials name={kind === "tax" ? row[1] : row[2]} /><span className="t"><b>{kind === "tax" ? row[1] : `${row[0]} · ${row[2]}`}</b><small>{kind === "tax" ? `${row[2]} · ${row[3]} · ${row[6]} · ${L("الغرامة", "Penalty")}: ${row[5]}` : `${row[1]} · ${row[3]} · ${L("موعد السداد", "Payment deadline")}: ${row[4]}`}</small></span><span className="when"><b className="rp-num">{kind === "tax" ? row[4] : row[5]}</b><small>{kind === "tax" ? L("مبلغ الإقرار", "Declaration amount") : row[6]}</small></span></div>)}
        </div>)}
        {rows.length > shown && <div className="rc-more no-print"><button className="rc-btn" type="button" onClick={() => setShown(n => n + 120)}>{L(`عرض المزيد (${rows.length-shown} متبقي)`, `Show more (${rows.length-shown} left)`)}</button></div>}
      </div>}
      <p className="px-4 py-3 text-xs text-muted-foreground">{kind === "tax" ? L("الزكاة سنوية؛ فلتر الربع يخص القيمة المضافة فقط.", "Zakat is annual; quarter filtering applies only to VAT.") : L("المنتهية تشمل السداد وقبول الاعتراض والتنفيذ؛ رفض الاعتراض لا ينهي المخالفة.", "Completed includes paid, accepted objections and applied penalties; rejection does not close a violation.")}</p>
      {showPreview && !active.isFetching && !active.isError && <iframe key={document} ref={frame} title={L("معاينة الطباعة", "Print preview")} srcDoc={document} sandbox="allow-same-origin allow-modals" className="h-[650px] w-full border-t bg-white" />}
    </section>}
  </>;
}
