import { useState } from "react";
import { localized, namePair } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, FileText, Files, Plus, Edit, RefreshCw, Trash2, FileDown, MoreHorizontal, Search, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeftPill, daysFromToday, dmy, leftTone, type Tone } from "@/components/royal/rp";
import { PxPager, PxStat, PxTabs } from "@/components/royal/px";
import { kindColor } from "@/components/royal/cards";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { workforceDocumentsApi, type WorkforceDocumentItem, type WorkforceQueryParams } from "@/api/workforceDocuments";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";
import { EMP_DOC_KINDS, empDocPath, kindOfDoc } from "./emp-doc-kinds";

/* Employee documents in the Royal card design, as in the approved preview:
   the status band, a tab per document type, then every document on its own
   card, or the same documents by kind or by month. */

export default function EmployeeDocumentsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState<string>(searchParams.get("category") || "");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = searchParams.get("status");
    return s === "VALID" || s === "EXPIRING_SOON" || s === "EXPIRED" ? s : "ALL";
  });
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [dialog, setDialog] = useState<{ open: boolean; docType?: any; document?: WorkforceDocumentItem | null }>({ open: false, document: null });
  const [deleteTarget, setDeleteTarget] = useState<WorkforceDocumentItem | null>(null);
  const pageSize = 60;

  const queryParams: WorkforceQueryParams = {
    page,
    pageSize,
    q: search || undefined,
    branchId: branchFilter !== "ALL" ? branchFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    category: category || undefined,
  };
  const { data, isLoading } = useQuery({ queryKey: ["workforce-documents-unified", queryParams], queryFn: () => workforceDocumentsApi.listUnified(queryParams) });
  const { data: counts = {} } = useQuery({ queryKey: ["workforce-category-counts"], queryFn: workforceDocumentsApi.categoryCounts });
  const { data: branches = [] } = useQuery({ queryKey: ["active-branches"], queryFn: listActiveBranches });

  function handleCategoryChange(next: string) {
    setCategory(next);
    setPage(1);
    setSearchParams(next ? { category: next } : {});
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await workforceDocumentsApi.remove(deleteTarget.id, deleteTarget.type);
      toast.success(isAr ? "تم حذف الوثيقة بنجاح" : "Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["workforce-documents-unified"] });
      queryClient.invalidateQueries({ queryKey: ["workforce-category-counts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const totalDocsCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);
  const stats = data?.stats || { total: totalDocsCount, valid: 0, expiringSoon: 0, expired: 0 };
  const rows = [...(data?.data ?? [])].sort((a, b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity) - (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity));
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const exportDocs = (format: "xlsx" | "pdf") => reportsApi.documents.export({ sourceType: "EMPLOYEE_DOCUMENT", category: category || undefined, status: statusFilter !== "ALL" ? statusFilter : undefined }, format);
  const openNew = () => setDialog({ open: true, docType: category || "IQAMA", document: null });
  const nameOf = (doc: WorkforceDocumentItem) => namePair(doc.fullNameAr || doc.employee?.fullNameAr, doc.fullNameEn || doc.employee?.fullNameEn, isAr).primary || "—";
  const branchOf = (doc: WorkforceDocumentItem) => localized(doc.branch?.name, doc.branch?.nameEn) || localized(doc.employee?.branch?.name, doc.employee?.branch?.nameEn);
  const labelOf = (doc: WorkforceDocumentItem) => {
    const { kind } = kindOfDoc(doc);
    return kind ? kind.one[isAr ? 0 : 1] : doc.name || (isAr ? "وثيقة" : "Document");
  };

  const kpis: [string, string, number, string, Tone][] = [
    ["ALL", isAr ? "إجمالي الوثائق" : "All documents", stats.total, isAr ? "لكل الموظفين" : "Across all employees", "pri"],
    ["EXPIRED", isAr ? "منتهية" : "Expired", stats.expired, isAr ? "جدّدها فورًا" : "Renew now", "bad"],
    ["EXPIRING_SOON", isAr ? "تنتهي قريبًا" : "Ending soon", stats.expiringSoon, isAr ? "جهّز التجديد" : "Get the renewal ready", "warn"],
    ["VALID", isAr ? "سارية" : "Valid", stats.valid, isAr ? "لا شيء مطلوب" : "Nothing to do", "ok"],
  ];

  return (
    <div className="px">
      <PageHeader
        title={t("employeeDocuments.title", { defaultValue: "مستندات الموظفين" })}
        description={isAr ? `${stats.total} وثيقة · ${stats.expired} منتهية و${stats.expiringSoon} تنتهي قريبًا` : `${stats.total} documents · ${stats.expired} expired, ${stats.expiringSoon} ending soon`}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-3xl p-2">
                <DropdownMenuItem className="rounded-2xl" onSelect={() => exportDocs("xlsx")}>
                  {t("employees.export.excel")}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl" onSelect={() => exportDocs("pdf")}>
                  {t("employees.export.pdf")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission("employees.create") && (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> {t("employeeDocuments.addDocument", { defaultValue: "إضافة وثيقة" })}
              </Button>
            )}
          </>
        }
      />

      <div className="px-stats">
        {kpis.map(([v, label, n, sub, tone], k) => (
          <PxStat
            key={v}
            i={k + 1}
            label={label}
            value={n}
            sub={sub}
            icon={[Files, AlertTriangle, Clock, CheckCircle2][k]}
            color={{ pri: "#0891b2", bad: "#dc2626", warn: "#d97706", ok: "#16a34a" }[tone as "pri" | "bad" | "warn" | "ok"]}
            active={statusFilter === v}
            onClick={() => {
              setStatusFilter(v);
              setPage(1);
            }}
          />
        ))}
      </div>

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <PxTabs
            label={isAr ? "نوع الوثيقة" : "Document type"}
            value={category}
            onChange={handleCategoryChange}
            items={[{ key: "", label: isAr ? "الكل" : "All", count: totalDocsCount }, ...EMP_DOC_KINDS.map((c) => ({ key: c.value as string, label: isAr ? c.labelAr : c.labelEn, count: counts[c.value] ?? 0 }))]}
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
              placeholder={isAr ? "ابحث في الوثائق" : "Search documents"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
          {branches.length > 0 && (
            <Select
              value={branchFilter}
              onValueChange={(v) => {
                setBranchFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-[38px] w-52 shrink-0 rounded-[10px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
                <SelectValue placeholder={isAr ? "جميع المؤسسات" : "All establishments"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isAr ? "جميع المؤسسات" : "All establishments"}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <bdi>{localized(b.name, b.nameEn)}</bdi>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{isAr ? "نوع الوثيقة" : "Document"}</th>
                <th>{isAr ? "صاحب الوثيقة" : "Holder"}</th>
                <th className="hm">{isAr ? "رقم الوثيقة" : "Number"}</th>
                <th>{isAr ? "تاريخ الانتهاء" : "Expiry"}</th>
                <th className="hm">{isAr ? "المتبقي" : "Left"}</th>
                <th>{isAr ? "الحالة" : "Status"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
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
                      <b>{t("employeeDocuments.emptyTitle", { defaultValue: "لا توجد وثائق بهذا الفلتر" })}</b>
                      {hasPermission("employees.create") && (
                        <div className="mt-3">
                          <Button onClick={openNew}>
                            <Plus className="h-4 w-4" /> {t("employeeDocuments.addDocument", { defaultValue: "إضافة وثيقة" })}
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((doc, j) => {
                  const { raw, kind } = kindOfDoc(doc);
                  const number = doc.documentNumber || doc.iqamaNumber || doc.passportNumber;
                  const branch = branchOf(doc);
                  const days = daysFromToday(doc.expiryDate);
                  const tone = leftTone(days);
                  const Icon = kind?.icon ?? FileText;
                  const canEdit = hasPermission("employees.edit") && !doc.linkedToIqama;
                  return (
                    <tr key={`${doc.type}-${doc.id}`} className="click" style={{ ["--j" as string]: j }} onClick={() => navigate(empDocPath(doc))}>
                      <td>
                        <div className="px-who">
                          <span className="px-av" style={{ color: kindColor(kind?.value ?? raw) }}>
                            <Icon style={{ width: 16, height: 16 }} />
                          </span>
                          <div>
                            <b>{labelOf(doc)}</b>
                            {doc.linkedToIqama && <small>{isAr ? "مرتبط بالإقامة" : "Follows the iqama"}</small>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <b>{nameOf(doc)}</b>
                        {branch && <small className="block text-[12.5px] text-[var(--l-muted)]">{branch}</small>}
                      </td>
                      <td className="hm mono">{number || "—"}</td>
                      <td className="mono">{doc.expiryDate ? dmy(doc.expiryDate) : "—"}</td>
                      <td className="hm">
                        <div className="px-bar" style={{ ["--c" as string]: `var(--l-${tone === "bad" ? "rose" : tone === "warn" ? "amber" : tone === "ok" ? "green" : "faint"})` }}>
                          <u style={{ width: `${days === null ? 0 : days <= 0 ? 100 : Math.max(4, Math.min(100, (days / 365) * 100))}%` }} />
                        </div>
                      </td>
                      <td>
                        <LeftPill days={days} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button type="button" className="px-btn" onClick={() => setDialog({ open: true, docType: raw, document: doc })}>
                              <RefreshCw /> {isAr ? "تجديد" : "Renew"}
                            </button>
                          )}
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="px-iconbtn" aria-label={t("common.actions")}>
                                  <MoreHorizontal />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                                {(doc.employeeId || doc.employee?.id) && (
                                  <DropdownMenuItem className="rounded-2xl" onSelect={() => navigate(`/employees/${doc.employeeId || doc.employee?.id}`)}>
                                    <User className="me-2 h-4 w-4" /> {isAr ? "ملف الموظف" : "Employee profile"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, docType: raw, document: doc })}>
                                  <Edit className="me-2 h-4 w-4" /> {t("common.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(doc)}>
                                  <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <PxPager page={page} pages={pages} total={data?.meta.total ?? 0} pageSize={pageSize} onChange={setPage} />
      </section>

      <WorkforceDocumentDialog
        open={dialog.open}
        docType={dialog.docType || category || "IQAMA"}
        document={dialog.document}
        queryKey="workforce-documents-unified"
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["workforce-category-counts"] })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("employeeDocuments.deleteConfirmTitle", { defaultValue: "تأكيد حذف الوثيقة؟" })}
        description={t("employeeDocuments.deleteConfirmBody", { defaultValue: "هل أنت متأكد من رغبتك في حذف هذا المستند من سجلات الموظف؟" })}
        onConfirm={handleDelete}
      />
    </div>
  );
}
