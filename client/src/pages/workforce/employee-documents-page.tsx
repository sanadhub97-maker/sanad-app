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
import { LuPager } from "@/components/lulu/lulu-ui";
import { Kpis, LeftMeter, daysFromToday, dmy, hijri, weekday, type Tone } from "@/components/royal/rp";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { workforceDocumentsApi, type WorkforceDocumentItem, type WorkforceQueryParams } from "@/api/workforceDocuments";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";
import { WorkforceDocumentDetailsDialog } from "./workforce-document-details-dialog";

/* Employee documents in the Royal design, as in the approved preview: the
   status band, a tab per document type, and the documents soonest first,
   grouped into expired, within 7 days, within 30 days and valid. */

const TYPE_TONE: Record<string, Tone> = { IQAMA: "pri", PASSPORT: "vio", HEALTH_CERTIFICATE: "teal", MEDICAL_INSURANCE: "sky", VISA: "gold", FLIGHT_TICKET: "bad" };

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
  const rows = [...(data?.data ?? [])].sort((a, b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity) - (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity));
  const BUCKETS: { key: string; label: string; tone: Tone; has: (d: number | null) => boolean }[] = [
    { key: "expired", label: isAr ? "منتهية" : "Expired", tone: "bad", has: (d) => d !== null && d < 0 },
    { key: "week", label: isAr ? "خلال 7 أيام" : "Within 7 days", tone: "warn", has: (d) => d !== null && d >= 0 && d <= 7 },
    { key: "month", label: isAr ? "خلال 30 يوم" : "Within 30 days", tone: "gold", has: (d) => d !== null && d > 7 && d <= 30 },
    { key: "valid", label: isAr ? "سارية" : "Valid", tone: "ok", has: (d) => d !== null && d > 30 },
    { key: "none", label: isAr ? "بدون تاريخ انتهاء" : "No expiry date", tone: "mut", has: (d) => d === null },
  ];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const exportDocs = (format: "xlsx" | "pdf") =>
    reportsApi.documents.export({ sourceType: "EMPLOYEE_DOCUMENT", category: category || undefined, status: statusFilter !== "ALL" ? statusFilter : undefined }, format);
  const openNew = () => setDialog({ open: true, docType: category || "IQAMA", document: null });

  return (
    <div className="rp">
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

      <Kpis
        items={statusChips.map(([v, label, n], k) => ({
          label: k === 0 ? (isAr ? "إجمالي الوثائق" : "All documents") : label,
          value: n,
          sub: v === "ALL" ? (isAr ? "لكل الموظفين" : "Across all employees") : v === "EXPIRED" ? (isAr ? "جدّدها فورًا" : "Renew now") : v === "EXPIRING_SOON" ? (isAr ? "جهّز التجديد" : "Get the renewal ready") : isAr ? "لا شيء مطلوب" : "Nothing to do",
          tone: (v === "ALL" ? "pri" : v === "EXPIRED" ? "bad" : v === "EXPIRING_SOON" ? "warn" : "ok") as Tone,
          hero: k === 0,
          active: statusFilter === v,
          onClick: () => {
            setStatusFilter(v);
            setPage(1);
          },
        }))}
      />

      <div className="rp-dtabs rp-rise no-print" style={{ ["--i" as string]: 2 }} role="group" aria-label={isAr ? "نوع الوثيقة" : "Document type"}>
        <button type="button" className="rp-dtab" aria-pressed={!category} onClick={() => handleCategoryChange("")}>
          <span className="rp-ico sm rp-pri">
            <FileText />
          </span>
          <span>
            <b>{isAr ? "كل الأنواع" : "All types"}</b>
            <small>{isAr ? `${totalDocsCount} وثيقة` : `${totalDocsCount} documents`}</small>
          </span>
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.value} type="button" className="rp-dtab" aria-pressed={category === c.value} onClick={() => handleCategoryChange(c.value)}>
            <span className={cn("rp-ico sm", `rp-${TYPE_TONE[c.value]}`)}>
              <c.icon />
            </span>
            <span>
              <b>{isAr ? c.labelAr : c.labelEn}</b>
              <small>{isAr ? `${counts[c.value] ?? 0} وثيقة` : `${counts[c.value] ?? 0} documents`}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 3 }}>
        <label className="rp-search">
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
        {branches.length > 0 && (
          <Select
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-[38px] w-52 shrink-0 rounded-[11px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
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

      {isLoading ? (
        <div className="rp-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rp-item">
              <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--l-ground)]" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rp-card rp-empty rp-rise">
          <b>{t("employeeDocuments.emptyTitle", { defaultValue: "لا توجد وثائق بهذا الفلتر" })}</b>
          {hasPermission("employees.create") && (
            <div className="mt-3">
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> {t("employeeDocuments.addDocument", { defaultValue: "إضافة وثيقة" })}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: 4 }}>
          {BUCKETS.map((bk) => {
            const inBucket = rows.filter((d) => bk.has(daysFromToday(d.expiryDate)));
            if (!inBucket.length) return null;
            return (
              <div key={bk.key}>
                <div className={cn("rp-bucket", `rp-${bk.tone}`)}>
                  <i />
                  {bk.label}
                  <span>{isAr ? `${inBucket.length} وثيقة` : `${inBucket.length} documents`}</span>
                </div>
                {inBucket.map((doc) => {
                  const rawType = (doc.type || (doc.iqamaNumber ? "IQAMA" : "PASSPORT")).toUpperCase();
                  const found = CATEGORIES.find((c) => c.value === rawType || (rawType.includes("VISA") && c.value === "VISA"));
                  const Icon = found?.icon ?? FileText;
                  const typeLabel = found ? SINGULAR[found.value][isAr ? 0 : 1] : doc.name || (isAr ? "وثيقة" : "Document");
                  const { primary: name } = namePair(doc.fullNameAr || doc.employee?.fullNameAr, doc.fullNameEn || doc.employee?.fullNameEn, isAr);
                  const number = doc.documentNumber || doc.iqamaNumber || doc.passportNumber;
                  const branchName = localized(doc.branch?.name, doc.branch?.nameEn) || localized(doc.employee?.branch?.name, doc.employee?.branch?.nameEn);
                  const days = daysFromToday(doc.expiryDate);
                  return (
                    <div
                      key={`${doc.type}-${doc.id}`}
                      role="button"
                      tabIndex={0}
                      className="rp-item cursor-pointer hover:bg-[var(--l-ground)]"
                      onClick={() => setDetailsDoc(doc)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setDetailsDoc(doc))}
                    >
                      <span className={cn("rp-ico sm", `rp-${TYPE_TONE[found?.value ?? "IQAMA"] ?? "pri"}`)}>
                        <Icon />
                      </span>
                      <span className="t">
                        <b>{name || "—"}</b>
                        <small>
                          {typeLabel}
                          {number && (
                            <>
                              {" · "}
                              <span className="rp-mono">{number}</span>
                            </>
                          )}
                          {branchName && ` · ${branchName}`}
                        </small>
                      </span>
                      <span className="end">
                        <b className="rp-num">{doc.expiryDate ? dmy(doc.expiryDate) : "—"}</b>
                        {doc.expiryDate && (
                          <small>
                            {weekday(doc.expiryDate)} · {hijri(doc.expiryDate)}
                          </small>
                        )}
                      </span>
                      <LeftMeter days={days} />
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
            );
          })}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

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
    </div>
  );
}
