import { useEffect, useRef, useState } from "react";
import { ChevronDown, Info } from "lucide-react";

/* The work permit's length in the voucher dialog: a dropdown in the dialog's own field style, each
   length on a calendar leaf with the date the permit would end (counted from the voucher date). */

const LENGTHS = [3, 6, 9, 12] as const;

export function PermitLengthSelect({ value, onChange, from, isAr, invalid, labelId }: { value?: string; onChange: (v: string) => void; from: string; isAr: boolean; invalid?: boolean; labelId?: string }) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const sel = value ? LENGTHS.findIndex((m) => `MONTHS_${m}` === value) : -1;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const ends = (m: number) => {
    const d = new Date(`${from}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString(isAr ? "ar-EG-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  const name = (m: number) => (isAr ? (m === 12 ? "12 شهر" : `${m} أشهر`) : `${m} months`);
  const sub: Record<number, [string, string]> = { 3: ["ربع سنة", "A quarter"], 6: ["نصف سنة", "Half a year"], 9: ["ثلاثة أرباع سنة", "Three quarters"], 12: ["سنة كاملة", "A full year"] };
  const pick = (i: number) => { onChange(`MONTHS_${LENGTHS[i]}`); setOpen(false); btn.current?.focus(); };
  const show = (v: boolean) => { setOpen(v); if (v) setAct(sel >= 0 ? sel : 0); };

  return (
    <div className={`pls${open ? " open" : ""}${invalid ? " invalid" : ""}`} ref={box}>
      <button
        ref={btn}
        type="button"
        className="pls-trig"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => show(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!open) return show(true); setAct((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + LENGTHS.length) % LENGTHS.length); }
          else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); pick(act); }
          else if (e.key === "Escape") setOpen(false);
        }}
      >
        <span className={`pls-leaf${sel < 0 ? " ph" : ""}`}><i /><b>{sel < 0 ? "—" : LENGTHS[sel]}</b></span>
        <span className="pls-tv">
          {sel < 0 ? <b className="ph">{isAr ? "اختر المدة" : "Choose the length"}</b> : (<><b>{name(LENGTHS[sel])}</b><small>{isAr ? "تنتهي" : "Ends"} {ends(LENGTHS[sel])}</small></>)}
        </span>
        <ChevronDown className="pls-chev" aria-hidden="true" />
      </button>
      <div className="pls-menu" role="listbox" aria-labelledby={labelId}>
        <div className="pls-mh"><span>{isAr ? "مدة رخصة العمل" : "Work permit length"}</span><span>{isAr ? "تنتهي في" : "Ends on"}</span></div>
        {LENGTHS.map((m, i) => (
          <button key={m} type="button" role="option" aria-selected={sel === i} className={`pls-opt${act === i ? " act" : ""}`} onMouseEnter={() => setAct(i)} onClick={() => pick(i)}>
            <span className="pls-leaf"><i /><b>{m}</b></span>
            <span className="t"><b>{name(m)}</b><small>{isAr ? sub[m][0] : sub[m][1]}</small></span>
            <span className="end">{ends(m)}</span>
          </button>
        ))}
        <div className="pls-sep" />
        <div className="pls-foot"><Info aria-hidden="true" />{isAr ? "التاريخ محسوب من تاريخ السند، والرخصة بتتسجل في وثائق الموظف." : "Counted from the voucher date; the permit is added to the employee's documents."}</div>
      </div>
    </div>
  );
}
