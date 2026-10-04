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

export function DeclarationViolationReports() {
  const isAr = useTranslation().i18n.language.startsWith("ar");
  const L = (ar: string, en: string) => isAr ? ar : en;
  const has = useAuthStore(s => s.hasPermission);
  const [kind, setKind] = useState<"tax" | "violations" | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [type, setType] = useState("all");
  const [quarter, setQuarter] = useState("all");
  const [owner, setOwner] = useState("all");
  const [category, setCategory] = useState<NonNullable<ViolationQuery["state"]>>("all");
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const panel = useRef<HTMLElement>(null);
  function openReport(next: "tax" | "violations") { setKind(next); setTimeout(() => panel.current?.scrollIntoView({behavior:"smooth",block:"start"}),120); }
  useEffect(() => { if(kind) panel.current?.scrollIntoView({behavior:"smooth",block:"start"}); },[kind]);
  const exportParams = kind === "tax" ? {year:Number(year),...(type!=="all"?{kind:type}:{}),...(type!=="ZAKAT"&&quarter!=="all"?{quarter:Number(quarter)}:{}),...(owner!=="all"?{ownerName:owner}:{})} : {state:category};
  const exportPath = kind === "tax" ? "/reports/tax-declarations" : "/reports/violations";
  const exportReport = (format: "pdf" | "xlsx") => void downloadFile(exportPath,{...exportParams,format},`report.${format}`).catch(()=>undefined);
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
  const selectClass = "rounded-xl border bg-background p-2.5";
  return <>
      {([{ id: "tax" as const, allowed: has("taxReturns.view"), title: L("الإقرارات الضريبية والزكاة", "Tax and zakat declarations"), text: L("اختيار المالك والسنة والربع، ومعاينة قبل الطباعة", "Owner, year and quarter filters with print preview"), Icon: FileText }, { id: "violations" as const, allowed: has("violations.view"), title: L("تقرير المخالفات", "Violations report"), text: L("الكل · متأخرة · مفتوحة · تم الاعتراض · منتهية", "All · overdue · open · objected · completed"), Icon: ShieldAlert }]).filter(x => x.allowed).map(x => <article className="rc-rp rp-rise" aria-current={kind === x.id} key={x.id} style={{ ["--c" as string]: x.id === "tax" ? "var(--pri)" : "var(--warn)" }}><button className="rc-rp-hd" type="button" onClick={() => { openReport(x.id); }}><span className="rc-rp-ico"><x.Icon /></span><span className="t"><b>{x.title}</b><small>{x.text}</small></span><ChevronLeft className="go" /></button><div className="rc-rp-fig"><b>{x.id === "tax" ? tax.data?.length ?? "—" : violations.data?.length ?? "—"}</b><small>{x.id === "tax" ? L("إقرار في السنة المختارة", "declarations in selected year") : L("مخالفة حسب التصنيف", "violations in selected category")}</small></div><div className="rc-rp-ft"><button className="rc-btn pri" type="button" disabled={!has("reports.export")} onClick={() => openReport(x.id)}><ArrowDownToLine />PDF</button><button className="rc-btn" type="button" disabled={!has("reports.export")} onClick={() => openReport(x.id)}><FileSpreadsheet />Excel</button><span className="sp" /><button className="rc-btn" type="button" aria-pressed={kind === x.id} onClick={() => openReport(x.id)}>{L("عرض البيانات", "Show data")}</button></div></article>)}
    {kind && has(kind === "tax" ? "taxReturns.view" : "violations.view") && <section ref={panel} className="rc-dcard rc-rpanel mt-5 p-5" style={{gridColumn:"1 / -1"}}><h2>{title}</h2><div className="my-4 flex flex-wrap gap-4">
      {kind === "tax" ? <><label>{L("المالك", "Owner")}<select className={selectClass} value={owner} onChange={e => { setReady(false); setOwner(e.target.value); }}><option value="all">{L("جميع الملاك", "All owners")}</option>{owners.map(name => <option key={name}>{name}</option>)}</select></label><label>{L("السنة", "Year")}<input className={selectClass} type="number" min="2000" max="2100" value={year} onChange={e => { setReady(false); setYear(e.target.value); setOwner("all"); }} /></label><label>{L("نوع الإقرار", "Declaration type")}<select className={selectClass} value={type} onChange={e => { setReady(false); setType(e.target.value); }}><option value="all">{L("القيمة المضافة والزكاة", "VAT and zakat")}</option><option value="VAT">{L("القيمة المضافة", "VAT")}</option><option value="ZAKAT">{L("الزكاة", "Zakat")}</option></select></label>{type !== "ZAKAT" && <label>{L("الربع", "Quarter")}<select className={selectClass} value={quarter} onChange={e => { setReady(false); setQuarter(e.target.value); }}><option value="all">{L("جميع الأرباع", "All quarters")}</option>{[1,2,3,4].map(q => <option key={q} value={q}>{L("الربع", "Quarter")} {q}</option>)}</select></label>}</> : <label>{L("التصنيف", "Category")}<select className={selectClass} value={category} onChange={e => { setReady(false); setCategory(e.target.value as typeof category); }}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
    </div><p className="text-sm text-muted-foreground">{kind === "tax" ? L("الزكاة سنوية؛ فلتر الربع يخص القيمة المضافة. عند اختيار النوعين تظهر الزكاة السنوية لنفس السنة أيضًا.", "Zakat is annual. Quarter filtering applies only to VAT; combined reports include annual zakat for the same year.") : L("التصنيفات تعتمد حالات النظام: المنتهية تشمل السداد وقبول الاعتراض والتنفيذ؛ رفض الاعتراض لا ينهي المخالفة.", "Categories use application states: completed includes paid, accepted objections and applied penalties; rejection does not close a violation.")}</p>
      {active.isFetching ? <p role="status">{L("جارٍ تحميل جميع سجلات التقرير…", "Loading all report records…")}</p> : active.isError ? <p role="alert">{getErrorMessage(active.error)}</p> : <><div className="my-4 flex gap-3"><button className="rc-btn pri" type="button" disabled={!ready || !rows.length || !has("reports.export")} onClick={printReport}><Printer />{L("فتح PDF للطباعة", "Open PDF for printing")}</button><button className="rc-btn pri" type="button" disabled={!ready || !rows.length || !has("reports.export")} onClick={() => exportReport("pdf")}>PDF</button><button className="rc-btn" type="button" disabled={!ready || !rows.length || !has("reports.export")} onClick={() => exportReport("xlsx")}>Excel</button><span>{rows.length} {L("سجل", "records")}</span></div><iframe key={document} ref={frame} title={title} srcDoc={document} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} className="h-[650px] w-full rounded-xl border bg-white" /></>}
    </section>}
  </>;
}
