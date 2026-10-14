import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { localized, localizedCity } from "@/lib/names";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, MoreHorizontal, Plus, Search, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PxBadge, PxPager } from "@/components/royal/px";
import { Kpis } from "@/components/royal/rp";
import { initialsOf } from "@/components/royal/cards";
import { branchesApi } from "@/api/branches";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { companyDocumentsApi } from "@/api/companyDocuments";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import type { Branch } from "@/types/models";
import { BranchMedal } from "@/pages/branches/branch-logo";

/* Establishments in the Royal design, as in the approved preview: a card per
   establishment with its English name, a ring of its valid documents, the
   city and code, and its employees, documents and what needs follow-up. */

type Tally = { valid: number; soon: number; expired: number };

export default function BranchesPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; branch?: Branch }>({ open: false });
  const navigate = useNavigate();
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
    <div className="px">
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

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <div className="px-chd" style={{ padding: 0, border: 0 }}>
            <h3>{isAr ? "كل المؤسسات" : "All establishments"}</h3>
            <small>{isAr ? `${total} مؤسسة` : `${total} establishments`}</small>
          </div>
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
              placeholder={isAr ? "اسم المؤسسة أو رمزها" : "Establishment name or code"}
              aria-label={isAr ? "بحث" : "Search"}
            />
          </label>
        </div>
        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{isAr ? "المؤسسة" : "Establishment"}</th>
                <th className="hm">{isAr ? "الرمز" : "Code"}</th>
                <th className="hm">{isAr ? "المدينة" : "City"}</th>
                <th className="hm">{isAr ? "اسم المالك" : "Owner"}</th>
                <th>{isAr ? "الموظفون" : "Employees"}</th>
                <th>{isAr ? "الامتثال" : "Compliance"}</th>
                <th>{isAr ? "الحالة" : "Status"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8}>
                      <div className="h-9 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                    </td>
                  </tr>
                ))}
              {!isLoading && branches.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="px-empty">
                      <b>{t("branches.emptyTitle")}</b>
                      {hasPermission("branches.create") && (
                        <div className="mt-3">
                          <Button onClick={() => setDialog({ open: true })}>
                            <Plus className="h-4 w-4" /> {t("branches.addBranch")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                branches.map((b, j) => {
                  const x = tally.get(b.id) ?? { valid: 0, soon: 0, expired: 0 };
                  const docs = x.valid + x.soon + x.expired;
                  const name = localized(b.name, b.nameEn) || b.name;
                  const other = isAr ? b.nameEn : b.name;
                  const pct = docs ? Math.round((x.valid / docs) * 100) : null;
                  const open = () => navigate(`/branches/${b.id}`);
                  return (
                    <tr key={b.id} className="click" style={{ ["--j" as string]: j }} onClick={open}>
                      <td>
                        <div className="px-who">
                          <span className="px-av px-lit">{b.logoFileId ? <BranchMedal fileId={b.logoFileId} name={name} /> : <span className="px-ini">{initialsOf(name)}</span>}</span>
                          <div>
                            <b>{name}</b>
                            {other && other !== name && (
                              <small>
                                <bdi>{other}</bdi>
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hm mono">{b.code}</td>
                      <td className="hm">{localizedCity(b.city, b.cityEn) || "—"}</td>
                      <td className="hm">{b.ownerName || "—"}</td>
                      <td className="mono">{b._count?.employees ?? 0}</td>
                      <td>
                        {pct === null ? (
                          <span className="text-[var(--l-muted)]">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="px-bar" style={{ ["--c" as string]: pct >= 90 ? "var(--l-green)" : pct >= 60 ? "var(--l-amber)" : "var(--l-rose)" }}>
                              <u style={{ width: `${Math.max(4, pct)}%` }} />
                            </div>
                            <b className="mono text-[13px]">{pct}%</b>
                          </div>
                        )}
                        {x.expired + x.soon > 0 && <small className="block text-[12px] text-[var(--l-muted)]">{isAr ? `${x.expired + x.soon} تحتاج متابعة` : `${x.expired + x.soon} to follow up`}</small>}
                      </td>
                      <td>
                        <PxBadge tone={b.status === "INACTIVE" ? "mut" : "ok"}>{b.status === "INACTIVE" ? (isAr ? "غير نشطة" : "Inactive") : isAr ? "نشطة" : "Active"}</PxBadge>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button type="button" className="px-btn" onClick={() => navigate(`/employees?branchId=${b.id}`)}>
                            <Users /> {isAr ? "الموظفون" : "Employees"}
                          </button>
                          {(hasPermission("branches.edit") || hasPermission("branches.delete")) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="px-iconbtn" aria-label={t("common.actions")}>
                                  <MoreHorizontal />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                                <DropdownMenuItem className="rounded-2xl" onSelect={open}>
                                  <Eye className="me-2 h-4 w-4" /> {isAr ? "التفاصيل" : "Details"}
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
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <PxPager page={page} pages={pages} total={total} pageSize={pageSize} onChange={setPage} />
      </section>

      <BranchDialog open={dialog.open} branch={dialog.branch} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("branches.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
