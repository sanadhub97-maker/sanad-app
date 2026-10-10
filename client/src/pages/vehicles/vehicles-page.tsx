import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Car, Download, FileSpreadsheet, MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PxBadge, PxStat, PxTabs, type BadgeTone } from "@/components/royal/px";
import { getErrorMessage } from "@/lib/api";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { useAuthStore } from "@/stores/authStore";
import { listActiveBranches } from "@/api/branches";
import { vehiclesApi, type Vehicle, type VehicleState } from "@/api/vehicles";
import { RenewDialog, VehicleDialog } from "@/pages/vehicles/vehicle-dialogs";
import "@/styles/vehicles.css";

/* The vehicles page as in the approved luxury preview: four figure cards, then
   one card with the follow-up tabs, search and establishment filter over a
   table of cars — the plate, the driver, and how long is left on the periodic
   inspection, the insurance and the registration. */

const dmy = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
const toneOf = (d: number | null): BadgeTone => (d === null ? "mut" : d <= 0 ? "bad" : d <= 30 ? "warn" : "ok");
const leftText = (d: number | null) => (d === null ? tr("غير مسجّلة", "Not recorded") : d < 0 ? tr(`منذ ${-d} يوم`, `${-d}d ago`) : d === 0 ? tr("اليوم", "Today") : tr(`بعد ${d} يوم`, `in ${d}d`));

/** A Saudi plate: digits and letters in Arabic over the Latin ones. */
function Plate({ v }: { v: Vehicle }) {
  const ar = (s: string) => s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
  return (
    <span className="px-plate" dir="ltr" aria-label={`${tr("اللوحة", "Plate")} ${v.plateLetters} ${v.plateNumber}`}>
      <span>
        <b>{ar(v.plateNumber)}</b>
        <i>{v.plateNumber.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))}</i>
      </span>
      <span>
        <b>{v.plateLetters}</b>
        <i>KSA</i>
      </span>
    </span>
  );
}

function DateCell({ date, days }: { date: string | null; days: number | null }) {
  return (
    <div className="grid gap-0.5">
      <PxBadge tone={toneOf(days)}>{leftText(days)}</PxBadge>
      {date && <small className="mono text-[12px] text-[var(--l-muted)]">{dmy(date)}</small>}
    </div>
  );
}

export default function VehiclesPage() {
  const qc = useQueryClient();
  const has = useAuthStore((s) => s.hasPermission);
  const [params] = useSearchParams();
  const focusId = params.get("focus");
  const [state, setState] = useState<VehicleState>("all");
  const [branchId, setBranchId] = useState("");
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; vehicle?: Vehicle }>({ open: false });
  const [renewing, setRenewing] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  const query = { state, branchId: branchId || undefined, q: q || undefined, pageSize: 500 };
  const { data, isLoading } = useQuery({ queryKey: ["vehicles", "list", query], queryFn: () => vehiclesApi.list(query), placeholderData: keepPreviousData });
  const { data: stats } = useQuery({ queryKey: ["vehicles", "stats"], queryFn: vehiclesApi.stats });
  const { data: branches = [] } = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches, enabled: has("branches.view") });
  const cars = data?.data ?? [];
  const exportParams = { state, branchId: branchId || undefined, q: q || undefined };

  async function remove() {
    if (!deleting) return;
    try {
      await vehiclesApi.remove(deleting.id);
      toast.success(tr("اتحذفت السيارة", "Vehicle deleted"));
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const tabs: { key: VehicleState; label: string; count?: number }[] = [
    { key: "all", label: tr("الكل", "All"), count: stats?.total },
    { key: "expired", label: tr("فيها منتهي", "Something expired"), count: stats?.expired },
    { key: "soon", label: tr("قريبة", "Ending soon"), count: stats?.soon },
    { key: "INSPECTION", label: tr("الفحص الدوري", "Inspection"), count: stats?.inspection },
    { key: "INSURANCE", label: tr("التأمين", "Insurance"), count: stats?.insurance },
    { key: "REGISTRATION", label: tr("الاستمارة", "Registration"), count: stats?.registration },
  ];

  return (
    <div className="px">
      <PageHeader
        title={tr("السيارات", "Vehicles")}
        description={stats ? tr(`${stats.total} سيارة · ${stats.expired} فيها حاجة منتهية و${stats.soon} قريبة من الانتهاء`, `${stats.total} vehicles · ${stats.expired} with something expired, ${stats.soon} ending soon`) : tr("الفحص الدوري والتأمين والاستمارة", "Inspection, insurance and registration")}
        actions={
          <>
            {has("vehicles.export") && (
              <>
                <Button variant="outline" onClick={() => openPdfInNewTab("/vehicles/export", { ...exportParams, format: "pdf" }, "vehicles.pdf").catch(() => undefined)}>
                  <Download className="h-4 w-4" /> {tr("تقرير PDF", "PDF report")}
                </Button>
                <Button variant="outline" onClick={() => downloadFile("/vehicles/export", { ...exportParams, format: "xlsx" }, "vehicles.xlsx").catch(() => undefined)}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
              </>
            )}
            {has("vehicles.create") && (
              <Button onClick={() => setDialog({ open: true })}>
                <Plus className="h-4 w-4" /> {tr("إضافة سيارة", "Add a vehicle")}
              </Button>
            )}
          </>
        }
      />

      <div className="px-stats">
        <PxStat i={1} label={tr("كل السيارات", "All vehicles")} value={stats?.total ?? 0} icon={Car} color="#d97706" sub={tr(`${stats?.allValid ?? 0} كلها سارية`, `${stats?.allValid ?? 0} fully valid`)} onClick={() => setState("all")} active={state === "all"} />
        <PxStat i={2} label={tr("فيها منتهي", "Something expired")} value={stats?.expired ?? 0} icon={AlertTriangle} color="#dc2626" sub={tr("فحص أو تأمين أو استمارة", "Inspection, insurance or registration")} onClick={() => setState("expired")} active={state === "expired"} />
        <PxStat i={3} label={tr("الفحص الدوري", "Inspection")} value={stats?.inspection ?? 0} icon={Wrench} color="#2563eb" sub={tr("قريب أو منتهي", "Soon or expired")} onClick={() => setState("INSPECTION")} active={state === "INSPECTION"} />
        <PxStat i={4} label={tr("التأمين", "Insurance")} value={stats?.insurance ?? 0} icon={ShieldCheck} color="#7c3aed" sub={tr("قريب أو منتهي", "Soon or expired")} onClick={() => setState("INSURANCE")} active={state === "INSURANCE"} />
      </div>

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <PxTabs items={tabs} value={state} onChange={setState} label={tr("نوع المتابعة", "Filter")} />
          <span className="sp" />
          <label className="px-search">
            <Search />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("اللوحة أو الرقم التسلسلي أو المالك أو السائق", "Plate, serial, owner or driver")} aria-label={tr("بحث", "Search")} />
          </label>
          {branches.length > 0 && (
            <Select value={branchId || "all"} onValueChange={(v) => setBranchId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-[38px] w-48 shrink-0 rounded-[10px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr("كل المؤسسات", "All establishments")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {tr(b.name, b.nameEn || b.name)}
                  </SelectItem>
                ))}
                <SelectItem value="none">{tr("بدون مؤسسة", "No establishment")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{tr("السيارة", "Vehicle")}</th>
                <th>{tr("اللوحة", "Plate")}</th>
                <th className="hm">{tr("السائق", "Driver")}</th>
                <th>{tr("الفحص الدوري", "Inspection")}</th>
                <th>{tr("التأمين", "Insurance")}</th>
                <th className="hm">{tr("الاستمارة", "Registration")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-10 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                    </td>
                  </tr>
                ))}
              {!isLoading && cars.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="px-empty">
                      <b>{q || state !== "all" || branchId ? tr("مفيش سيارات بالفلتر ده", "No vehicles match") : tr("لسه مفيش سيارات", "No vehicles yet")}</b>
                      {!q && state === "all" && !branchId && tr("ضيف أول سيارة، وتابع فحصها الدوري وتأمينها واستمارتها من هنا.", "Add the first car and follow its inspection, insurance and registration here.")}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                cars.map((v, j) => (
                  <tr key={v.id} style={{ ["--j" as string]: j, ...(v.id === focusId ? { background: "color-mix(in srgb, var(--lx) 8%, transparent)" } : {}) }}>
                    <td>
                      <div className="px-who">
                        <span className="px-av" style={{ color: `var(--l-${toneOf(v.nearestDays) === "bad" ? "rose" : toneOf(v.nearestDays) === "warn" ? "amber" : "green"})` }}>
                          <Car style={{ width: 16, height: 16 }} />
                        </span>
                        <div>
                          <b>
                            {v.make} {v.year && <span className="mono">{v.year}</span>}
                          </b>
                          <small>{tr(v.branch?.name ?? "بدون مؤسسة", v.branch?.nameEn || v.branch?.name || "No establishment")}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Plate v={v} />
                    </td>
                    <td className="hm">{v.driver ? tr(v.driver.fullNameAr, v.driver.fullNameEn || v.driver.fullNameAr) : "—"}</td>
                    <td>
                      <DateCell date={v.inspectionExpiry} days={v.inspectionDays} />
                    </td>
                    <td>
                      <DateCell date={v.insuranceExpiry} days={v.insuranceDays} />
                    </td>
                    <td className="hm">
                      <DateCell date={v.registrationExpiry} days={v.registrationDays} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {has("vehicles.edit") && (
                          <button type="button" className="px-btn" onClick={() => setRenewing(v)}>
                            <RefreshCw /> {tr("تجديد", "Renew")}
                          </button>
                        )}
                        {(has("vehicles.edit") || has("vehicles.delete")) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="px-iconbtn" aria-label={tr("إجراءات", "Actions")}>
                                <MoreHorizontal />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-3xl p-2">
                              {has("vehicles.edit") && (
                                <DropdownMenuItem className="rounded-2xl" onSelect={() => setDialog({ open: true, vehicle: v })}>
                                  <Pencil className="me-2 h-4 w-4" /> {tr("تعديل", "Edit")}
                                </DropdownMenuItem>
                              )}
                              {has("vehicles.delete") && (
                                <DropdownMenuItem className="rounded-2xl text-destructive" onSelect={() => setDeleting(v)}>
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
      </section>

      <VehicleDialog open={dialog.open} vehicle={dialog.vehicle} onOpenChange={(open) => setDialog({ open })} />
      <RenewDialog vehicle={renewing} onOpenChange={(o) => !o && setRenewing(null)} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} title={tr(`حذف ${deleting?.make ?? ""} (${deleting?.plateLetters ?? ""} ${deleting?.plateNumber ?? ""})؟`, `Delete ${deleting?.make ?? ""}?`)} onConfirm={remove} />
    </div>
  );
}
