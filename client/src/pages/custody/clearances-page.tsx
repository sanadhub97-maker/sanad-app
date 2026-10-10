import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Edit, MoreHorizontal, PackageCheck, Plus, Printer, Search, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { PxBadge, PxPager, PxStat, PxTabs } from "@/components/royal/px";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { DEPARTMENTS, REASONS, custodyApi, type Clearance, type CustodyQuery } from "@/api/custody";
import { EmployeeCell, dmy, money } from "@/pages/custody/custody-shared";
import { ClearanceDialog, printClearance } from "@/pages/custody/clearance-dialog";

/* End-of-service clearances, as in the approved preview: the royal band, the
   figures, a row per clearance with what still stands before its certificate,
   and the dialog that checks the custody back and gathers the sign-offs. */

type State = "all" | "open" | "issued";

export default function ClearancesPage() {
  const qc = useQueryClient();
  const has = useAuthStore((s) => s.hasPermission);
  const [state, setState] = useState<State>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; clearance?: Clearance }>({ open: false });
  const [deleting, setDeleting] = useState<Clearance | null>(null);
  const pageSize = 25;

  const query: CustodyQuery = { state, q: q || undefined, page, pageSize };
  const { data, isLoading } = useQuery({ queryKey: ["custody", "clearances", query], queryFn: () => custodyApi.clearances(query) });
  const { data: stats } = useQuery({ queryKey: ["custody", "stats"], queryFn: custodyApi.stats });
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const filter = (s: State) => {
    setState(s);
    setPage(1);
  };
  const open = (c: Clearance) => (c.status === "OPEN" && has("custody.edit") ? setDialog({ open: true, clearance: c }) : has("custody.export") ? printClearance(c) : undefined);

  async function remove() {
    if (!deleting) return;
    try {
      await custodyApi.removeClearance(deleting.id);
      toast.success(tr("تم حذف إخلاء الطرف", "Clearance deleted"));
      qc.invalidateQueries({ queryKey: ["custody"] });
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="px cu">
      <PageHeader
        title={tr("إخلاء الطرف", "Clearance")}
        description={tr("استرجع عهد الموظف، وخد تأكيد كل قسم، واطبع شهادة إخلاء الطرف بترويسة منشأته.", "Take the employee's custody back, gather each department's sign-off and print the certificate on their establishment's letterhead.")}
        actions={
          has("custody.create") && (
            <Button onClick={() => setDialog({ open: true })}>
              <Plus className="h-4 w-4" /> {tr("إخلاء طرف جديد", "New clearance")}
            </Button>
          )
        }
      />

      <div className="px-stats">
        <PxStat i={1} label={tr("إخلاءات مفتوحة", "Open clearances")} value={stats?.openClearances ?? 0} icon={Clock} color="#d97706" sub={tr("لسه ماصدرتش شهادتها", "Certificate not issued yet")} onClick={() => filter("open")} active={state === "open"} />
        <PxStat i={2} label={tr("شهادات صدرت", "Certificates issued")} value={stats?.issuedClearances ?? 0} icon={ShieldCheck} color="#16a34a" sub={tr("إخلاء طرف نهائي", "Final clearance")} onClick={() => filter("issued")} active={state === "issued"} />
        <PxStat i={3} label={tr("أصناف لسه مع الموظفين", "Items still out")} value={stats?.itemsOut ?? 0} icon={PackageCheck} color="#0284c7" sub={tr("في كل المنشآت", "Across the establishments")} />
        <PxStat i={4} label={tr("قيمة العهد الحالية", "Value still out")} value={stats ? Math.round(stats.valueOut) : 0} unit={tr("ر.س", "SAR")} icon={Wallet} color="#7c3aed" sub={tr("ريال سعودي", "Saudi riyals")} />
      </div>

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <PxTabs
            value={state}
            onChange={filter}
            items={[
              { key: "all", label: tr("الكل", "All") },
              { key: "open", label: tr("مفتوحة", "Open") },
              { key: "issued", label: tr("صدرت شهادتها", "Issued") },
            ]}
          />
          <span className="sp" />
          <label className="px-search">
            <Search />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={tr("اسم الموظف أو رقمه أو رقم الإخلاء", "Employee or clearance number")}
              aria-label={tr("بحث", "Search")}
            />
          </label>
        </div>
        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{tr("رقم الإخلاء", "Number")}</th>
                <th>{tr("الموظف", "Employee")}</th>
                <th className="hm">{tr("السبب", "Reason")}</th>
                <th>{tr("آخر يوم", "Last day")}</th>
                <th className="hm">{tr("المستحقات", "Dues")}</th>
                <th>{tr("الحالة", "Status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-9 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                    </td>
                  </tr>
                ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="px-empty">
                      <b>{q || state !== "all" ? tr("مفيش إخلاءات بالفلتر ده", "No clearances match") : tr("لسه مفيش إخلاءات طرف", "No clearances yet")}</b>
                      {!q && state === "all" && tr("لما موظف يسيب الشغل، اعمله إخلاء طرف من هنا.", "When an employee leaves, start their clearance here.")}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((c, j) => {
                  const reason = REASONS.find((r) => r.value === c.reason);
                  const signed = DEPARTMENTS.length - c.blockers.departmentsPending.length;
                  return (
                    <tr key={c.id} className="click" style={{ ["--j" as string]: j }} onClick={() => open(c)}>
                      <td className="mono">
                        <b>{c.number}</b>
                      </td>
                      <td>
                        <EmployeeCell e={c.employee} />
                      </td>
                      <td className="hm">{reason ? tr(reason.ar, reason.en) : c.reason}</td>
                      <td className="mono">{dmy(c.lastWorkingDay)}</td>
                      <td className="hm mono">
                        {money(c.dues)} {tr("ر.س", "SAR")}
                      </td>
                      <td>
                        {c.status === "ISSUED" ? (
                          <PxBadge tone="ok">{tr("صدرت الشهادة", "Issued")}</PxBadge>
                        ) : c.blockers.itemsOut > 0 ? (
                          <PxBadge tone="warn">{tr(`${c.blockers.itemsOut} عهدة لسه برّه · ${signed}/${DEPARTMENTS.length} أقسام`, `${c.blockers.itemsOut} out · ${signed}/${DEPARTMENTS.length} signed`)}</PxBadge>
                        ) : (
                          <PxBadge tone={signed === DEPARTMENTS.length ? "ok" : "mut"}>{signed === DEPARTMENTS.length ? tr("جاهز للإصدار", "Ready to issue") : tr(`${signed}/${DEPARTMENTS.length} أقسام أكّدت`, `${signed}/${DEPARTMENTS.length} signed`)}</PxBadge>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {has("custody.export") && (
                            <button type="button" className="px-btn" onClick={() => printClearance(c)}>
                              <Printer /> {c.status === "ISSUED" ? tr("الشهادة", "Certificate") : tr("مسودة", "Draft")}
                            </button>
                          )}
                          {((has("custody.edit") && c.status === "OPEN") || has("custody.delete")) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="px-iconbtn" aria-label={tr("إجراءات", "Actions")}>
                                  <MoreHorizontal />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-3xl p-2">
                                {has("custody.edit") && c.status === "OPEN" && (
                                  <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, clearance: c })}>
                                    <Edit className="me-2 h-4 w-4" /> {tr("متابعة", "Continue")}
                                  </DropdownMenuItem>
                                )}
                                {has("custody.delete") && (
                                  <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleting(c)}>
                                    <Trash2 className="me-2 h-4 w-4" /> {tr("حذف", "Delete")}
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

      <ClearanceDialog open={dialog.open} clearance={dialog.clearance} onOpenChange={(o) => setDialog({ open: o })} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={tr(`حذف ${deleting?.number ?? ""}؟`, `Delete ${deleting?.number ?? ""}?`)}
        description={deleting?.status === "OPEN" ? tr("الأصناف اللي اتعلّم عليها في الإخلاء ده هترجع تتحسب مع الموظف.", "Items ticked back on this clearance count as with the employee again.") : undefined}
        onConfirm={remove}
      />
    </div>
  );
}
