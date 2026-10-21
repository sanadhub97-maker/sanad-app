import type { CSSProperties, ReactNode } from "react";
import { Car, CreditCard, Key, Laptop, Monitor, Package, Printer, Shirt, Smartphone, Tablet, Wrench, type LucideIcon } from "lucide-react";
import { tr } from "@/i18n";
import { DEPARTMENTS, REASONS, type Clearance, type CustodyHandover } from "@/api/custody";
import { Coin } from "@/components/royal/royal-kit";
import { dmy, empName, money, branchName } from "@/pages/custody/custody-shared";

/* The custody records as royal cards (approved in the "documents" preview): a handover as an
   itemised receipt, a clearance as each department's sign-off. */

const KIND_ICON: [RegExp, LucideIcon][] = [
  [/لابتوب|laptop/i, Laptop], [/جوال|phone|موبايل/i, Smartphone], [/تابلت|tablet/i, Tablet], [/سيارة|car/i, Car], [/مفتاح|مفاتيح|key/i, Key],
  [/بطاقة|شريحة|card|sim/i, CreditCard], [/عدة|أدوات|tool/i, Wrench], [/زي|uniform/i, Shirt], [/شاشة|طابعة|monitor|printer/i, Monitor],
];
const iconOf = (kind: string) => KIND_ICON.find(([re]) => re.test(kind))?.[1] ?? Package;
const initial = (n: string) => n.trim().charAt(0) || "؟";

function Frame({ k, children, actions, onOpen }: { k: number; children: ReactNode; actions: ReactNode; onOpen?: () => void }) {
  return (
    <article className="cuc" style={{ ["--k" as string]: k } as CSSProperties} onClick={onOpen}>
      <span className="cuc-sw" aria-hidden="true" />
      <div className="cuc-body">{children}</div>
      <div className="cuc-acts" onClick={(e) => e.stopPropagation()}>{actions}</div>
    </article>
  );
}

function Head({ name, sub, refLabel, refValue }: { name: string; sub: string; refLabel: string; refValue: string }) {
  return (
    <div className="cuc-head">
      <span className="cuc-coin">{initial(name)}</span>
      <div className="w"><b>{name}</b><small>{sub}</small></div>
      <div className="ref"><span>{refLabel}</span><b dir="ltr">{refValue}</b></div>
    </div>
  );
}

export function HandoverCard({ h, k, onOpen, onPrint, menu }: { h: CustodyHandover; k: number; onOpen?: () => void; onPrint?: () => void; menu?: ReactNode }) {
  const shown = h.items.slice(0, 4);
  return (
    <Frame
      k={k}
      onOpen={onOpen}
      actions={<>
        {onPrint && <button type="button" className="pri" onClick={onPrint}><Printer /> {tr("طباعة المحضر", "Print record")}</button>}
        {menu}
      </>}
    >
      <Head name={empName(h.employee)} sub={[h.employee.jobTitle, branchName(h.employee.branch)].filter(Boolean).join(" · ") || dmy(h.date)} refLabel={tr("رقم المحضر", "RECORD")} refValue={h.number} />
      <div className="cuc-rule" />
      <div className="cuc-items">
        {shown.map((i) => {
          const back = Boolean(i.returnedAt);
          return (
            <div key={i.id} className="it">
              <Coin icon={iconOf(i.kind)} size={36} />
              <span className="t"><b>{i.kind}{i.description ? ` · ${i.description}` : ""}</b><small dir="ltr">{i.serialNumber ? `SN ${i.serialNumber}` : dmy(h.date)}</small></span>
              <span className={`st ${back ? "back" : "out"}`}>{back ? tr("رجعت", "Returned") : tr("عند الموظف", "With employee")}</span>
            </div>
          );
        })}
        {h.items.length > shown.length && <div className="more">{tr(`و${h.items.length - shown.length} أصناف كمان`, `+${h.items.length - shown.length} more`)}</div>}
      </div>
      <div className="cuc-money"><span>{tr("قيمة العهدة", "Custody value")}<small>{h.itemsOut ? tr(`${h.itemsOut} من ${h.itemCount} لسه مع الموظف`, `${h.itemsOut} of ${h.itemCount} still out`) : tr("رجعت كلها", "All returned")}</small></span><b dir="ltr">{money(h.totalValue)}<small>{tr("ر.س", "SAR")}</small></b></div>
      <div className="cuc-perf"><i /><i /></div>
    </Frame>
  );
}

export function ClearanceCard({ c, k, onOpen, actions }: { c: Clearance; k: number; onOpen?: () => void; actions: ReactNode }) {
  const signed = DEPARTMENTS.filter((d) => c.departments[d.key]?.done).length;
  const all = DEPARTMENTS.length;
  const issued = c.status === "ISSUED";
  const color = issued || signed === all ? "#3fbf7f" : "#e39a14";
  const C = 2 * Math.PI * 26;
  const reason = REASONS.find((r) => r.value === c.reason);
  return (
    <Frame k={k} onOpen={onOpen} actions={actions}>
      {issued && <span className="cuc-stamp">{tr("صدرت الشهادة", "Issued")}</span>}
      <div className="cuc-head">
        <span className="cuc-coin">{initial(empName(c.employee))}</span>
        <div className="w"><b>{empName(c.employee)}</b><small>{[reason ? tr(reason.ar, reason.en) : c.reason, `${tr("آخر يوم", "Last day")} ${dmy(c.lastWorkingDay)}`].join(" · ")}</small></div>
        <span className="cuc-ring" style={{ ["--c" as string]: color } as CSSProperties}>
          <svg viewBox="0 0 62 62" aria-hidden="true"><circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" /><circle cx="31" cy="31" r="26" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - signed / all)} /></svg>
          {signed}/{all}
        </span>
      </div>
      <div className="cuc-rule" />
      <div className="cuc-steps">
        {DEPARTMENTS.map((d) => {
          const s = c.departments[d.key];
          return (
            <div key={d.key} className={`step ${s?.done ? "ok" : "wait"}`}>
              <i>{s?.done ? "✓" : "…"}</i>
              <b>{tr(d.ar, d.en)}</b>
              {s?.done ? <span className="sig">{s.by || tr("وقّع", "Signed")}</span> : <span>{tr("في الانتظار", "Pending")}</span>}
            </div>
          );
        })}
      </div>
      <div className="cuc-foot">
        {c.blockers.itemsOut > 0 ? <span className="st out">{tr(`${c.blockers.itemsOut} عهدة لسه برّه`, `${c.blockers.itemsOut} items out`)}</span> : <span className="st back">{tr("العهد رجعت", "Custody back")}</span>}
        <span className="dues">{tr("المستحقات", "Dues")} <b dir="ltr">{money(c.dues)} {tr("ر.س", "SAR")}</b></span>
      </div>
    </Frame>
  );
}
