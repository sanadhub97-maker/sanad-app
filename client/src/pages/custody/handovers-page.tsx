import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, MoreHorizontal, PackageCheck, Plus, Printer, Search, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LuPager } from "@/components/lulu/lulu-ui";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { custodyApi, type CustodyHandover, type CustodyQuery } from "@/api/custody";
import { CuHero, CuKpis, CuPill, CuSeg, EmployeeCell, dmy, money } from "@/pages/custody/custody-shared";
import { HandoverDialog, ReturnDialog, printHandover } from "@/pages/custody/handover-dialog";

/* Custody handovers, as in the approved preview: the royal band, the figures,
   and a row per handover record with what is still out; a dialog to hand
   items over, and printing on the employee's establishment letterhead. */

type State = NonNullable<CustodyQuery["state"]>;

export default function HandoversPage() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const qc = useQueryClient();
  const has = useAuthStore((s) => s.hasPermission);
  const [state, setState] = useState<State>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; handover?: CustodyHandover }>({ open: false });
  const [returning, setReturning] = useState<CustodyHandover | null>(null);
  const [deleting, setDeleting] = useState<CustodyHandover | null>(null);
  const pageSize = 25;

  const query: CustodyQuery = { state, q: q || undefined, page, pageSize };
  const { data, isLoading } = useQuery({ queryKey: ["custody", "handovers", query], queryFn: () => custodyApi.handovers(query) });
  const { data: stats } = useQuery({ queryKey: ["custody", "stats"], queryFn: custodyApi.stats });
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function remove() {
    if (!deleting) return;
    try {
      await custodyApi.removeHandover(deleting.id);
      toast.success(tr("تم حذف المحضر", "Record deleted"));
      qc.invalidateQueries({ queryKey: ["custody"] });
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const filter = (s: State) => {
    setState(s);
    setPage(1);
  };

  return (
    <div className="cu">
      <CuHero
        icon={PackageCheck}
        eyebrow="Custody Handover"
        title={tr("تسليم العهد", "Custody handover")}
        sub={tr("سجّل اللي استلمه كل موظف من أجهزة وأدوات، واطبع المحضر بترويسة منشأته وشعارها.", "Record what each employee received and print the record on their establishment's letterhead.")}
        actions={
          has("custody.create") && (
            <button type="button" className="cu-btn gold" onClick={() => setDialog({ open: true })}>
              <Plus /> {tr("تسليم عهدة", "Hand over custody")}
            </button>
          )
        }
      />

      <CuKpis
        items={[
          { label: tr("محاضر التسليم", "Handover records"), value: stats?.handovers ?? "—", sub: tr("كل المحاضر المسجلة", "All records"), onClick: () => filter("all"), active: state === "all" },
          { label: tr("أصناف لسه مع الموظفين", "Items still out"), value: stats?.itemsOut ?? "—", sub: tr("ماترجعتش لسه", "Not returned yet"), color: "var(--l-amber, #d97706)", onClick: () => filter("open"), active: state === "open" },
          { label: tr("قيمة العهد الحالية", "Value still out"), value: stats ? money(stats.valueOut) : "—", sub: tr("ريال سعودي", "Saudi riyals"), color: "var(--l-sky, #0284c7)" },
          { label: tr("إخلاءات طرف مفتوحة", "Open clearances"), value: stats?.openClearances ?? "—", sub: tr(`${stats?.issuedClearances ?? 0} شهادة صدرت`, `${stats?.issuedClearances ?? 0} issued`), color: "var(--l-violet, #7c3aed)" },
        ]}
      />

      <div className="cu-tools no-print">
        <CuSeg
          value={state}
          onChange={filter}
          items={[
            { value: "all", label: tr("الكل", "All") },
            { value: "open", label: tr("فيها عهد لسه برّه", "Items out") },
            { value: "returned", label: tr("رجعت كلها", "All returned") },
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
            placeholder={tr("اسم الموظف أو رقمه أو رقم المحضر أو الصنف", "Employee, record number, item or serial")}
            aria-label={tr("بحث", "Search")}
          />
        </label>
      </div>

      <section className="cu-card">
        <div className="cu-card-head">
          {tr("المحاضر", "Records")}
          <small>{tr(`${total} محضر`, `${total} records`)}</small>
        </div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="cu-row"><div className="h-10 w-10 animate-pulse rounded-full bg-muted" /><div className="h-4 w-40 animate-pulse rounded bg-muted" /></div>)
        ) : rows.length === 0 ? (
          <div className="cu-empty">
            <b>{q || state !== "all" ? tr("مفيش محاضر بالفلتر ده", "No records match") : tr("لسه مفيش عهد مسلّمة", "No custody handed over yet")}</b>
            {!q && state === "all" && tr("ابدأ بأول محضر: اختار الموظف وضيف اللي استلمه.", "Start with the first record: choose the employee and add what they received.")}
          </div>
        ) : (
          rows.map((h) => (
            <div key={h.id} className="cu-row" role="button" tabIndex={0} onClick={() => has("custody.edit") && setDialog({ open: true, handover: h })} onKeyDown={(e) => e.key === "Enter" && has("custody.edit") && setDialog({ open: true, handover: h })}>
              <EmployeeCell e={h.employee} />
              <div className="mid">
                <b>{h.items.slice(0, 3).map((i) => i.kind).join("، ")}{h.items.length > 3 ? tr(` و${h.items.length - 3} كمان`, ` +${h.items.length - 3}`) : ""}</b>
                <small><span className="num">{h.number}</span> · {dmy(h.date)} · <span dir="ltr">{money(h.totalValue)}</span> {tr("ر.س", "SAR")}</small>
              </div>
              <span className="hide-sm">
                {h.itemsOut === 0 ? <CuPill color="var(--l-green, #16a34a)">{tr("رجعت كلها", "All returned")}</CuPill> : <CuPill color="var(--l-amber, #d97706)">{tr(`${h.itemsOut} من ${h.itemCount} مع الموظف`, `${h.itemsOut} of ${h.itemCount} out`)}</CuPill>}
              </span>
              <div className="acts" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {has("custody.export") && (
                  <button type="button" className="cu-btn sm" onClick={() => printHandover(h)}>
                    <Printer /> <span className="hide-sm">{tr("طباعة", "Print")}</span>
                  </button>
                )}
                {(has("custody.edit") || has("custody.delete")) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="cu-btn icon" aria-label={tr("إجراءات", "Actions")}>
                        <MoreHorizontal />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-3xl p-2">
                      {has("custody.edit") && (
                        <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, handover: h })}>
                          <Edit className="me-2 h-4 w-4" /> {tr("تعديل", "Edit")}
                        </DropdownMenuItem>
                      )}
                      {has("custody.edit") && h.itemsOut > 0 && (
                        <DropdownMenuItem className="rounded-2xl" onSelect={() => setReturning(h)}>
                          <Undo2 className="me-2 h-4 w-4" /> {tr("استرجاع أصناف", "Return items")}
                        </DropdownMenuItem>
                      )}
                      {has("custody.delete") && (
                        <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleting(h)}>
                          <Trash2 className="me-2 h-4 w-4" /> {tr("حذف", "Delete")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </section>
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      <HandoverDialog open={dialog.open} handover={dialog.handover} onOpenChange={(open) => setDialog({ open })} />
      <ReturnDialog handover={returning} onOpenChange={(o) => !o && setReturning(null)} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} title={tr(`حذف المحضر ${deleting?.number ?? ""}؟`, `Delete ${deleting?.number ?? ""}?`)} onConfirm={remove} />
    </div>
  );
}
