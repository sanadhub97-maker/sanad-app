import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { localized, localizedCity } from "@/lib/names";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit, Eye, MapPin, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LuPager } from "@/components/lulu/lulu-ui";
import { Kpis, Pill, Ring, type Tone } from "@/components/royal/rp";
import { branchesApi } from "@/api/branches";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { companyDocumentsApi } from "@/api/companyDocuments";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { BranchDetailsDialog } from "@/pages/branches/branch-details-dialog";
import type { Branch } from "@/types/models";

/* Establishments in the Royal design, as in the approved preview: a card per
   establishment with its English name, a ring of its valid documents, the
   city and code, and its employees, documents and what needs follow-up. */

const TONES: Tone[] = ["pri", "teal", "gold", "vio", "sky", "ok", "bad"];
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

  const staff = branches.reduce((n, b) => n + (b._count?.employees ?? 0), 0);
  const follow = [...tally.values()].reduce((n, x) => n + x.soon + x.expired, 0);

  return (
    <div className="rp">
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

      <Kpis
        items={[
          { label: isAr ? "المؤسسات" : "Establishments", value: total, sub: isAr ? `${branches.filter((b) => b.status !== "INACTIVE").length} نشطة` : `${branches.filter((b) => b.status !== "INACTIVE").length} active`, hero: true },
          { label: isAr ? "المدن" : "Cities", value: cities.size, sub: Array.from(cities).slice(0, 4).join(isAr ? "، " : ", ") || "—", tone: "sky" },
          { label: isAr ? "الموظفون" : "Employees", value: staff, sub: isAr ? "موزعون على المؤسسات" : "Across the establishments", tone: "vio" },
          { label: isAr ? "وثائق تحتاج متابعة" : "Documents to follow up", value: follow, sub: isAr ? "منتهية أو تنتهي قريبًا" : "Expired or ending soon", tone: "warn" },
        ]}
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
            placeholder={isAr ? "اسم المؤسسة أو رمزها" : "Establishment name or code"}
            aria-label={isAr ? "بحث" : "Search"}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="rp-cards">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[210px] animate-pulse rounded-[20px] bg-[var(--l-surface)]" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="rp-card rp-empty rp-rise">
          <b>{t("branches.emptyTitle")}</b>
          {hasPermission("branches.create") && (
            <div className="mt-3">
              <Button onClick={() => setDialog({ open: true })}>
                <Plus className="h-4 w-4" /> {t("branches.addBranch")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rp-cards">
          {branches.map((b, j) => {
            const tone = TONES[j % TONES.length];
            const x = tally.get(b.id) ?? { valid: 0, soon: 0, expired: 0 };
            const docs = x.valid + x.soon + x.expired;
            const city = localizedCity(b.city, b.cityEn);
            const other = isAr ? b.nameEn : b.name;
            return (
              <article key={b.id} className={cn("rp-card rp-br rp-lift rp-rise", `rp-${tone}`)} style={{ ["--i" as string]: Math.min(j, 10) }}>
                <div className="hd">
                  <span className="rp-ico" style={{ background: "var(--l-surface)" }}>
                    <Building2 />
                  </span>
                  <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setDetailsTarget(b)}>
                    <h3>{localized(b.name, b.nameEn)}</h3>
                    {other && other !== localized(b.name, b.nameEn) && <div className="en">{other}</div>}
                  </button>
                  {docs > 0 ? <Ring pct={Math.round((x.valid / docs) * 100)} /> : null}
                </div>
                <div className="meta">
                  <MapPin />
                  {city ?? "—"}
                  <span className="rp-mono ms-auto">{b.code}</span>
                  {b.status === "INACTIVE" && <Pill tone="mut">{isAr ? "غير نشطة" : "Inactive"}</Pill>}
                </div>
                <div className="stats">
                  <div>
                    <b>{b._count?.employees ?? 0}</b>
                    <small>{isAr ? "موظف" : "employees"}</small>
                  </div>
                  <div>
                    <b>{docs}</b>
                    <small>{isAr ? "وثيقة" : "documents"}</small>
                  </div>
                  <div>
                    <b style={{ color: x.expired ? "var(--l-rose)" : x.soon ? "var(--l-amber)" : undefined }}>{x.expired + x.soon}</b>
                    <small>{isAr ? "تحتاج متابعة" : "to follow up"}</small>
                  </div>
                </div>
                <div className="acts">
                  <button type="button" className="rp-chip" onClick={() => setDetailsTarget(b)}>
                    <Eye className="h-4 w-4" /> {t("common.viewDetails")}
                  </button>
                  {(hasPermission("branches.edit") || hasPermission("branches.delete")) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="lu-kebab" aria-label={t("common.actions")}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
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
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      <BranchDetailsDialog open={Boolean(detailsTarget)} branch={detailsTarget} onOpenChange={(open) => !open && setDetailsTarget(null)} onEdit={(b) => setDialog({ open: true, branch: b })} />
      <BranchDialog open={dialog.open} branch={dialog.branch} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("branches.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
