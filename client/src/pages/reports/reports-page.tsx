import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, ArrowDownToLine, Bell, Clock, Eye, FileText, Printer, Users, Wallet, type LucideIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { reportsApi } from "@/api/reports";
import { openPdfInNewTab } from "@/lib/download";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { tr } from "@/i18n";
import { localized } from "@/lib/names";

/* Reports in the Pearl design, as in the approved preview: a tile per report
   in its own colour with PDF, Excel and print; a tile opens its data below. */

type EmployeeRow = { employeeNumber: string; fullName: string; fullNameEn: string; department: string | null; departmentEn: string | null; branch: string | null; branchEn: string | null; employmentStatus: string; iqamaExpiryDate: string | null; iqamaStatus: string | null };
type DocumentRow = { label: string; labelEn: string; sourceType: string; employeeName: string | null; employeeNameEn: string | null; expiryDate: string; status: string };
type PaymentRow = { paymentNumber: string; paymentDate: string; category: string; branch: string | null; branchEn: string | null; total: number };
type ActivityRow = { date: string; user: string; action: string; module: string; description: string | null };

type Report = "employees" | "documents" | "payments" | "activity";
interface Tile {
  id: string;
  report: Report;
  params: Record<string, unknown>;
  tone: string;
  icon: LucideIcon;
  title: [string, string];
  text: [string, string];
}

const TILES: Tile[] = [
  { id: "expired", report: "documents", params: { status: "EXPIRED" }, tone: "rose", icon: Bell, title: ["الوثائق المنتهية", "Expired documents"], text: ["كل وثيقة انتهت ويلزم تجديدها، مع صاحبها وتاريخ انتهائها.", "Every document that has ended and needs renewing."] },
  { id: "soon", report: "documents", params: { status: "EXPIRING_SOON" }, tone: "amber", icon: Clock, title: ["الوثائق القريبة من الانتهاء", "Documents ending soon"], text: ["ما ينتهي قريبًا لتبدأ تجديده قبل موعده.", "What ends soon, so you can renew it in time."] },
  { id: "employees", report: "employees", params: {}, tone: "indigo", icon: Users, title: ["بيانات الموظفين", "Employees"], text: ["القسم والمؤسسة والحالة وتاريخ انتهاء الإقامة لكل موظف.", "Department, establishment, status and iqama expiry for everyone."] },
  { id: "documents", report: "documents", params: {}, tone: "sky", icon: FileText, title: ["كل الوثائق", "All documents"], text: ["وثائق الموظفين والشركة وحالة كل منها.", "Employee and company documents with their status."] },
  { id: "payments", report: "payments", params: {}, tone: "violet", icon: Wallet, title: ["المدفوعات", "Payments"], text: ["ما صُرف في كل بند وكل مؤسسة.", "What was spent on each category and establishment."] },
  { id: "activity", report: "activity", params: {}, tone: "teal", icon: Activity, title: ["سجل النشاط", "Activity log"], text: ["من أضاف أو عدّل ماذا ومتى.", "Who added or changed what, and when."] },
];

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const [params] = useSearchParams();
  const initial = (() => {
    const tab = params.get("tab");
    const status = params.get("status");
    if (tab === "documents") return status === "EXPIRED" ? "expired" : status === "EXPIRING_SOON" ? "soon" : "documents";
    return TILES.some((x) => x.id === tab) ? (tab as string) : null;
  })();
  const [open, setOpen] = useState<string | null>(initial);
  const preview = useRef<HTMLDivElement>(null);
  const tile = TILES.find((x) => x.id === open) ?? null;

  const { data, isFetching } = useQuery({
    queryKey: ["reports", tile?.report, tile?.params],
    queryFn: () => reportsApi[tile!.report].fetch(tile!.params),
    enabled: Boolean(tile),
  });
  useEffect(() => {
    if (tile) setTimeout(() => preview.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, [tile]);

  const pdf = (x: Tile) => void reportsApi[x.report].export(x.params, "pdf");
  const excel = (x: Tile) => void reportsApi[x.report].export(x.params, "xlsx");
  const print = (x: Tile) => void openPdfInNewTab(`/reports/${x.report}`, { ...x.params, format: "pdf" }, `${x.report}-report.pdf`).catch(() => undefined);
  const rows = (data as unknown[]) ?? [];

  return (
    <>
      <PageHeader title={tr("التقارير", "Reports")} description={tr("اطبع أو صدّر أي تقرير بضغطة", "Print or export any report in one click")} />

      <div className="lu-cards">
        {TILES.map((x, j) => {
          const Icon = x.icon;
          return (
            <section key={x.id} className={cn("lu-cc lu-rise lu-tilt lu-tile", `lt-${x.tone}`)} style={{ ["--i" as string]: j }}>
              <span className="lu-sq lu-big">
                <Icon />
              </span>
              <button type="button" className="text-start" onClick={() => setOpen(open === x.id ? null : x.id)}>
                <h2 className="font-head text-base font-semibold">{isAr ? x.title[0] : x.title[1]}</h2>
                <p>{isAr ? x.text[0] : x.text[1]}</p>
              </button>
              <div className="btns">
                <button type="button" className="lu-sbtn pri" onClick={() => pdf(x)}>
                  <ArrowDownToLine className="h-4 w-4" /> PDF
                </button>
                <button type="button" className="lu-sbtn" onClick={() => excel(x)}>
                  Excel
                </button>
                <button type="button" className="lu-sbtn" onClick={() => print(x)}>
                  <Printer className="h-4 w-4" /> {t("common.print", { defaultValue: "طباعة" })}
                </button>
                <button type="button" className={cn("lu-sbtn", open === x.id && "pri")} style={{ flex: "none", width: 44 }} onClick={() => setOpen(open === x.id ? null : x.id)} aria-label={isAr ? "عرض البيانات" : "Show data"} aria-pressed={open === x.id}>
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {tile && (
        <section ref={preview} className={cn("lu-cc lu-rise in", `lt-${tile.tone}`)}>
          <div className="lu-hd">
            <h2>{isAr ? tile.title[0] : tile.title[1]}</h2>
            <span className="lu-note">{isFetching ? tr("جارٍ التحميل…", "Loading…") : tr(`${rows.length} سجل`, `${rows.length} records`)}</span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl bg-[var(--l-surface)]">
            {!isFetching && rows.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> {tr("لا توجد بيانات في هذا التقرير", "This report is empty")}
              </div>
            ) : tile.report === "employees" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("الرقم الوظيفي", "Employee No.")}</TableHead>
                    <TableHead>{tr("اسم الموظف", "Name")}</TableHead>
                    <TableHead>{tr("القسم", "Department")}</TableHead>
                    <TableHead>{tr("المؤسسة", "Establishment")}</TableHead>
                    <TableHead>{tr("الحالة", "Status")}</TableHead>
                    <TableHead>{tr("انتهاء الإقامة", "Iqama expiry")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as EmployeeRow[]).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs font-semibold">{r.employeeNumber}</TableCell>
                      <TableCell className="font-semibold">{isAr ? r.fullName : r.fullNameEn}</TableCell>
                      <TableCell className="text-xs">{localized(r.department, r.departmentEn) ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{localized(r.branch, r.branchEn) ?? "—"}</TableCell>
                      <TableCell className="text-xs">{t(`status.${r.employmentStatus}`, { defaultValue: r.employmentStatus })}</TableCell>
                      <TableCell>
                        <span className="me-2 font-mono text-xs">{formatDate(r.iqamaExpiryDate)}</span>
                        <StatusBadge status={r.iqamaStatus as never} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : tile.report === "documents" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("الوثيقة", "Document")}</TableHead>
                    <TableHead>{tr("المصدر", "Source")}</TableHead>
                    <TableHead>{tr("الموظف", "Employee")}</TableHead>
                    <TableHead>{tr("تاريخ الانتهاء", "Expiry")}</TableHead>
                    <TableHead>{tr("الحالة", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as DocumentRow[]).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold">{isAr ? r.label : r.labelEn}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t(`reportSourceTypes.${r.sourceType}`, { defaultValue: r.sourceType })}</TableCell>
                      <TableCell className="text-xs">{(isAr ? r.employeeName : r.employeeNameEn) ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDate(r.expiryDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status as never} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : tile.report === "payments" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("رقم الدفعة", "Payment No.")}</TableHead>
                    <TableHead>{tr("التاريخ", "Date")}</TableHead>
                    <TableHead>{tr("البند", "Category")}</TableHead>
                    <TableHead>{tr("المؤسسة", "Establishment")}</TableHead>
                    <TableHead>{tr("الإجمالي", "Total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as PaymentRow[]).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs font-semibold">{r.paymentNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDate(r.paymentDate)}</TableCell>
                      <TableCell className="text-xs">{t(`paymentCategories.${r.category}`, { defaultValue: r.category })}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{localized(r.branch, r.branchEn) ?? "—"}</TableCell>
                      <TableCell className="font-mono font-semibold">{formatCurrency(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("التاريخ", "Date")}</TableHead>
                    <TableHead>{tr("المستخدم", "User")}</TableHead>
                    <TableHead>{tr("الإجراء", "Action")}</TableHead>
                    <TableHead>{tr("القسم", "Module")}</TableHead>
                    <TableHead>{tr("التفاصيل", "Details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as ActivityRow[]).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-xs font-semibold">{r.user}</TableCell>
                      <TableCell className="text-xs">{t(`auditLogs.actions.${r.action}`, { defaultValue: r.action })}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t(`moduleNames.${r.module}`, { defaultValue: r.module })}</TableCell>
                      <TableCell className="text-xs">{r.description ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      )}
    </>
  );
}
