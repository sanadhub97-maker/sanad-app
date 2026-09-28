import { useState } from "react";
import { localized, namePair } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { FileText, CreditCard, BookUser, HeartPulse, ShieldPlus, Stamp, Plane, Plus, Eye, Edit, Trash2, FileDown, Copy, ExternalLink, Download, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LuEmpty, LuPager, daysLeft, docState, leftPct } from "@/components/lulu/lulu-ui";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { workforceDocumentsApi, type WorkforceDocumentItem, type WorkforceQueryParams } from "@/api/workforceDocuments";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";
import { WorkforceDocumentDetailsDialog } from "./workforce-document-details-dialog";

/* Employee documents in the Pearl design, as in the approved preview: status
   and type chips, then one row per document with its time left. */

const CATEGORIES = [
  { value: "IQAMA", labelAr: "الإقامات", labelEn: "Iqamas", icon: CreditCard },
  { value: "PASSPORT", labelAr: "جوازات السفر", labelEn: "Passports", icon: BookUser },
  { value: "HEALTH_CERTIFICATE", labelAr: "الشهادات الصحية", labelEn: "Health Certificates", icon: HeartPulse },
  { value: "MEDICAL_INSURANCE", labelAr: "التأمين الطبي", labelEn: "Medical Insurance", icon: ShieldPlus },
  { value: "VISA", labelAr: "التأشيرات", labelEn: "Visas", icon: Stamp },
  { value: "FLIGHT_TICKET", labelAr: "تذاكر الطيران", labelEn: "Flight Tickets", icon: Plane },
] as const;
const SINGULAR: Record<string, [string, string]> = {
  IQAMA: ["الإقامة", "Iqama"],
  PASSPORT: ["جواز السفر", "Passport"],
  HEALTH_CERTIFICATE: ["الشهادة الصحية", "Health certificate"],
  MEDICAL_INSURANCE: ["التأمين الطبي", "Medical insurance"],
  VISA: ["التأشيرة", "Visa"],
  FLIGHT_TICKET: ["تذكرة الطيران", "Flight ticket"],
};

export default function EmployeeDocumentsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [searchParams, setSearchParams] = useSearchParams();

  // Category from URL query param if present
  const initialCategory = searchParams.get("category") || "";
  const [category, setCategory] = useState<string>(initialCategory);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = searchParams.get("status");
    return s === "VALID" || s === "EXPIRING_SOON" || s === "EXPIRED" ? s : "ALL";
  });
  const [branchFilter, setBranchFilter] = useState<string>("ALL");

  const [dialog, setDialog] = useState<{
    open: boolean;
    docType?: any;
    document?: WorkforceDocumentItem | null;
  }>({ open: false, document: null });

  const [detailsDoc, setDetailsDoc] = useState<WorkforceDocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkforceDocumentItem | null>(null);
  const pageSize = 20;

  const queryParams: WorkforceQueryParams = {
    page,
    pageSize,
    q: search || undefined,
    branchId: branchFilter !== "ALL" ? branchFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    category: category || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["workforce-documents-unified", queryParams],
    queryFn: () => workforceDocumentsApi.listUnified(queryParams),
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["workforce-category-counts"],
    queryFn: workforceDocumentsApi.categoryCounts,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["active-branches"],
    queryFn: listActiveBranches,
  });

  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory);
    setPage(1);
    if (newCategory) {
      setSearchParams({ category: newCategory });
    } else {
      setSearchParams({});
    }
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

  function copyText(text?: string | null) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ للحافظة" : "Copied to clipboard");
  }

  const totalDocsCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

  const stats = data?.stats || {
    total: totalDocsCount,
    valid: 0,
    expiringSoon: 0,
    expired: 0,
  };

  const statusChips: [string, string, number, string][] = [
    ["ALL", isAr ? "الكل" : "All", stats.total, "sky"],
    ["EXPIRED", isAr ? "منتهية" : "Expired", stats.expired, "rose"],
    ["EXPIRING_SOON", isAr ? "تنتهي قريبًا" : "Ending soon", stats.expiringSoon, "amber"],
    ["VALID", isAr ? "سارية" : "Valid", stats.valid, "green"],
  ];
  const typeTone: Record<string, string> = { IQAMA: "sky", PASSPORT: "indigo", HEALTH_CERTIFICATE: "teal", MEDICAL_INSURANCE: "amber", VISA: "violet", FLIGHT_TICKET: "rose" };
  const rows = data?.data ?? [];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const exportDocs = (format: "xlsx" | "pdf") =>
    reportsApi.documents.export({ sourceType: "EMPLOYEE_DOCUMENT", category: category || undefined, status: statusFilter !== "ALL" ? statusFilter : undefined }, format);
  const openNew = () => setDialog({ open: true, docType: category || "IQAMA", document: null });

  return (
    <>
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

      <div className="flex flex-col gap-3">
        <div className="lu-tools no-print">
          <label className="lu-field">
            <Search />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isAr ? "الاسم أو رقم الوثيقة" : "Name or document number"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
          {statusChips.map(([v, label, n, tone]) => (
            <button
              key={v}
              type="button"
              aria-pressed={statusFilter === v}
              onClick={() => {
                setStatusFilter(v);
                setPage(1);
              }}
              className={cn("lu-fchip", `lt-${tone}`, statusFilter === v && "on")}
            >
              <i />
              {label} <span className="n lu-num">{n}</span>
            </button>
          ))}
          {branches.length > 0 && (
            <Select
              value={branchFilter}
              onValueChange={(v) => {
                setBranchFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-44 shrink-0 rounded-[14px] border-transparent bg-[var(--l-surface)] shadow-[var(--l-shadow)]">
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
        <div className="lu-tools no-print">
          <button type="button" aria-pressed={!category} onClick={() => handleCategoryChange("")} className={cn("lu-fchip lt-indigo", !category && "on")}>
            <i />
            {isAr ? "كل الأنواع" : "All types"} <span className="n lu-num">{totalDocsCount}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => handleCategoryChange(c.value)} className={cn("lu-fchip", `lt-${typeTone[c.value]}`, category === c.value && "on")}>
              <i />
              {isAr ? c.labelAr : c.labelEn} <span className="n lu-num">{counts[c.value] ?? 0}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="lu-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[70px] animate-pulse rounded-[18px] bg-card" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <LuEmpty
            title={t("employeeDocuments.emptyTitle", { defaultValue: "لا توجد وثائق بهذا الفلتر" })}
            action={
              hasPermission("employees.create") ? (
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> {t("employeeDocuments.addDocument", { defaultValue: "إضافة وثيقة" })}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="lu-list">
            {rows.map((doc, j) => {
              const rawType = (doc.type || (doc.iqamaNumber ? "IQAMA" : "PASSPORT")).toUpperCase();
              const found = CATEGORIES.find((c) => c.value === rawType || (rawType.includes("VISA") && c.value === "VISA"));
              const Icon = found?.icon ?? FileText;
              const typeLabel = found ? SINGULAR[found.value][isAr ? 0 : 1] : doc.name || (isAr ? "وثيقة" : "Document");
              const { primary: name } = namePair(doc.fullNameAr || doc.employee?.fullNameAr, doc.fullNameEn || doc.employee?.fullNameEn, isAr);
              const number = doc.documentNumber || doc.iqamaNumber || doc.passportNumber;
              const branchName = localized(doc.branch?.name, doc.branch?.nameEn) || localized(doc.employee?.branch?.name, doc.employee?.branch?.nameEn);
              const days = daysLeft(doc.expiryDate);
              const st = docState(days, isAr);
              const tone = doc.status === "EXPIRED" ? "rose" : doc.status === "EXPIRING_SOON" ? "amber" : st.tone === "sky" ? "sky" : "green";
              return (
                <div
                  key={`${doc.type}-${doc.id}`}
                  role="button"
                  tabIndex={0}
                  className={cn("lu-row", `lt-${tone}`)}
                  style={{ ["--j" as string]: Math.min(j, 12) }}
                  onClick={() => setDetailsDoc(doc)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setDetailsDoc(doc))}
                >
                  <span className={cn("lu-pi", days !== null && days < 0 && "pulse")}>
                    <Icon />
                  </span>
                  <span className="lu-cell">
                    <b>
                      {typeLabel} — {name || "—"}
                    </b>
                    <small>
                      {number && <span dir="ltr">{number}</span>}
                      {number && branchName && " · "}
                      {branchName}
                    </small>
                  </span>
                  <span className="lu-cell lu-hide-s">
                    <small>{isAr ? "تاريخ الانتهاء" : "Expires"}</small>
                    <b className="lu-num">{doc.expiryDate ? formatDate(doc.expiryDate) : "—"}</b>
                  </span>
                  <span className="lu-cell lu-hide-m">
                    <em className="lu-left">
                      <i style={{ width: `${leftPct(days)}%` }} />
                    </em>
                  </span>
                  <span className="lu-chip">{st.text}</span>
                  <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="lu-kebab" aria-label={t("common.actions")}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-3xl p-2">
                        <DropdownMenuItem className="rounded-2xl" onSelect={() => setDetailsDoc(doc)}>
                          <Eye className="me-2 h-4 w-4" /> {t("common.viewDetails")}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-2xl">
                          <Link to={`/employees/${doc.employeeId || doc.employee?.id}`}>
                            <ExternalLink className="me-2 h-4 w-4" /> {isAr ? "ملف الموظف" : "Employee profile"}
                          </Link>
                        </DropdownMenuItem>
                        {number && (
                          <DropdownMenuItem className="rounded-2xl" onSelect={() => copyText(number)}>
                            <Copy className="me-2 h-4 w-4" /> {isAr ? "نسخ الرقم" : "Copy number"}
                          </DropdownMenuItem>
                        )}
                        {doc.fileId && (
                          <DropdownMenuItem className="rounded-2xl" onSelect={() => filesApi.download(doc.fileId!, `${number || "document"}.pdf`)}>
                            <Download className="me-2 h-4 w-4" /> {isAr ? "تحميل المرفق" : "Download attachment"}
                          </DropdownMenuItem>
                        )}
                        {hasPermission("employees.edit") && (
                          <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, docType: rawType, document: doc })}>
                            <Edit className="me-2 h-4 w-4" /> {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        {hasPermission("employees.edit") && (
                          <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(doc)}>
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
        <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />
      </div>

      <WorkforceDocumentDetailsDialog
        open={Boolean(detailsDoc)}
        document={detailsDoc}
        onOpenChange={(open) => !open && setDetailsDoc(null)}
        onEdit={(doc) => setDialog({ open: true, docType: doc.type || (doc.iqamaNumber ? "IQAMA" : "PASSPORT"), document: doc })}
      />
      <WorkforceDocumentDialog
        open={dialog.open}
        docType={dialog.docType || category || "IQAMA"}
        document={dialog.document}
        queryKey="workforce-documents-unified"
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["workforce-category-counts"] });
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("employeeDocuments.deleteConfirmTitle", { defaultValue: "تأكيد حذف الوثيقة؟" })}
        description={t("employeeDocuments.deleteConfirmBody", { defaultValue: "هل أنت متأكد من رغبتك في حذف هذا المستند من سجلات الموظف؟" })}
        onConfirm={handleDelete}
      />
    </>
  );
}
