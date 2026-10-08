import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { getErrorMessage } from "@/lib/api";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { useAuthStore } from "@/stores/authStore";
import { listActiveBranches } from "@/api/branches";
import { DATE_LOOK, vehiclesApi, type Vehicle, type VehicleDate, type VehicleState } from "@/api/vehicles";
import { RenewDialog, VehicleDialog } from "@/pages/vehicles/vehicle-dialogs";
import "@/styles/vehicles.css";

/* The vehicles page, as in the approved preview: the night showroom hero with
   gold dust, engraved figures, and a card per car with an instrument cluster
   whose three dials sweep to the time left on its inspection, insurance and
   registration. */

const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const dmy = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
const stateOf = (d: number) => (d <= 0 ? "exp" : d <= 30 ? "soon" : "ok");
const COLOR = { exp: "var(--vh-bad)", soon: "var(--vh-warn)", ok: "var(--vh-ok)" } as const;
const css = (o: Record<string, string | number>) => o as CSSProperties;

function GoldDust() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0, raf = 0;
    let P: { x: number; y: number; r: number; v: number; a: number }[] = [];
    const size = () => {
      const r = cv.getBoundingClientRect();
      W = cv.width = r.width * dpr;
      H = cv.height = r.height * dpr;
      P = Array.from({ length: Math.round(r.width / 9) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.6 + 0.3) * dpr, v: Math.random() * 0.25 + 0.05, a: Math.random() * Math.PI * 2 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y -= p.v * dpr;
        p.a += 0.02;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.a) * 3, p.y, p.r, 0, 7);
        ctx.fillStyle = `rgba(243, 223, 174, ${0.45 + Math.sin(p.a) * 0.25})`;
        ctx.shadowColor = "rgba(243, 223, 174, .9)";
        ctx.shadowBlur = 8 * dpr;
        ctx.fill();
      }
      if (!reduceMotion()) raf = requestAnimationFrame(draw);
    };
    size();
    draw();
    window.addEventListener("resize", size);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" />;
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(reduceMotion() ? value : 0);
  useEffect(() => {
    if (reduceMotion()) { setN(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

/* a 240° dial: ticks, a lit arc and a needle */
const ARC = 240, R = 38, CX = 50, CY = 52, LEN = (ARC / 360) * 2 * Math.PI * R;
const pt = (deg: number, r: number) => { const a = ((deg - 90) * Math.PI) / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
const [ax, ay] = pt(-120, R), [bx, by] = pt(120, R);
const ARC_PATH = `M${ax.toFixed(2)} ${ay.toFixed(2)} A${R} ${R} 0 1 1 ${bx.toFixed(2)} ${by.toFixed(2)}`;
const TICKS = Array.from({ length: 13 }, (_, i) => {
  const d = -120 + (ARC / 12) * i, big = i % 3 === 0;
  const [x1, y1] = pt(d, big ? 30 : 32), [x2, y2] = pt(d, 35);
  return { x1, y1, x2, y2, big };
});

function Dial({ kind, date, days, live }: { kind: VehicleDate; date: string | null; days: number | null; live: boolean }) {
  const look = DATE_LOOK[kind];
  const s = days === null ? "ok" : stateOf(days);
  const pct = days === null ? 0 : days <= 0 ? 0 : Math.max(0.03, Math.min(1, days / look.span));
  return (
    <div className="vh-dial" style={css({ "--mc": days === null ? "#6f6a62" : COLOR[s] })}>
      <svg viewBox="0 0 100 92" aria-hidden="true">
        <path className="arc" d={ARC_PATH} fill="none" strokeWidth="5" strokeLinecap="round" />
        <path className="lvl" d={ARC_PATH} fill="none" strokeWidth="5" style={{ strokeDasharray: live ? `${(pct * LEN).toFixed(1)} 400` : undefined }} />
        {TICKS.map((t, i) => <line key={i} className={`tk ${t.big ? "big" : ""}`} x1={t.x1.toFixed(1)} y1={t.y1.toFixed(1)} x2={t.x2.toFixed(1)} y2={t.y2.toFixed(1)} strokeWidth={t.big ? 1.4 : 0.8} />)}
        <g className="needle" style={{ transform: live ? `rotate(${(-120 + ARC * pct).toFixed(1)}deg)` : undefined }}><line x1="50" y1="52" x2="50" y2="22" strokeWidth="1.8" strokeLinecap="round" /></g>
        <circle className="hub" cx="50" cy="52" r="4" strokeWidth="1" />
        <text className={`val${days !== null && days <= 0 ? " sm" : ""}`} x="50" y="76" textAnchor="middle">{days === null ? "—" : days <= 0 ? tr("منتهي", "Expired") : days}</text>
        <text className="unit" x="50" y="88" textAnchor="middle">{days === null ? tr("مش متسجل", "Not set") : days < 0 ? tr(`من ${-days} يوم`, `${-days}d ago`) : days === 0 ? tr("النهارده", "Today") : tr("يوم متبقي", "days left")}</text>
      </svg>
      <strong>{tr(look.ar, look.en)}</strong>
      <em className="n">{dmy(date)}</em>
    </div>
  );
}

function VehicleCard({ v, i, focus, onRenew, onEdit, onDelete }: { v: Vehicle; i: number; focus: boolean; onRenew?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const [live, setLive] = useState(reduceMotion());
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 250 + i * 70);
    return () => clearTimeout(t);
  }, [i]);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);
  const s = stateOf(v.nearestDays);
  const label = s === "exp" ? tr("فيها حاجة منتهية", "Something expired") : s === "soon" ? tr("قريب الانتهاء", "Ending soon") : tr("كله ساري", "All valid");
  const branch = v.branch ? tr(v.branch.name, v.branch.nameEn || v.branch.name) : tr("بدون مؤسسة", "No establishment");
  const driver = v.driver ? tr(v.driver.fullNameAr, v.driver.fullNameEn || v.driver.fullNameAr) : tr("بدون سائق", "No driver");
  return (
    <article ref={ref} className={`vh-car ${s}${focus ? " focus" : ""}`} style={css({ "--sc": COLOR[s], "--i": Math.min(i, 12) })}>
      <div className="vh-inner">
        <div className="vh-top">
          <div className="vh-plate" aria-label={`${tr("اللوحة", "Plate")} ${v.plateLetters} ${v.plateNumber}`}>
            <span className="ks">KSA</span>
            <span className="ar">{v.plateLetters} <span className="n">{v.plateNumber}</span></span>
            <span className="en">{v.plateNumber}</span>
          </div>
          <div className="vh-who"><b>{v.make} {v.year && <span className="n">{v.year}</span>}</b><small>{branch}</small></div>
          <span className="vh-st"><i />{label}</span>
        </div>
        <div className="vh-cluster">
          <Dial kind="INSPECTION" date={v.inspectionExpiry} days={v.inspectionDays} live={live} />
          <Dial kind="INSURANCE" date={v.insuranceExpiry} days={v.insuranceDays} live={live} />
          <Dial kind="REGISTRATION" date={v.registrationExpiry} days={v.registrationDays} live={live} />
        </div>
        <div className="vh-facts">
          <div><small>{tr("المالك", "Owner")}</small><b>{v.ownerName || "—"}</b></div>
          <div><small>{tr("الرقم التسلسلي", "Serial no.")}</small><b className="n">{v.serialNumber || "—"}</b></div>
          <div><small>{tr("السائق", "Driver")}</small><b>{driver}</b></div>
          <div><small>{tr("اللون", "Colour")}</small><b>{v.color || "—"}</b></div>
        </div>
        <div className="vh-ins">
          <span>{tr("التأمين:", "Insurance:")} <b>{v.insurer || "—"}</b></span>
          <span><b>{v.insuranceType === "THIRD_PARTY" ? tr("ضد الغير", "Third party") : v.insuranceType === "COMPREHENSIVE" ? tr("شامل", "Comprehensive") : ""}</b></span>
        </div>
        {(onRenew || onEdit || onDelete) && (
          <div className="vh-foot">
            {onRenew && <button type="button" className="vh-btn sm gold" onClick={onRenew}><RefreshCw /> {tr("تجديد", "Renew")}</button>}
            {onEdit && <button type="button" className="vh-btn sm" onClick={onEdit}><Pencil /> {tr("تعديل", "Edit")}</button>}
            {onDelete && <button type="button" className="vh-btn sm icon danger" onClick={onDelete} aria-label={tr("حذف", "Delete")}><Trash2 /></button>}
          </div>
        )}
      </div>
    </article>
  );
}

const SEG: { value: VehicleState; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "expired", ar: "منتهية", en: "Expired" },
  { value: "soon", ar: "قريبة", en: "Soon" },
  { value: "INSPECTION", ar: "الفحص الدوري", en: "Inspection" },
  { value: "INSURANCE", ar: "التأمين", en: "Insurance" },
  { value: "REGISTRATION", ar: "الاستمارة", en: "Registration" },
];

function Seg({ value, onChange }: { value: VehicleState; onChange: (v: VehicleState) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<CSSProperties>({});
  const { i18n } = useTranslation();
  useLayoutEffect(() => {
    const place = () => {
      const el = box.current;
      const on = el?.querySelector<HTMLButtonElement>(`button[data-v="${value}"]`);
      if (!el || !on) return;
      setRail({ width: on.offsetWidth, left: on.offsetLeft });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [value, i18n.language]);
  return (
    <div className="vh-seg" ref={box} role="group" aria-label={tr("نوع المتابعة", "Filter")}>
      <span className="rail" style={rail} />
      {SEG.map((s) => (
        <button key={s.value} type="button" data-v={s.value} aria-pressed={value === s.value} onClick={() => onChange(s.value)}>
          {tr(s.ar, s.en)}
        </button>
      ))}
    </div>
  );
}

export default function VehiclesPage() {
  const { i18n } = useTranslation();
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

  const plaques: { k: VehicleState; label: string; value: number; sub: string; c: string }[] = [
    { k: "all", label: tr("كل السيارات", "All vehicles"), value: stats?.total ?? 0, sub: tr(`${stats?.allValid ?? 0} كلها سارية`, `${stats?.allValid ?? 0} fully valid`), c: "#f3dfae" },
    { k: "expired", label: tr("فيها حاجة منتهية", "Something expired"), value: stats?.expired ?? 0, sub: tr("جددها فورًا", "Renew now"), c: "#ff6b7d" },
    { k: "INSPECTION", label: tr("الفحص الدوري", "Inspection"), value: stats?.inspection ?? 0, sub: tr("قريب أو منتهي", "Soon or expired"), c: "#f2b45a" },
    { k: "INSURANCE", label: tr("التأمين", "Insurance"), value: stats?.insurance ?? 0, sub: tr("قريب أو منتهي", "Soon or expired"), c: "#9fb7ff" },
  ];

  return (
    <div className="vh" dir={i18n.dir()}>
      <header className="vh-hero">
        <GoldDust />
        <div className="sweep" />
        <div className="vh-hrow">
          <span className="vh-crest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5h15M4.5 16.5a2 2 0 1 0 4 0M15.5 16.5a2 2 0 1 0 4 0M2.5 16.5v-5l2.4-4.8a1.5 1.5 0 0 1 1.3-.7h11.6a1.5 1.5 0 0 1 1.3.7l2.4 4.8v5" /><path d="M2.5 11.5h19M7 14h1.5M15.5 14H17" /></svg>
          </span>
          <div className="tt">
            <div className="eyebrow">Fleet Collection</div>
            <h1 className="vh-foil">{tr("السيارات", "Vehicles")}</h1>
            <p>{stats ? tr(`${stats.total} سيارة · ${stats.expired} فيها حاجة منتهية و${stats.soon} قريبة من الانتهاء`, `${stats.total} vehicles · ${stats.expired} with something expired, ${stats.soon} ending soon`) : tr("الفحص الدوري والتأمين والاستمارة لكل سيارة.", "Inspection, insurance and registration for every car.")}</p>
          </div>
          <div className="vh-acts">
            {has("vehicles.export") && (
              <>
                <button type="button" className="vh-btn" onClick={() => openPdfInNewTab("/vehicles/export", { ...exportParams, format: "pdf" }, "vehicles.pdf").catch(() => undefined)}><Download /> {tr("تقرير PDF", "PDF report")}</button>
                <button type="button" className="vh-btn" onClick={() => downloadFile("/vehicles/export", { ...exportParams, format: "xlsx" }, "vehicles.xlsx").catch(() => undefined)}><FileSpreadsheet /> Excel</button>
              </>
            )}
            {has("vehicles.create") && <button type="button" className="vh-btn gold" onClick={() => setDialog({ open: true })}><Plus /> {tr("إضافة سيارة", "Add a vehicle")}</button>}
          </div>
        </div>
        <div className="vh-plaques">
          {plaques.map((p) => (
            <button key={p.k} type="button" className="vh-plq" style={css({ "--c": p.c })} aria-pressed={state === p.k} onClick={() => setState(p.k)}>
              <span>{p.label}</span>
              <b className="n"><CountUp value={p.value} /></b>
              <small>{p.sub}</small>
            </button>
          ))}
        </div>
        <span className="hl" />
      </header>

      <div className="vh-tools no-print">
        <Seg value={state} onChange={setState} />
        <select className="vh-field" value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label={tr("المؤسسة", "Establishment")}>
          <option value="">{tr("كل المؤسسات", "All establishments")}</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{tr(b.name, b.nameEn || b.name)}</option>)}
          <option value="none">{tr("بدون مؤسسة", "No establishment")}</option>
        </select>
        <input className="vh-field vh-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("رقم اللوحة أو الرقم التسلسلي أو المالك أو السائق", "Plate, serial number, owner or driver")} aria-label={tr("بحث", "Search")} />
      </div>

      <section className="vh-grid" aria-label={tr("السيارات", "Vehicles")}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[420px] animate-pulse rounded-[28px] bg-[var(--vh-panel)]" />)
        ) : cars.length === 0 ? (
          <div className="vh-empty">
            <b>{q || state !== "all" || branchId ? tr("مفيش سيارات بالفلتر ده", "No vehicles match") : tr("لسه مفيش سيارات", "No vehicles yet")}</b>
            {!q && state === "all" && !branchId && tr("ضيف أول سيارة، وتابع فحصها الدوري وتأمينها واستمارتها من هنا.", "Add the first car and follow its inspection, insurance and registration here.")}
            {has("vehicles.create") && !q && state === "all" && !branchId && (
              <div className="mt-4 flex justify-center"><button type="button" className="vh-btn gold" onClick={() => setDialog({ open: true })}><Plus /> {tr("إضافة سيارة", "Add a vehicle")}</button></div>
            )}
          </div>
        ) : (
          cars.map((v, i) => (
            <VehicleCard
              key={v.id}
              v={v}
              i={i}
              focus={v.id === focusId}
              onRenew={has("vehicles.edit") ? () => setRenewing(v) : undefined}
              onEdit={has("vehicles.edit") ? () => setDialog({ open: true, vehicle: v }) : undefined}
              onDelete={has("vehicles.delete") ? () => setDeleting(v) : undefined}
            />
          ))
        )}
      </section>

      <VehicleDialog open={dialog.open} vehicle={dialog.vehicle} onOpenChange={(open) => setDialog({ open })} />
      <RenewDialog vehicle={renewing} onOpenChange={(o) => !o && setRenewing(null)} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} title={tr(`حذف ${deleting?.make ?? ""} (${deleting?.plateLetters ?? ""} ${deleting?.plateNumber ?? ""})؟`, `Delete ${deleting?.make ?? ""}?`)} onConfirm={remove} />
    </div>
  );
}
