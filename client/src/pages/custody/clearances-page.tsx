import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Edit, PackageCheck, Plus, Printer, Search, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { PxBadge, PxPager, PxStat, PxTabs } from "@/components/royal/px";
import { getErrorMessage } from "@/lib/api";
import { DEPARTMENTS, REASONS, custodyApi, type Clearance, type CustodyQuery } from "@/api/custody";
import { EmployeeCell, dmy, money } from "@/pages/custody/custody-shared";
import { ClearanceDialog, printClearance } from "@/pages/custody/clearance-dialog";

/* End-of-service clearances: saved in the page with full Add, Edit, Print, and Delete capabilities. */

type State = "all" | "open" | "issued";

export default function ClearancesPage() {
  const qc = useQueryClient();
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
  const open = (c: Clearance) => setDialog({ open: true, clearance: c });

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
        description={tr("استرجع عهد الموظف، وخد تأكيد كل قسم، واحفظ وعدّل واطبع شهادة إخلاء الطرف بترويسة منشأته في أي وقت.", "Take the employee's custody back, gather each department's sign-off, and save, edit or print the clearance certificate at any time.")}
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus className="h-4 w-4" /> {tr("إخلاء طرف جديد", "New clearance")}
          </Button>
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
                <th>{tr("الإجراءات", "Actions")}</th>
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
                      {!q && state === "all" && tr("لما موظف يسيب الشغل، اعمله إخلاء طرف من هنا وهيتحفظ للرجوع إليه في أي وقت.", "When an employee leaves, start their clearance here.")}
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
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="px-btn" onClick={() => setDialog({ open: true, clearance: c })} title={tr("تعديل إخلاء الطرف", "Edit clearance")}>
                            <Edit /> {tr("تعديل", "Edit")}
                          </button>
                          <button type="button" className="px-btn" onClick={() => printClearance(c)} title={tr("طباعة PDF", "Print PDF")}>
                            <Printer /> {c.status === "ISSUED" ? tr("الشهادة", "Certificate") : tr("طباعة", "Print")}
                          </button>
                          <button
                            type="button"
                            className="px-iconbtn text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleting(c)}
                            aria-label={tr("حذف", "Delete")}
                            title={tr("حذف إخلاء الطرف", "Delete clearance")}
                          >
                            <Trash2 />
                          </button>
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
        description={tr("سيتم حذف إخلاء الطرف من السجل، والأصناف المسجلة عليه سترجع لحالتها مع الموظف.", "This clearance will be removed, and items ticked back on it will count as with the employee again.")}
        onConfirm={remove}
      />
    </div>
  );
}
