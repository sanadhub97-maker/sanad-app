import { useState } from "react";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit, Eye, FileDown, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuPager } from "@/components/lulu/lulu-ui";
import { Kpis, LeftPill, Pill, daysFromToday, dmy, weekday, type Tone } from "@/components/royal/rp";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { CompanyDocumentDialog } from "@/pages/companyDocuments/company-document-dialog";
import { CompanyDocumentDetailsDialog } from "@/pages/companyDocuments/company-document-details-dialog";
import type { CompanyDocument } from "@/types/models";
import type { companyDocumentsApi } from "@/api/companyDocuments";

/* Company documents in the Royal design, as in the approved preview: the
   status band, the kinds, then a card per establishment listing its
   documents with the day, the date and the time left. */

interface Props {
  title: string;
  description: string;
  api: typeof companyDocumentsApi;
  categories: readonly string[];
  queryKey: string;
  permissionModule: string;
}

type Status = "ALL" | "EXPIRED" | "EXPIRING_SOON" | "VALID";
const CAT_TONES: Tone[] = ["pri", "teal", "bad", "gold", "vio", "sky", "ok", "warn", "mut"];

export function CompanyDocumentsView({ title, description, api, categories, queryKey, permissionModule }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const p = (action: string) => `${permissionModule}.${action}`;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const [dialog, setDialog] = useState<{ open: boolean; document?: CompanyDocument }>({ open: false });
  const [detailsDoc, setDetailsDoc] = useState<CompanyDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyDocument | null>(null);
  // Large enough that an establishment's documents stay on one page.
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
  docs.forEach((d) => {
    if (d.status === "EXPIRED" || d.status === "EXPIRING_SOON" || d.status === "VALID") n[d.status]++;
  });
  const shown = status === "ALL" ? docs : docs.filter((d) => d.status === status);
  // One card per establishment: a company document is named after its establishment.
  const groups = new Map<string, CompanyDocument[]>();
  for (const d of shown) groups.set(d.name.trim(), [...(groups.get(d.name.trim()) ?? []), d]);
  const cards = [...groups.values()]
    .map((list) => list.sort((a, b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity) - (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity)))
    .sort((a, b) => Math.min(...a.map((d) => daysFromToday(d.expiryDate) ?? 9999)) - Math.min(...b.map((d) => daysFromToday(d.expiryDate) ?? 9999)));
  const catTone = (cat: string) => CAT_TONES[Math.max(0, categories.indexOf(cat)) % CAT_TONES.length];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const statusChips: [Status, string, number, string][] = [
    ["ALL", isAr ? "الكل" : "All", data?.meta.total ?? docs.length, "sky"],
    ["EXPIRED", isAr ? "منتهية" : "Expired", n.EXPIRED, "rose"],
    ["EXPIRING_SOON", isAr ? "تنتهي قريبًا" : "Ending soon", n.EXPIRING_SOON, "amber"],
    ["VALID", isAr ? "سارية" : "Valid", n.VALID, "green"],
  ];

  return (
    <div className="rp">
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

      <Kpis
        items={statusChips.map(([v, label, count], k) => ({
          label: k === 0 ? (isAr ? "إجمالي المستندات" : "All documents") : label,
          value: count,
          sub: v === "ALL" ? (isAr ? `لـ ${new Set(docs.map((d) => d.name.trim())).size} مؤسسات` : `For ${new Set(docs.map((d) => d.name.trim())).size} establishments`) : v === "EXPIRED" ? (isAr ? "تحتاج تجديد فورًا" : "Renew now") : v === "EXPIRING_SOON" ? (isAr ? "جهّز التجديد" : "Get the renewal ready") : isAr ? "لا شيء مطلوب" : "Nothing to do",
          tone: (v === "ALL" ? "pri" : v === "EXPIRED" ? "bad" : v === "EXPIRING_SOON" ? "warn" : "ok") as Tone,
          hero: k === 0,
          active: status === v,
          onClick: () => setStatus(v),
        }))}
      />

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
        {categories.length > 1 && (
          <>
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
                  className={cn("rp-chip", `rp-${catTone(cat)}`)}
                >
                  <i />
                  {t(`documentCategories.${cat}`)} <span>{counts?.[cat] ?? 0}</span>
                </button>
              ))}
          </>
        )}
      </div>

      {isLoading ? (
        <div className="rp-cards">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[240px] animate-pulse rounded-[20px] bg-[var(--l-surface)]" />
          ))}
        </div>
      ) : cards.length === 0 ? (
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
      ) : (
        <div className="rp-cards">
          {cards.map((list, j) => {
            const first = list[0];
            const worst = Math.min(...list.map((d) => daysFromToday(d.expiryDate) ?? 9999));
            const branch = first.branch;
            return (
              <article key={first.name} className="rp-card rp-est rp-lift rp-rise" style={{ ["--i" as string]: Math.min(j, 10) }}>
                <div className="hd">
                  <span className={cn("rp-ico", `rp-${CAT_TONES[j % CAT_TONES.length]}`)}>
                    <Building2 />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3>{localized(first.name, first.nameEn)}</h3>
                    <small>
                      {[localized(branch?.name, branch?.nameEn) !== localized(first.name, first.nameEn) ? localized(branch?.name, branch?.nameEn) : null, branch?.code, isAr ? `${list.length} مستند` : `${list.length} documents`]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                  {worst < 0 ? <Pill tone="bad">{isAr ? "منتهي" : "Expired"}</Pill> : worst <= 30 ? <Pill tone="warn">{isAr ? "قريب" : "Soon"}</Pill> : <Pill tone="ok">{isAr ? "سليم" : "All good"}</Pill>}
                </div>
                <div className="list">
                  {list.map((d) => {
                    const days = daysFromToday(d.expiryDate);
                    const number = d.documentNumber || d.licenseNumber;
                    return (
                      <div key={d.id} className="d">
                        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={() => setDetailsDoc(d)}>
                          <Pill tone={catTone(d.category)} dot={false}>
                            {t(`documentCategories.${d.category}`)}
                          </Pill>
                          <b className="rp-mono truncate">{number || "—"}</b>
                        </button>
                        {(hasPermission(p("edit")) || hasPermission(p("delete"))) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="lu-kebab" aria-label={t("common.actions")}>
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                              <DropdownMenuItem className="rounded-2xl" onSelect={() => setDetailsDoc(d)}>
                                <Eye className="me-2 h-4 w-4" /> {t("common.viewDetails")}
                              </DropdownMenuItem>
                              {hasPermission(p("edit")) && (
                                <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, document: d })}>
                                  <Edit className="me-2 h-4 w-4" /> {days !== null && days < 0 ? (isAr ? "ابدأ التجديد" : "Start renewal") : t("common.edit")}
                                </DropdownMenuItem>
                              )}
                              {hasPermission(p("delete")) && (
                                <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(d)}>
                                  <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <span className="when">
                          <small>{d.expiryDate ? `${weekday(d.expiryDate)} ${dmy(d.expiryDate)}` : isAr ? "بدون تاريخ انتهاء" : "No expiry date"}</small>
                          <LeftPill days={days} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      <CompanyDocumentDetailsDialog open={Boolean(detailsDoc)} document={detailsDoc} onOpenChange={(open) => !open && setDetailsDoc(null)} onEdit={(doc) => setDialog({ open: true, document: doc })} />
      <CompanyDocumentDialog api={api} categories={categories} queryKey={queryKey} open={dialog.open} document={dialog.document} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("companyDocuments.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
