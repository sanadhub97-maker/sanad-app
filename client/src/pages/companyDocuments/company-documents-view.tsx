import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarDays, Edit, FileDown, FileText, LayoutGrid, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuPager } from "@/components/lulu/lulu-ui";
import { Kpis, daysFromToday, type Tone } from "@/components/royal/rp";
import { DocCard, KindLanes, MonthCards, Seg, kindColor, type ListDoc } from "@/components/royal/cards";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { COMPANY_DOCUMENT_CATEGORY_ICONS } from "@/lib/document-type-icons";
import { CompanyDocumentDialog } from "@/pages/companyDocuments/company-document-dialog";
import type { CompanyDocument } from "@/types/models";
import type { companyDocumentsApi } from "@/api/companyDocuments";

/* Company documents in the Royal card design, as in the approved preview:
   the status band, then every document on its own card (kind, owner, the
   days as a ring, its facts and its validity), or the same documents by
   kind or by month. */

interface Props {
  title: string;
  description: string;
  api: typeof companyDocumentsApi;
  categories: readonly string[];
  queryKey: string;
  permissionModule: string;
}

type Status = "ALL" | "EXPIRED" | "EXPIRING_SOON" | "VALID";
type View = "doc" | "kind" | "month";

const statusOf = (d: CompanyDocument): Exclude<Status, "ALL"> => {
  const n = daysFromToday(d.expiryDate);
  return n === null ? "VALID" : n < 0 ? "EXPIRED" : n <= 30 ? "EXPIRING_SOON" : "VALID";
};

export function CompanyDocumentsView({ title, description, api, categories, queryKey, permissionModule }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const p = (action: string) => `${permissionModule}.${action}`;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const [view, setView] = useState<View>("doc");
  const [dialog, setDialog] = useState<{ open: boolean; document?: CompanyDocument }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<CompanyDocument | null>(null);
  const pageSize = 100;

  const params = { page, pageSize, q: search || undefined, category: category || undefined };
  const { data, isLoading } = useQuery({ queryKey: [queryKey, params], queryFn: () => api.list(params) });
  const { data: counts } = useQuery({ queryKey: [queryKey, "category-counts"], queryFn: () => api.categoryCounts() });
  const totalCount = Object.values(counts ?? {}).reduce((sum, n) => sum + n, 0);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const docs = data?.data ?? [];
  const n = { EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 };
  docs.forEach((d) => n[statusOf(d)]++);
  const byExpiry = (a: CompanyDocument, b: CompanyDocument) => (daysFromToday(a.expiryDate) ?? 99999) - (daysFromToday(b.expiryDate) ?? 99999);
  const shown = (status === "ALL" ? docs : docs.filter((d) => statusOf(d) === status)).slice().sort(byExpiry);
  const owner = (d: CompanyDocument) => localized(d.branch?.name, d.branch?.nameEn) || localized(d.name, d.nameEn) || "—";
  const open = (d: CompanyDocument) => navigate(`/company-documents/${d.id}`);
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const establishments = new Set(docs.map((d) => d.branchId || d.name.trim())).size;
  const kindLabel = (c: string) => t(`documentCategories.${c}`);
  const listDocs: ListDoc[] = docs.map((d) => ({ key: d.id, kind: kindLabel(d.category), kindCode: d.category, icon: COMPANY_DOCUMENT_CATEGORY_ICONS[d.category] ?? FileText, owner: owner(d), date: d.expiryDate, onOpen: () => open(d) }));

  const kpis: [Status, string, number, string, Tone][] = [
    ["ALL", isAr ? "إجمالي المستندات" : "All documents", data?.meta.total ?? docs.length, isAr ? `لـ ${establishments} مؤسسات` : `For ${establishments} establishments`, "pri"],
    ["EXPIRED", isAr ? "منتهية" : "Expired", n.EXPIRED, isAr ? "تحتاج تجديد فورًا" : "Renew now", "bad"],
    ["EXPIRING_SOON", isAr ? "تنتهي خلال 30 يوم" : "Ending within 30 days", n.EXPIRING_SOON, isAr ? "جهّز التجديد" : "Get the renewal ready", "warn"],
    ["VALID", isAr ? "سارية" : "Valid", n.VALID, isAr ? "لا شيء مطلوب" : "Nothing to do", "ok"],
  ];

  return (
    <div className="rp rc">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-3xl p-2">
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.documents.export({ sourceType: "COMPANY_DOCUMENT" }, "xlsx")}>
                  {t("employees.export.excel")}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.documents.export({ sourceType: "COMPANY_DOCUMENT" }, "pdf")}>
                  {t("employees.export.pdf")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission(p("create")) && (
              <Button onClick={() => setDialog({ open: true })}>
                <Plus className="h-4 w-4" /> {t("companyDocuments.addDocument")}
              </Button>
            )}
          </>
        }
      />

      <Kpis items={kpis.map(([v, label, count, sub, tone], k) => ({ label, value: count, sub, tone, hero: k === 0, active: status === v, onClick: () => setStatus(v) }))} />

      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 2 }}>
        <label className="rp-search">
          <Search />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isAr ? "اسم المؤسسة أو رقم المستند" : "Establishment or document number"}
            aria-label={isAr ? "بحث" : "Search"}
          />
        </label>
        {view === "doc" && (
          <Seg
            label={isAr ? "الحالة" : "Status"}
            value={status}
            onChange={setStatus}
            items={[
              { value: "ALL", label: isAr ? "الكل" : "All", count: docs.length },
              { value: "EXPIRED", label: isAr ? "منتهية" : "Expired", count: n.EXPIRED },
              { value: "EXPIRING_SOON", label: isAr ? "قريبة" : "Soon", count: n.EXPIRING_SOON },
              { value: "VALID", label: isAr ? "سارية" : "Valid", count: n.VALID },
            ]}
          />
        )}
        <Seg
          label={isAr ? "طريقة العرض" : "View"}
          value={view}
          onChange={setView}
          items={[
            { value: "doc", label: isAr ? "كل مستند" : "Each document", icon: FileText },
            { value: "kind", label: isAr ? "حسب النوع" : "By kind", icon: LayoutGrid },
            { value: "month", label: isAr ? "حسب الشهر" : "By month", icon: CalendarDays },
          ]}
        />
      </div>
      {categories.length > 1 && (
        <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 3 }}>
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => {
              setCategory("");
              setPage(1);
            }}
            className="rp-chip rp-pri"
          >
            <i />
            {t("companyDocuments.filters.allCategories")} <span>{totalCount}</span>
          </button>
          {categories
            .filter((cat) => (counts?.[cat] ?? 0) > 0 || category === cat)
            .map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={category === cat}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className="rp-chip"
                style={{ ["--c" as string]: kindColor(cat), ["--t" as string]: `color-mix(in srgb, ${kindColor(cat)} 12%, var(--surf))` }}
              >
                <i />
                {kindLabel(cat)} <span>{counts?.[cat] ?? 0}</span>
              </button>
            ))}
        </div>
      )}

      {isLoading ? (
        <div className="rc-dc-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[330px] animate-pulse rounded-[22px] bg-[var(--l-surface)]" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rp-card rp-empty rp-rise">
          <b>{t("companyDocuments.emptyTitle")}</b>
          {hasPermission(p("create")) && (
            <div className="mt-3">
              <Button onClick={() => setDialog({ open: true })}>
                <Plus className="h-4 w-4" /> {t("companyDocuments.addDocument")}
              </Button>
            </div>
          )}
        </div>
      ) : view === "kind" ? (
        <KindLanes docs={listDocs} kinds={categories.map((c) => ({ code: c, label: kindLabel(c), icon: COMPANY_DOCUMENT_CATEGORY_ICONS[c] ?? FileText }))} />
      ) : view === "month" ? (
        <MonthCards docs={listDocs} unit={["مستند", "documents"]} />
      ) : (
        <div className="rc-dc-grid">
          {shown.map((d, i) => (
            <DocCard
              key={d.id}
              i={i}
              kind={kindLabel(d.category)}
              kindCode={d.category}
              icon={COMPANY_DOCUMENT_CATEGORY_ICONS[d.category] ?? FileText}
              owner={owner(d)}
              ownerIcon={Building2}
              number={d.documentNumber || d.licenseNumber}
              authority={d.issuingAuthority}
              issueDate={d.issueDate || d.startDate}
              expiryDate={d.expiryDate}
              hasFile={Boolean(d.fileId)}
              onView={() => open(d)}
              onRenew={hasPermission(p("edit")) ? () => setDialog({ open: true, document: d }) : undefined}
              extra={
                (hasPermission(p("edit")) || hasPermission(p("delete"))) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="rc-btn icon" aria-label={t("common.actions")}>
                        <MoreHorizontal />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                      {hasPermission(p("edit")) && (
                        <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, document: d })}>
                          <Edit className="me-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                      )}
                      {hasPermission(p("delete")) && (
                        <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(d)}>
                          <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }
            />
          ))}
          {!shown.length && <div className="rp-card rp-empty rc-empty">{isAr ? "لا توجد مستندات بهذا الفلتر" : "No documents match this filter"}</div>}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      <CompanyDocumentDialog api={api} categories={categories} queryKey={queryKey} open={dialog.open} document={dialog.document} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("companyDocuments.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
