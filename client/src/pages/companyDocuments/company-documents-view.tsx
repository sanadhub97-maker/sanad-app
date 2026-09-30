import { useState } from "react";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, FileDown, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuEmpty, LuMini, LuPager, daysLeft, docState } from "@/components/lulu/lulu-ui";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { CompanyDocumentDialog } from "@/pages/companyDocuments/company-document-dialog";
import { CompanyDocumentDetailsDialog } from "@/pages/companyDocuments/company-document-details-dialog";
import type { CompanyDocument } from "@/types/models";
import type { companyDocumentsApi } from "@/api/companyDocuments";

/* Company documents in the Pearl design, as in the approved preview: status
   and category chips, then a card per document with a ring of the days left. */

interface Props {
  title: string;
  description: string;
  api: typeof companyDocumentsApi;
  categories: readonly string[];
  queryKey: string;
  permissionModule: string;
}

type Status = "ALL" | "EXPIRED" | "EXPIRING_SOON" | "VALID";
const CAT_TONES = ["amber", "teal", "sky", "violet", "indigo", "rose", "green"];

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
  const pageSize = 24;

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
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const statusChips: [Status, string, number, string][] = [
    ["ALL", isAr ? "الكل" : "All", data?.meta.total ?? docs.length, "sky"],
    ["EXPIRED", isAr ? "منتهية" : "Expired", n.EXPIRED, "rose"],
    ["EXPIRING_SOON", isAr ? "تنتهي قريبًا" : "Ending soon", n.EXPIRING_SOON, "amber"],
    ["VALID", isAr ? "سارية" : "Valid", n.VALID, "green"],
  ];

  return (
    <>
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
              placeholder={isAr ? "اسم المستند أو رقمه" : "Document name or number"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
          {statusChips.map(([v, label, count, tone]) => (
            <button key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)} className={cn("lu-fchip", `lt-${tone}`, status === v && "on")}>
              <i />
              {label} <span className="n lu-num">{count}</span>
            </button>
          ))}
        </div>
        {categories.length > 1 && (
          <div className="lu-tools no-print">
            <button
              type="button"
              aria-pressed={!category}
              onClick={() => {
                setCategory("");
                setPage(1);
              }}
              className={cn("lu-fchip lt-indigo", !category && "on")}
            >
              <i />
              {t("companyDocuments.filters.allCategories")} <span className="n lu-num">{totalCount}</span>
            </button>
            {categories.map((cat, i) => (
              <button
                key={cat}
                type="button"
                aria-pressed={category === cat}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={cn("lu-fchip", `lt-${CAT_TONES[i % CAT_TONES.length]}`, category === cat && "on")}
              >
                <i />
                {t(`documentCategories.${cat}`)} <span className="n lu-num">{counts?.[cat] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="lu-cards">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[220px] animate-pulse rounded-[22px] bg-card" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <LuEmpty
            tone="amber"
            title={t("companyDocuments.emptyTitle")}
            action={
              hasPermission(p("create")) ? (
                <Button onClick={() => setDialog({ open: true })}>
                  <Plus className="h-4 w-4" /> {t("companyDocuments.addDocument")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="lu-cards">
            {shown.map((d, j) => {
              const days = daysLeft(d.expiryDate);
              const st = docState(days, isAr);
              const tone = d.status === "EXPIRED" ? "rose" : d.status === "EXPIRING_SOON" ? "amber" : st.tone === "sky" ? "sky" : "green";
              const expired = d.status === "EXPIRED" || (days !== null && days < 0);
              const number = d.documentNumber || d.licenseNumber;
              const branch = localized(d.branch?.name, d.branch?.nameEn);
              return (
                <section key={d.id} className={cn("lu-cc lu-rise lu-tilt", `lt-${tone}`)} style={{ ["--i" as string]: Math.min(j, 10) }}>
                  <div className="lu-hd" style={{ alignItems: "flex-start" }}>
                    <button type="button" className="lu-cell" onClick={() => setDetailsDoc(d)}>
                      <b style={{ fontSize: 16 }}>{localized(d.name, d.nameEn)}</b>
                      <small>{[t(`documentCategories.${d.category}`), branch].filter(Boolean).join(" · ")}</small>
                    </button>
                    <LuMini days={days} isAr={isAr} />
                  </div>
                  <div className="lu-facts" style={{ marginTop: 12 }}>
                    <div>
                      <small>{isAr ? "رقم المستند" : "Number"}</small>
                      <b className="lu-num" dir="ltr" style={{ textAlign: "start" }}>
                        {number || "—"}
                      </b>
                    </div>
                    <div>
                      <small>{isAr ? "تاريخ الانتهاء" : "Expires"}</small>
                      <b className="lu-num">{d.expiryDate ? formatDate(d.expiryDate) : "—"}</b>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="lu-chip">{st.text}</span>
                    <span className="ms-auto" />
                    {expired && hasPermission(p("edit")) ? (
                      <button type="button" className="lu-do" onClick={() => setDialog({ open: true, document: d })}>
                        {isAr ? "ابدأ التجديد" : "Start renewal"}
                      </button>
                    ) : (
                      <button type="button" className="lu-do" onClick={() => setDetailsDoc(d)}>
                        {isAr ? "عرض" : "View"}
                      </button>
                    )}
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
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />
      </div>

      <CompanyDocumentDetailsDialog open={Boolean(detailsDoc)} document={detailsDoc} onOpenChange={(open) => !open && setDetailsDoc(null)} onEdit={(doc) => setDialog({ open: true, document: doc })} />
      <CompanyDocumentDialog api={api} categories={categories} queryKey={queryKey} open={dialog.open} document={dialog.document} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("companyDocuments.deleteConfirmTitle")} onConfirm={handleDelete} />
    </>
  );
}
