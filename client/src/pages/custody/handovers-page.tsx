import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Edit, MoreHorizontal, PackageCheck, Plus, Printer, Search, ShieldCheck, Trash2, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { PxBadge, PxPager, PxStat, PxTabs } from "@/components/royal/px";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { custodyApi, type CustodyHandover, type CustodyQuery } from "@/api/custody";
import { EmployeeCell, dmy, money } from "@/pages/custody/custody-shared";
import { HandoverDialog, ReturnDialog, printHandover } from "@/pages/custody/handover-dialog";

/* Custody handovers, as in the approved preview: the royal band, the figures,
   and a row per handover record with what is still out; a dialog to hand
   items over, and printing on the employee's establishment letterhead. */

type State = NonNullable<CustodyQuery["state"]>;

export default function HandoversPage() {
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
    <div className="px cu">
      <PageHeader
        title={tr("تسليم العهد", "Custody handover")}
        description={tr("سجّل اللي استلمه كل موظف من أجهزة وأدوات، واطبع المحضر بترويسة منشأته وشعارها.", "Record what each employee received and print the record on their establishment's letterhead.")}
        actions={
          has("custody.create") && (
            <Button onClick={() => setDialog({ open: true })}>
              <Plus className="h-4 w-4" /> {tr("تسليم عهدة", "Hand over custody")}
            </Button>
          )
        }
      />

      <div className="px-stats">
        <PxStat i={1} label={tr("محاضر التسليم", "Handover records")} value={stats?.handovers ?? 0} icon={PackageCheck} color="#c2410c" sub={tr("كل المحاضر المسجلة", "All records")} onClick={() => filter("all")} active={state === "all"} />
        <PxStat i={2} label={tr("أصناف لسه مع الموظفين", "Items still out")} value={stats?.itemsOut ?? 0} icon={Clock} color="#d97706" sub={tr("ماترجعتش لسه", "Not returned yet")} onClick={() => filter("open")} active={state === "open"} />
        <PxStat i={3} label={tr("قيمة العهد الحالية", "Value still out")} value={stats ? Math.round(stats.valueOut) : 0} unit={tr("ر.س", "SAR")} icon={Wallet} color="#2563eb" sub={tr("ريال سعودي", "Saudi riyals")} />
        <PxStat i={4} label={tr("إخلاءات طرف مفتوحة", "Open clearances")} value={stats?.openClearances ?? 0} icon={ShieldCheck} color="#7c3aed" sub={tr(`${stats?.issuedClearances ?? 0} شهادة صدرت`, `${stats?.issuedClearances ?? 0} issued`)} />
      </div>

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <PxTabs
            value={state}
            onChange={filter}
            items={[
              { key: "all", label: tr("الكل", "All") },
              { key: "open", label: tr("فيها عهد لسه برّه", "Items out") },
              { key: "returned", label: tr("رجعت كلها", "All returned") },
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
              placeholder={tr("اسم الموظف أو رقم المحضر أو الصنف", "Employee, record number or item")}
              aria-label={tr("بحث", "Search")}
            />
          </label>
        </div>
        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{tr("رقم المحضر", "Record")}</th>
                <th>{tr("الموظف", "Employee")}</th>
                <th className="hm">{tr("الأصناف", "Items")}</th>
                <th className="hm">{tr("القيمة", "Value")}</th>
                <th>{tr("التاريخ", "Date")}</th>
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
                      <b>{q || state !== "all" ? tr("مفيش محاضر بالفلتر ده", "No records match") : tr("لسه مفيش عهد مسلّمة", "No custody handed over yet")}</b>
                      {!q && state === "all" && tr("ابدأ بأول محضر: اختار الموظف وضيف اللي استلمه.", "Start with the first record: choose the employee and add what they received.")}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((h, j) => (
                  <tr key={h.id} className={has("custody.edit") ? "click" : undefined} style={{ ["--j" as string]: j }} onClick={() => has("custody.edit") && setDialog({ open: true, handover: h })}>
                    <td className="mono">
                      <b>{h.number}</b>
                    </td>
                    <td>
                      <EmployeeCell e={h.employee} />
                    </td>
                    <td className="hm">
                      {h.items.slice(0, 3).map((i) => i.kind).join("، ")}
                      {h.items.length > 3 ? tr(` و${h.items.length - 3} كمان`, ` +${h.items.length - 3}`) : ""}
                    </td>
                    <td className="hm mono">
                      {money(h.totalValue)} {tr("ر.س", "SAR")}
                    </td>
                    <td className="mono">{dmy(h.date)}</td>
                    <td>{h.itemsOut === 0 ? <PxBadge tone="ok">{tr("رجعت كلها", "All returned")}</PxBadge> : <PxBadge tone="warn">{tr(`${h.itemsOut} من ${h.itemCount} مع الموظف`, `${h.itemsOut} of ${h.itemCount} out`)}</PxBadge>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {has("custody.export") && (
                          <button type="button" className="px-btn" onClick={() => printHandover(h)}>
                            <Printer /> {tr("طباعة", "Print")}
                          </button>
                        )}
                        {(has("custody.edit") || has("custody.delete")) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="px-iconbtn" aria-label={tr("إجراءات", "Actions")}>
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
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <PxPager page={page} pages={pages} total={total} pageSize={pageSize} onChange={setPage} />
      </section>

      <HandoverDialog open={dialog.open} handover={dialog.handover} onOpenChange={(open) => setDialog({ open })} />
      <ReturnDialog handover={returning} onOpenChange={(o) => !o && setReturning(null)} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} title={tr(`حذف المحضر ${deleting?.number ?? ""}؟`, `Delete ${deleting?.number ?? ""}?`)} onConfirm={remove} />
    </div>
  );
}
