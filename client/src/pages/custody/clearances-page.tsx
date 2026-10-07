import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, MoreHorizontal, Plus, Printer, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LuPager } from "@/components/lulu/lulu-ui";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { DEPARTMENTS, REASONS, custodyApi, type Clearance, type CustodyQuery } from "@/api/custody";
import { CuHero, CuKpis, CuPill, CuSeg, EmployeeCell, dmy, money } from "@/pages/custody/custody-shared";
import { ClearanceDialog, printClearance } from "@/pages/custody/clearance-dialog";

/* End-of-service clearances, as in the approved preview: the royal band, the
   figures, a row per clearance with what still stands before its certificate,
   and the dialog that checks the custody back and gathers the sign-offs. */

type State = "all" | "open" | "issued";

export default function ClearancesPage() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
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
    <div className="cu">
      <CuHero
        icon={ShieldCheck}
        eyebrow="Certificate of Clearance"
        title={tr("إخلاء الطرف", "Clearance")}
        sub={tr("استرجع عهد الموظف، وخد تأكيد كل قسم، واطبع شهادة إخلاء الطرف بترويسة منشأته.", "Take the employee's custody back, gather each department's sign-off and print the certificate on their establishment's letterhead.")}
        actions={
          has("custody.create") && (
            <button type="button" className="cu-btn gold" onClick={() => setDialog({ open: true })}>
              <Plus /> {tr("إخلاء طرف جديد", "New clearance")}
            </button>
          )
        }
      />

      <CuKpis
        items={[
          { label: tr("إخلاءات مفتوحة", "Open clearances"), value: stats?.openClearances ?? "—", sub: tr("لسه ماصدرتش شهادتها", "Certificate not issued yet"), color: "var(--l-amber, #d97706)", onClick: () => filter("open"), active: state === "open" },
          { label: tr("شهادات صدرت", "Certificates issued"), value: stats?.issuedClearances ?? "—", sub: tr("إخلاء طرف نهائي", "Final clearance"), color: "var(--l-green, #16a34a)", onClick: () => filter("issued"), active: state === "issued" },
          { label: tr("أصناف لسه مع الموظفين", "Items still out"), value: stats?.itemsOut ?? "—", sub: tr("في كل المنشآت", "Across the establishments"), color: "var(--l-sky, #0284c7)" },
          { label: tr("قيمة العهد الحالية", "Value still out"), value: stats ? money(stats.valueOut) : "—", sub: tr("ريال سعودي", "Saudi riyals"), color: "var(--l-violet, #7c3aed)" },
        ]}
      />

      <div className="cu-tools no-print">
        <CuSeg
          value={state}
          onChange={filter}
          items={[
            { value: "all", label: tr("الكل", "All") },
            { value: "open", label: tr("مفتوحة", "Open") },
            { value: "issued", label: tr("صدرت شهادتها", "Issued") },
          ]}
        />
        <label className="cu-search">
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

      <section className="cu-card">
        <div className="cu-card-head">
          {tr("إخلاءات الطرف", "Clearances")}
          <small>{tr(`${total} إخلاء`, `${total} clearances`)}</small>
        </div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="cu-row"><div className="h-10 w-10 animate-pulse rounded-full bg-muted" /><div className="h-4 w-40 animate-pulse rounded bg-muted" /></div>)
        ) : rows.length === 0 ? (
          <div className="cu-empty">
            <b>{q || state !== "all" ? tr("مفيش إخلاءات بالفلتر ده", "No clearances match") : tr("لسه مفيش إخلاءات طرف", "No clearances yet")}</b>
            {!q && state === "all" && tr("لما موظف يسيب الشغل، اعمله إخلاء طرف من هنا.", "When an employee leaves, start their clearance here.")}
          </div>
        ) : (
          rows.map((c) => {
            const reason = REASONS.find((r) => r.value === c.reason);
            const signed = DEPARTMENTS.length - c.blockers.departmentsPending.length;
            return (
              <div key={c.id} className="cu-row" role="button" tabIndex={0} onClick={() => open(c)} onKeyDown={(e) => e.key === "Enter" && open(c)}>
                <EmployeeCell e={c.employee} />
                <div className="mid">
                  <b>{reason ? tr(reason.ar, reason.en) : c.reason} · {tr("آخر يوم", "Last day")} {dmy(c.lastWorkingDay)}</b>
                  <small><span className="num">{c.number}</span> · {tr("المستحقات", "Dues")} <span dir="ltr">{money(c.dues)}</span> {tr("ر.س", "SAR")}</small>
                </div>
                <span className="hide-sm">
                  {c.status === "ISSUED" ? (
                    <CuPill color="var(--l-green, #16a34a)">{tr("صدرت الشهادة", "Issued")}</CuPill>
                  ) : c.blockers.itemsOut > 0 ? (
                    <CuPill color="var(--l-amber, #d97706)">{tr(`${c.blockers.itemsOut} عهدة لسه برّه · ${signed}/${DEPARTMENTS.length} أقسام`, `${c.blockers.itemsOut} out · ${signed}/${DEPARTMENTS.length} signed`)}</CuPill>
                  ) : (
                    <CuPill color={signed === DEPARTMENTS.length ? "var(--l-sky, #0284c7)" : "var(--l-violet, #7c3aed)"}>{signed === DEPARTMENTS.length ? tr("جاهز للإصدار", "Ready to issue") : tr(`${signed}/${DEPARTMENTS.length} أقسام أكّدت`, `${signed}/${DEPARTMENTS.length} signed`)}</CuPill>
                  )}
                </span>
                <div className="acts" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  {has("custody.export") && (
                    <button type="button" className="cu-btn sm" onClick={() => printClearance(c)}>
                      <Printer /> <span className="hide-sm">{c.status === "ISSUED" ? tr("الشهادة", "Certificate") : tr("مسودة", "Draft")}</span>
                    </button>
                  )}
                  {((has("custody.edit") && c.status === "OPEN") || has("custody.delete")) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="cu-btn icon" aria-label={tr("إجراءات", "Actions")}>
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
              </div>
            );
          })
        )}
      </section>
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

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
