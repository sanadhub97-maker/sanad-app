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
import { LuPager } from "@/components/lulu/lulu-ui";
import { Kpis } from "@/components/royal/rp";
import { LicCard, Ticker, estColor, initialsOf } from "@/components/royal/cards";
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
    <div className="rp rc">
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
        <div className="rc-lic-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[440px] animate-pulse rounded-[24px] bg-[var(--l-surface)]" />
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
        <div className="rc-lic-grid">
          {branches.map((b, j) => {
            const x = tally.get(b.id) ?? { valid: 0, soon: 0, expired: 0 };
            const docs = x.valid + x.soon + x.expired;
            const city = localizedCity(b.city, b.cityEn);
            const name = localized(b.name, b.nameEn) || b.name;
            const other = isAr ? b.nameEn : b.name;
            const own = (coDocs?.data ?? []).filter((d) => (d.branchId ?? d.branch?.id) === b.id);
            const pct = docs ? Math.round((x.valid / docs) * 100) : 0;
            const open = () => navigate(`/branches/${b.id}`);
            return (
              <LicCard
                key={b.id}
                i={j}
                color={estColor(b.code || b.id)}
                code={b.code}
                status={b.status === "INACTIVE" ? (isAr ? "غير نشطة" : "Inactive") : isAr ? "نشطة" : "Active"}
                statusColor={b.status === "INACTIVE" ? "#ff9a9a" : undefined}
                seal={b.logoFileId ? <BranchMedal fileId={b.logoFileId} name={name} className="in-seal" /> : initialsOf(name)}
                title={name}
                sub={other && other !== name ? <bdi>{other}</bdi> : undefined}
                onOpen={open}
                facts={[
                  [isAr ? "اسم المالك" : "Owner name", b.ownerName || "—"],
                  [isAr ? "المدينة" : "City", city],
                  [isAr ? "الرمز" : "Code", <span className="rp-mono">{b.code}</span>],
                  [isAr ? "المسؤول" : "Manager", b.manager?.fullName],
                  [isAr ? "الجوال" : "Phone", b.phone ? <span className="rp-num">{b.phone}</span> : null],
                ]}
                stats={[
                  { value: b._count?.employees ?? 0, label: isAr ? "موظف" : "employees" },
                  { value: docs, label: isAr ? "وثيقة" : "documents" },
                  { value: x.expired + x.soon, label: isAr ? "تحتاج متابعة" : "to follow up", color: x.expired ? "var(--bad)" : x.soon ? "var(--warn)" : "var(--ok)" },
                ]}
                comp={docs ? { pct, title: isAr ? "الامتثال" : "Compliance", sub: isAr ? `${x.valid} من ${docs} سارية` : `${x.valid} of ${docs} valid` } : undefined}
                ticker={<Ticker items={own.map((d) => ({ key: d.id, label: t(`documentCategories.${d.category}`), date: d.expiryDate }))} />}
                actions={
                  <>
                    <button type="button" className="rc-btn" onClick={open}>
                      <Eye />
                      {isAr ? "التفاصيل" : "Details"}
                    </button>
                    <button type="button" className="rc-btn" onClick={() => navigate(`/employees?branchId=${b.id}`)}>
                      <Users />
                      {isAr ? "الموظفون" : "Employees"}
                    </button>
                    {(hasPermission("branches.edit") || hasPermission("branches.delete")) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="rc-btn icon" aria-label={t("common.actions")}>
                            <MoreHorizontal />
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
                  </>
                }
              />
            );
          })}
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      <BranchDialog open={dialog.open} branch={dialog.branch} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("branches.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
