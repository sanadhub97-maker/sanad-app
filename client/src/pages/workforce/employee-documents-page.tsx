import { useState } from "react";
import { localized, namePair } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Plus, Edit, Trash2, FileDown, MoreHorizontal, Search, User, LayoutGrid, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LuPager } from "@/components/lulu/lulu-ui";
import { Kpis, type Tone } from "@/components/royal/rp";
import { DocCard, KindLanes, MonthCards, Seg, kindColor, type ListDoc } from "@/components/royal/cards";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { workforceDocumentsApi, type WorkforceDocumentItem, type WorkforceQueryParams } from "@/api/workforceDocuments";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";
import { documentAuthority } from "./authority";
import { EMP_DOC_KINDS, empDocPath, kindOfDoc } from "./emp-doc-kinds";

/* Employee documents in the Royal card design, as in the approved preview:
   the status band, a tab per document type, then every document on its own
   card, or the same documents by kind or by month. */

type View = "doc" | "kind" | "month";

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
  const [view, setView] = useState<View>("doc");
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
  const listDocs: ListDoc[] = rows.map((doc) => {
    const { raw, kind } = kindOfDoc(doc);
    return { key: `${doc.type}-${doc.id}`, kind: labelOf(doc), kindCode: kind?.value ?? raw, icon: kind?.icon ?? FileText, owner: nameOf(doc), date: doc.expiryDate, onOpen: () => navigate(empDocPath(doc)) };
  });

  const kpis: [string, string, number, string, Tone][] = [
    ["ALL", isAr ? "إجمالي الوثائق" : "All documents", stats.total, isAr ? "لكل الموظفين" : "Across all employees", "pri"],
    ["EXPIRED", isAr ? "منتهية" : "Expired", stats.expired, isAr ? "جدّدها فورًا" : "Renew now", "bad"],
    ["EXPIRING_SOON", isAr ? "تنتهي قريبًا" : "Ending soon", stats.expiringSoon, isAr ? "جهّز التجديد" : "Get the renewal ready", "warn"],
    ["VALID", isAr ? "سارية" : "Valid", stats.valid, isAr ? "لا شيء مطلوب" : "Nothing to do", "ok"],
  ];

  return (
    <div className="rp rc">
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
        items={kpis.map(([v, label, n, sub, tone], k) => ({
          label,
          value: n,
          sub,
          tone,
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
        {EMP_DOC_KINDS.map((c) => (
          <button key={c.value} type="button" className="rp-dtab" aria-pressed={category === c.value} onClick={() => handleCategoryChange(c.value)}>
            <span className="rp-ico sm" style={{ ["--c" as string]: kindColor(c.value), ["--t" as string]: `color-mix(in srgb, ${kindColor(c.value)} 12%, var(--surf))` }}>
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
        <span className="sp" />
        <Seg
          label={isAr ? "طريقة العرض" : "View"}
          value={view}
          onChange={setView}
          items={[
            { value: "doc", label: isAr ? "كل وثيقة" : "Each document", icon: FileText },
            { value: "kind", label: isAr ? "حسب النوع" : "By kind", icon: LayoutGrid },
            { value: "month", label: isAr ? "حسب الشهر" : "By month", icon: CalendarDays },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="rc-dc-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[330px] animate-pulse rounded-[22px] bg-[var(--l-surface)]" />
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
      ) : view === "kind" ? (
        <KindLanes docs={listDocs} kinds={EMP_DOC_KINDS.map((k) => ({ code: k.value, label: isAr ? k.labelAr : k.labelEn, icon: k.icon }))} />
      ) : view === "month" ? (
        <MonthCards docs={listDocs} unit={["وثيقة", "documents"]} />
      ) : (
        <div className="rc-dc-grid">
          {rows.map((doc, i) => {
            const { raw, kind } = kindOfDoc(doc);
            const number = doc.documentNumber || doc.iqamaNumber || doc.passportNumber;
            const branch = branchOf(doc);
            const employeeId = doc.employeeId || doc.employee?.id;
            return (
              <DocCard
                key={`${doc.type}-${doc.id}`}
                i={i}
                kind={labelOf(doc)}
                kindCode={kind?.value ?? raw}
                icon={kind?.icon ?? FileText}
                owner={branch ? `${nameOf(doc)} · ${branch}` : nameOf(doc)}
                ownerIcon={User}
                number={number}
                authority={documentAuthority(doc, isAr)}
                issueDate={doc.issueDate || doc.startDate}
                expiryDate={doc.expiryDate}
                hasFile={Boolean(doc.fileId)}
                onView={() => navigate(empDocPath(doc))}
                onRenew={hasPermission("employees.edit") ? () => setDialog({ open: true, docType: raw, document: doc }) : undefined}
                extra={
                  <>
                    {employeeId && (
                      <button type="button" className={cn("rc-btn icon")} onClick={() => navigate(`/employees/${employeeId}`)} title={isAr ? "ملف الموظف" : "Employee profile"} aria-label={isAr ? "ملف الموظف" : "Employee profile"}>
                        <User />
                      </button>
                    )}
                    {hasPermission("employees.edit") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="rc-btn icon" aria-label={t("common.actions")}>
                            <MoreHorizontal />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                          <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, docType: raw, document: doc })}>
                            <Edit className="me-2 h-4 w-4" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(doc)}>
                            <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

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
