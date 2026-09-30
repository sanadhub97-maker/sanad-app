import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { localized, localizedCity } from "@/lib/names";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit, Eye, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuEmpty, LuPager } from "@/components/lulu/lulu-ui";
import { branchesApi } from "@/api/branches";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { companyDocumentsApi } from "@/api/companyDocuments";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { BranchDetailsDialog } from "@/pages/branches/branch-details-dialog";
import type { Branch } from "@/types/models";

/* Establishments in the Pearl design, as in the approved preview: a card per
   establishment in its own colour, with its employees, documents and how
   many have expired, and a bar of its documents' status. */

const TONES = ["indigo", "rose", "amber", "teal", "violet", "sky", "green"];
type Tally = { valid: number; soon: number; expired: number };

export default function BranchesPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; branch?: Branch }>({ open: false });
  const [detailsTarget, setDetailsTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const pageSize = 24;

  const { data, isLoading } = useQuery({
    queryKey: ["branches", { page, search }],
    queryFn: () => branchesApi.list({ page, pageSize, q: search || undefined }),
  });

  // Documents per establishment, for the counts and the status bar.
  const { data: empDocs } = useQuery({
    queryKey: ["workforce-documents-unified", { page: 1, pageSize: 200 }],
    queryFn: () => workforceDocumentsApi.listUnified({ page: 1, pageSize: 200 }),
    enabled: hasPermission("employees.view"),
    staleTime: 60_000,
  });
  const { data: coDocs } = useQuery({
    queryKey: ["companyDocuments", { page: 1, pageSize: 200 }],
    queryFn: () => companyDocumentsApi.list({ page: 1, pageSize: 200 }),
    enabled: hasPermission("companyDocuments.view"),
    staleTime: 60_000,
  });
  const tally = useMemo(() => {
    const m = new Map<string, Tally>();
    const add = (id: string | undefined | null, status?: string | null) => {
      if (!id) return;
      const x = m.get(id) ?? { valid: 0, soon: 0, expired: 0 };
      if (status === "EXPIRED") x.expired++;
      else if (status === "EXPIRING_SOON") x.soon++;
      else x.valid++;
      m.set(id, x);
    };
    (empDocs?.data ?? []).forEach((d) => add(d.branch?.id ?? d.employee?.branch?.id, d.status));
    (coDocs?.data ?? []).forEach((d) => add(d.branchId ?? d.branch?.id, d.status));
    return m;
  }, [empDocs, coDocs]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await branchesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const branches = data?.data ?? [];
  const total = data?.meta.total ?? branches.length;
  const cities = new Set(branches.map((b) => localizedCity(b.city, b.cityEn)).filter(Boolean));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const description = isAr
    ? `${total} ${total === 1 ? "مؤسسة" : "مؤسسات"}${cities.size ? ` في ${Array.from(cities).slice(0, 3).join(" و")}` : ""}`
    : `${total} establishments${cities.size ? ` in ${Array.from(cities).slice(0, 3).join(", ")}` : ""}`;

  return (
    <>
      <PageHeader
        title={t("branches.title")}
        description={description}
        actions={
          hasPermission("branches.create") && (
            <Button onClick={() => setDialog({ open: true })}>
              <Plus className="h-4 w-4" /> {t("branches.addBranch")}
            </Button>
          )
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
              placeholder={isAr ? "اسم المؤسسة أو رمزها" : "Establishment name or code"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
        </div>

        {isLoading ? (
          <div className="lu-cards">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[190px] animate-pulse rounded-[22px] bg-card" />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <LuEmpty
            tone="teal"
            title={t("branches.emptyTitle")}
            action={
              hasPermission("branches.create") ? (
                <Button onClick={() => setDialog({ open: true })}>
                  <Plus className="h-4 w-4" /> {t("branches.addBranch")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="lu-cards">
            {branches.map((b, j) => {
              const tone = TONES[j % TONES.length];
              const x = tally.get(b.id) ?? { valid: 0, soon: 0, expired: 0 };
              const docs = x.valid + x.soon + x.expired;
              const city = localizedCity(b.city, b.cityEn);
              return (
                <section key={b.id} className={cn("lu-cc lu-rise lu-tilt", `lt-${tone}`)} style={{ ["--i" as string]: Math.min(j, 10) }}>
                  <div className="flex items-center gap-3">
                    <span className="lu-sq lu-big" style={{ width: 48, height: 48, borderRadius: 16 }}>
                      <Building2 />
                    </span>
                    <button type="button" className="lu-cell" onClick={() => setDetailsTarget(b)}>
                      <b style={{ fontSize: 15 }}>{localized(b.name, b.nameEn)}</b>
                      <small>
                        {[city, b.code].filter(Boolean).join(" · ")}
                        {b.status === "INACTIVE" && ` · ${isAr ? "غير نشطة" : "inactive"}`}
                      </small>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="lu-kebab" aria-label={t("common.actions")}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                        <DropdownMenuItem className="rounded-2xl" onSelect={() => setDetailsTarget(b)}>
                          <Eye className="me-2 h-4 w-4" /> {t("common.viewDetails")}
                        </DropdownMenuItem>
                        {hasPermission("branches.edit") && (
                          <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, branch: b })}>
                            <Edit className="me-2 h-4 w-4" /> {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        {hasPermission("branches.delete") && (
                          <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleteTarget(b)}>
                            <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="lu-stats" style={{ marginTop: 14 }}>
                    <div>
                      <b className="lu-num">{b._count?.employees ?? 0}</b>
                      <small>{isAr ? "موظف" : "employees"}</small>
                    </div>
                    <div>
                      <b className="lu-num">{docs}</b>
                      <small>{isAr ? "وثيقة" : "documents"}</small>
                    </div>
                    <div>
                      <b className="lu-num" style={{ color: "var(--l-rose)" }}>
                        {x.expired}
                      </b>
                      <small>{isAr ? "منتهية" : "expired"}</small>
                    </div>
                  </div>
                  <div className="lu-split" style={{ marginTop: 12 }}>
                    {x.valid > 0 && <i style={{ flex: x.valid, background: "var(--l-green)" }} />}
                    {x.soon > 0 && <i style={{ flex: x.soon, background: "var(--l-amber)" }} />}
                    {x.expired > 0 && <i style={{ flex: x.expired, background: "var(--l-rose)" }} />}
                    {docs === 0 && <i style={{ flex: 1, background: "var(--l-surface)" }} />}
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />
      </div>

      <BranchDetailsDialog open={Boolean(detailsTarget)} branch={detailsTarget} onOpenChange={(open) => !open && setDetailsTarget(null)} onEdit={(b) => setDialog({ open: true, branch: b })} />
      <BranchDialog open={dialog.open} branch={dialog.branch} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("branches.deleteConfirmTitle")} onConfirm={handleDelete} />
    </>
  );
}
