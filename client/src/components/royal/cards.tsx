import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Hourglass,
  LogIn,
  LogOut,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import i18n, { isRtlLanguage } from "@/i18n";
import { cn } from "@/lib/utils";
import { auditLogsApi } from "@/api/auditLogs";
import { settingsApi } from "@/api/settings";
import { filesApi } from "@/api/files";
import { useAuthStore } from "@/stores/authStore";
import { dayOf, daysFromToday, dmy, hijri, weekday } from "@/components/royal/rp";
import type { AuditLogItem } from "@/types/models";

/* The card pieces of the Royal pages (styles/cards-royal.css), as in the
   approved preview: a card per document, the licence card with its rotating
   ticker, the views by kind and by month, and the parts of the details pages. */

const ar = () => isRtlLanguage(i18n.language);
const L = (a: string, e: string) => (ar() ? a : e);
const css = (o: Record<string, string | number | undefined>) => o as CSSProperties;

/** Expired, ending within 30 days, valid or without a date: class, word and colours. */
export function stateOf(days: number | null) {
  if (days === null) return { cls: "none", label: L("بدون تاريخ", "No date"), c: "var(--muted)", t: "var(--soft)" };
  if (days < 0) return { cls: "exp", label: L("منتهي", "Expired"), c: "var(--bad)", t: "var(--bad-s)" };
  if (days <= 30) return { cls: "soon", label: L("قريب الانتهاء", "Ending soon"), c: "var(--warn)", t: "var(--warn-s)" };
  return { cls: "ok", label: L("ساري", "Valid"), c: "var(--ok)", t: "var(--ok-s)" };
}

/** The kind colours, by document category or type. */
export const KIND_COLOR: Record<string, string> = {
  COMMERCIAL_REGISTRATION: "var(--pri)",
  MUNICIPAL_LICENSE: "var(--teal)",
  CIVIL_DEFENSE_LICENSE: "var(--bad)",
  CIVIL_DEFENSE_REPORT: "var(--warn)",
  CLEANING_CONTRACT: "var(--vio)",
  LEASE_CONTRACT: "var(--gold)",
  TWENTY_FOUR_HOUR_PERMIT: "var(--sky)",
  ENTERTAINMENT_AUTHORITY_PERMIT: "var(--vio)",
  TOBACCO_LICENSE: "var(--ok)",
  IQAMA: "var(--pri)",
  PASSPORT: "var(--vio)",
  HEALTH_CERTIFICATE: "var(--teal)",
  MEDICAL_INSURANCE: "var(--sky)",
  VISA: "var(--gold)",
  EXIT_REENTRY_VISA: "var(--gold)",
  FINAL_EXIT_VISA: "var(--gold)",
  FLIGHT_TICKET: "var(--bad)",
  EMPLOYMENT_CONTRACT: "var(--ok)",
  DRIVING_LICENSE: "var(--warn)",
  OTHER: "var(--muted)",
};
export const kindColor = (k?: string | null) => KIND_COLOR[k ?? ""] ?? "var(--pri)";

/** Days a document is valid for: issue to expiry when both are known, else a year. */
export function termOf(issue?: string | null, expiry?: string | null) {
  if (issue && expiry) {
    const n = Math.round((dayOf(expiry).getTime() - dayOf(issue).getTime()) / 86_400_000);
    if (n > 0) return n;
  }
  return 365;
}
/** How far through its term a document is (0–100) and the ring's share left. */
export function lifeOf(issue?: string | null, expiry?: string | null) {
  const days = daysFromToday(expiry);
  const term = termOf(issue, expiry);
  if (days === null) return { days, term, used: 0, left: 0 };
  const used = Math.min(100, Math.max(0, ((term - days) / term) * 100));
  return { days, term, used, left: days < 0 ? 100 : Math.max(0, 100 - used) };
}
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.replace(/^ال(?=..)/, "").charAt(0))
    .join("");

export function copyText(text?: string | null) {
  if (!text) return;
  void navigator.clipboard?.writeText(text);
  toast.success(L("تم النسخ", "Copied"));
}

/* ---------- Small pieces ---------- */

export function Seg<T extends string>({ items, value, onChange, label }: { items: { value: T; label: string; icon?: LucideIcon; count?: number }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="rc-seg" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.value} type="button" aria-pressed={value === it.value} onClick={() => onChange(it.value)}>
          {it.icon && <it.icon />}
          {it.label}
          {it.count !== undefined && <b>{it.count}</b>}
        </button>
      ))}
    </div>
  );
}

export function MiniRing({ pct, color, label }: { pct: number; color: string; label?: ReactNode }) {
  const C = 2 * Math.PI * 22;
  return (
    <span className="rc-mini-ring" style={css({ "--sc": color })}>
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r="22" fill="none" stroke="var(--track)" strokeWidth="6" />
        <circle cx="27" cy="27" r="22" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} />
      </svg>
      <b>{label ?? `${pct}%`}</b>
    </span>
  );
}
export const compColor = (pct: number) => (pct >= 70 ? "var(--ok)" : pct >= 40 ? "var(--warn)" : "var(--bad)");

export function BigRing({ pct, color, value, sub }: { pct: number; color: string; value: ReactNode; sub: ReactNode }) {
  const C = 2 * Math.PI * 40;
  return (
    <div className="rc-big" style={css({ "--sc": color })}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--track)" strokeWidth="8" />
        <circle className="arc" cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} />
      </svg>
      <div>
        <b>{value}</b>
        <small>{sub}</small>
      </div>
    </div>
  );
}

/* ---------- One card per document ---------- */

export interface DocCardProps {
  i: number;
  kind: string;
  kindCode?: string | null;
  icon: LucideIcon;
  owner: ReactNode;
  ownerIcon: LucideIcon;
  number?: string | null;
  authority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  hasFile: boolean;
  onView: () => void;
  onRenew?: () => void;
  extra?: ReactNode;
}
export function DocCard({ i, kind, kindCode, icon: Icon, owner, ownerIcon: OwnerIcon, number, authority, issueDate, expiryDate, hasFile, onView, onRenew, extra }: DocCardProps) {
  const { days, used, left } = lifeOf(issueDate, expiryDate);
  const st = stateOf(days);
  const C = 2 * Math.PI * 40;
  return (
    <article className={cn("rc-dc rp-rise", st.cls)} style={css({ "--i": Math.min(i + 2, 12), "--kc": kindColor(kindCode), "--sc": st.c, "--st": st.t })}>
      <div className="rc-dc-hd">
        <span className="rc-dc-ico">
          <Icon />
        </span>
        <button type="button" className="grow text-start" onClick={onView}>
          <b>{kind}</b>
          <small>
            <OwnerIcon />
            {owner}
          </small>
        </button>
        <span className="rc-stamp">
          <i />
          {st.label}
        </span>
      </div>
      <div className="rc-perf" />
      <div className="rc-dc-main">
        <div className="rc-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--track)" strokeWidth="9" />
            {days !== null && <circle className="arc" cx="50" cy="50" r="40" fill="none" stroke="var(--sc)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(C * left) / 100} ${C}`} />}
          </svg>
          <div>
            <b>{days === null ? "—" : Math.abs(days)}</b>
            <small>{days === null ? L("بدون انتهاء", "No expiry") : days < 0 ? L("يوم منتهي", "days over") : L("يوم متبقي", "days left")}</small>
          </div>
        </div>
        <div className="rc-dc-facts">
          <div>
            <small>{L("الرقم", "Number")}</small>
            <b className="rp-mono">{number || "—"}</b>
          </div>
          <div>
            <small>{L("الجهة المصدرة", "Issued by")}</small>
            <b>{authority || "—"}</b>
          </div>
          <div>
            <small>{L("تاريخ الإصدار", "Issued")}</small>
            <b className="rp-num">{issueDate ? dmy(issueDate) : "—"}</b>
          </div>
          <div>
            <small>{L("تاريخ الانتهاء", "Expires")}</small>
            <b className="rp-num">{expiryDate ? dmy(expiryDate) : "—"}</b>
            {expiryDate && (
              <em>
                {weekday(expiryDate)} · {hijri(expiryDate)}
              </em>
            )}
          </div>
        </div>
      </div>
      {days !== null && expiryDate && (
        <div className="rc-dc-life">
          <div className="rc-bar">
            <i style={{ width: `${used}%` }} />
            <span className="today" style={css({ insetInlineStart: `${used}%` })}>
              <em>{L("اليوم", "Today")}</em>
            </span>
          </div>
          <div className="rc-life-l">
            <span>{issueDate ? dmy(issueDate) : ""}</span>
            <span>{days < 0 ? L(`انتهى منذ ${-days} يوم`, `Ended ${-days} days ago`) : days === 0 ? L("ينتهي اليوم", "Ends today") : L(`ينتهي بعد ${days} يوم`, `Ends in ${days} days`)}</span>
            <span>{dmy(expiryDate)}</span>
          </div>
        </div>
      )}
      <div className="rc-dc-ft">
        {hasFile ? (
          <span className="rc-file">
            <Paperclip />
            {L("مرفق", "Attached")}
          </span>
        ) : (
          <span className="rc-file none">
            <AlertTriangle />
            {L("بدون مرفق", "No file")}
          </span>
        )}
        <span className="sp" />
        {extra}
        <button type="button" className="rc-btn" onClick={onView}>
          <FileText />
          {L("عرض", "View")}
        </button>
        {onRenew && days !== null && days <= 30 && (
          <button type="button" className="rc-btn pri" onClick={onRenew}>
            <Edit />
            {L("تجديد", "Renew")}
          </button>
        )}
      </div>
    </article>
  );
}

/* ---------- Views by kind and by month ---------- */

export interface ListDoc {
  key: string;
  kind: string;
  kindCode: string;
  icon: LucideIcon;
  owner: string;
  date?: string | null;
  onOpen: () => void;
}
function LeftWord({ date }: { date?: string | null }) {
  const n = daysFromToday(date);
  const st = stateOf(n);
  const text = n === null ? L("بدون تاريخ", "No date") : n < 0 ? L(`منتهي منذ ${-n} يوم`, `Expired ${-n}d ago`) : n <= 30 ? L(`باقي ${n} يوم`, `${n}d left`) : L(`ساري · ${n} يوم`, `Valid · ${n}d`);
  return (
    <span className="rp-pill" style={css({ "--c": st.c, "--t": st.t })}>
      {text}
    </span>
  );
}
export function KindLanes({ docs, kinds }: { docs: ListDoc[]; kinds: { code: string; label: string; icon: LucideIcon }[] }) {
  return (
    <div className="rc-lanes">
      {kinds.map((k, i) => {
        const ds = docs.filter((d) => d.kindCode === k.code).sort((a, b) => (daysFromToday(a.date) ?? 99999) - (daysFromToday(b.date) ?? 99999));
        if (!ds.length) return null;
        const c = kindColor(k.code);
        return (
          <section key={k.code} className="rc-lane rp-rise" style={css({ "--i": i + 2, "--c": c, "--t": `color-mix(in srgb, ${c} 13%, var(--surf))`, "--kc": c })}>
            <div className="rc-lane-hd">
              <span className="rc-kico">
                <k.icon />
              </span>
              <b>{k.label}</b>
              <span className="n">{ds.length}</span>
            </div>
            {ds.map((d) => (
              <button key={d.key} type="button" className="rc-lane-it" onClick={d.onOpen}>
                <b>{d.owner}</b>
                <span className="row">
                  <span>{d.date ? `${weekday(d.date)} ${dmy(d.date)}` : "—"}</span>
                  <LeftWord date={d.date} />
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
export function MonthCards({ docs, unit }: { docs: ListDoc[]; unit: [string, string] }) {
  const dated = docs.filter((d) => d.date).sort((a, b) => dayOf(a.date!).getTime() - dayOf(b.date!).getTime());
  const months = new Map<string, ListDoc[]>();
  dated.forEach((d) => {
    const x = dayOf(d.date!);
    const k = `${x.getFullYear()}-${x.getMonth()}`;
    months.set(k, [...(months.get(k) ?? []), d]);
  });
  const loc = ar() ? "ar-EG-u-nu-latn" : "en-GB";
  return (
    <div className="rc-months">
      {[...months.values()].map((ds, i) => {
        const d0 = dayOf(ds[0].date!);
        const worst = Math.min(...ds.map((d) => daysFromToday(d.date) ?? 99999));
        const st = stateOf(worst);
        return (
          <section key={`${d0.getFullYear()}-${d0.getMonth()}`} className="rc-month rp-rise" style={css({ "--i": Math.min(i + 2, 9) })}>
            <div className="rc-month-hd">
              <span className="big">{d0.getMonth() + 1}</span>
              <div>
                <h4>{d0.toLocaleDateString(loc, { month: "long", year: "numeric" })}</h4>
                <p>{hijri(d0).replace(/^\d+\s/, "")}</p>
              </div>
              <div className="tot">
                <span className="rp-pill" style={css({ "--c": st.c, "--t": st.t })}>
                  {ds.length} {L(unit[0], unit[1])}
                </span>
              </div>
            </div>
            {ds.map((d) => (
              <button key={d.key} type="button" className="rc-month-it" onClick={d.onOpen}>
                <span className="rc-kico" style={css({ "--kc": kindColor(d.kindCode) })}>
                  <d.icon />
                </span>
                <span className="t">
                  <b>
                    {d.kind} — {d.owner}
                  </b>
                  <small>
                    {weekday(d.date!)} {dmy(d.date!)} · {hijri(d.date!)}
                  </small>
                </span>
                <LeftWord date={d.date} />
              </button>
            ))}
          </section>
        );
      })}
      {!months.size && <div className="rp-card rp-empty">{L("لا توجد تواريخ انتهاء", "No expiry dates")}</div>}
    </div>
  );
}

/* ---------- The rotating ticker of expired and ending-soon documents ---------- */

export function Ticker({ items, className }: { items: { key: string; label: string; date?: string | null }[]; className?: string }) {
  const due = items
    .map((d) => ({ ...d, n: daysFromToday(d.date) }))
    .filter((d): d is typeof d & { n: number } => d.n !== null && d.n <= 30)
    .sort((a, b) => a.n - b.n);
  const [k, setK] = useState(0);
  const [out, setOut] = useState<number | null>(null);
  const hover = useRef(false);
  const kRef = useRef(0);
  kRef.current = k;
  const count = due.length;
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (hover.current) return;
      const cur = kRef.current % count;
      setOut(cur);
      setK((cur + 1) % count);
    }, 3200);
    return () => window.clearInterval(id);
  }, [count]);
  useEffect(() => {
    if (out === null) return;
    const id = window.setTimeout(() => setOut(null), 600);
    return () => window.clearTimeout(id);
  }, [out]);
  if (!count)
    return (
      <div className={cn("rc-tick ok", className)}>
        <span className="rc-tk-ico">
          <Check />
        </span>
        <div>
          <b>{L("كل المستندات سارية", "All documents are valid")}</b>
          <small>{L("لا شيء ينتهي خلال 30 يومًا", "Nothing ends within 30 days")}</small>
        </div>
      </div>
    );
  const cur = Math.min(k, count - 1);
  const tc = due[cur].n < 0 ? "var(--bad)" : "var(--warn)";
  return (
    <div className={cn("rc-tick", className)} style={css({ "--tc": tc })} onMouseEnter={() => (hover.current = true)} onMouseLeave={() => (hover.current = false)} aria-live="polite">
      <div className="rc-tk-track">
        {due.map((d, j) => {
          const ex = d.n < 0;
          return (
            <div key={d.key} className={cn("rc-tk-slide", ex ? "ex" : "soon", j === cur && "on", j === out && j !== cur && "out")} aria-hidden={j !== cur}>
              <span className="rc-tk-ico">{ex ? <AlertTriangle /> : <Clock />}</span>
              <div className="grow">
                <span className="rc-tk-tag">{ex ? L("منتهي", "Expired") : L("قريب الانتهاء", "Ending soon")}</span>
                <b>{d.label}</b>
                <small>
                  {weekday(d.date!)} {dmy(d.date!)}
                </small>
              </div>
              <span className="rc-tk-days">
                <b>{Math.abs(d.n)}</b>
                <small>{ex ? L("يوم منتهي", "days over") : L("يوم متبقي", "days left")}</small>
              </span>
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <div className="rc-tk-dots">
            {due.map((d, j) => (
              <button
                key={d.key}
                type="button"
                className={cn(j === cur && "on")}
                aria-label={`${d.label} ${j + 1}`}
                onClick={() => {
                  if (j === cur) return;
                  setOut(cur);
                  setK(j);
                }}
              />
            ))}
          </div>
          <i key={cur} className="rc-tk-prog" />
        </>
      )}
    </div>
  );
}

/* ---------- The licence card (employees and establishments) ---------- */

export interface LicCardProps {
  i: number;
  color: string;
  code: ReactNode;
  status: string;
  statusColor?: string;
  seal: ReactNode;
  round?: boolean;
  title: string;
  sub?: ReactNode;
  onOpen: () => void;
  facts: [string, ReactNode][];
  stats: { value: ReactNode; label: string; color?: string }[];
  comp?: { pct: number; title: string; sub: string };
  ticker?: ReactNode;
  actions: ReactNode;
}
export function LicCard({ i, color, code, status, statusColor, seal, round, title, sub, onOpen, facts, stats, comp, ticker, actions }: LicCardProps) {
  return (
    <article className="rc-lic rp-rise" style={css({ "--i": Math.min(i + 2, 9), "--c": color })}>
      <div className="rc-band">
        <div className="row">
          <span className="code">{code}</span>
          <span className="st" style={statusColor ? css({ "--stc": statusColor }) : undefined}>
            <i />
            {status}
          </span>
        </div>
      </div>
      <span className={cn("rc-seal", round && "round")}>{seal}</span>
      <div className="rc-lic-body">
        <button type="button" className="name" onClick={onOpen}>
          <h3>{title}</h3>
          {sub && <div className="en">{sub}</div>}
        </button>
        <div className="rc-lic-facts">
          {facts.map(([l, v]) => (
            <div key={l}>
              <small>{l}</small>
              <b>{v || "—"}</b>
            </div>
          ))}
        </div>
        <div className="rc-lic-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <b style={s.color ? { color: s.color } : undefined}>{s.value}</b>
              <small>{s.label}</small>
            </div>
          ))}
        </div>
        {comp && (
          <div className="rc-comp">
            <MiniRing pct={comp.pct} color={compColor(comp.pct)} />
            <div className="grow">
              <b>{comp.title}</b>
              <small>{comp.sub}</small>
            </div>
          </div>
        )}
        {ticker}
        <div className="rc-lic-acts">{actions}</div>
      </div>
    </article>
  );
}

/* ---------- Details pages ---------- */

export function DetailBar({ from, here, onBack, children }: { from: string; here: string; onBack: () => void; children?: ReactNode }) {
  return (
    <div className="rc-dbar rp-rise no-print">
      <button type="button" className="rc-back" onClick={onBack}>
        <ArrowLeft />
        {L("رجوع", "Back")}
      </button>
      <span className="rc-crumb">
        {from}
        <ArrowLeft />
        <b>{here}</b>
      </span>
      <span className="sp" />
      {children}
    </div>
  );
}

export function DCard({ title, icon: Icon, color = "var(--pri)", right, children, i }: { title: string; icon: LucideIcon; color?: string; right?: ReactNode; children: ReactNode; i?: number }) {
  return (
    <section className="rc-dcard rp-rise" style={css({ "--i": i ?? 3 })}>
      <h2>
        <span className="ico" style={css({ "--c": color })}>
          <Icon />
        </span>
        {title}
        {right !== undefined && <span className="r">{right}</span>}
      </h2>
      {children}
    </section>
  );
}

export function Fact({ label, icon: Icon, value, em, wide, copy, className }: { label: string; icon?: LucideIcon; value: ReactNode; em?: ReactNode; wide?: boolean; copy?: string | null; className?: string }) {
  return (
    <div className={cn("rc-fact", wide && "wide")}>
      <small>
        {Icon && <Icon />}
        {label}
      </small>
      <b className={className}>{value ?? "—"}</b>
      {em && <em>{em}</em>}
      {copy && (
        <button type="button" className="cp" onClick={() => copyText(copy)} aria-label={L(`نسخ ${label}`, `Copy ${label}`)}>
          <Copy />
        </button>
      )}
    </div>
  );
}
export const dateEm = (d?: string | null) => (d ? `${weekday(d)} · ${hijri(d)}` : undefined);

/** A document's hero: its kind and owner, the days as a big ring and its life from issue to expiry. */
export function DocHero({ kind, kindCode, icon: Icon, owner, ownerIcon: OwnerIcon, number, chips, actions, issueDate, expiryDate }: { kind: string; kindCode?: string | null; icon: LucideIcon; owner: ReactNode; ownerIcon: LucideIcon; number?: string | null; chips?: ReactNode; actions?: ReactNode; issueDate?: string | null; expiryDate?: string | null }) {
  const { days, used, left } = lifeOf(issueDate, expiryDate);
  const st = stateOf(days);
  return (
    <div className={cn("rc-hero rp-rise", st.cls)} style={css({ "--i": 1, "--sc": st.c, "--kc": kindColor(kindCode) })}>
      <div className="rc-hero-in">
        <div className="rc-id">
          <span className="rc-tile">
            <Icon />
          </span>
          <div>
            <h1>{kind}</h1>
            <div className="sub">
              <span>
                <OwnerIcon />
                {owner}
              </span>
              {number && <span className="rp-mono">{number}</span>}
            </div>
            <div className="rc-chips">
              <span className="rp-pill nodot" style={css({ "--c": st.c, "--t": st.t })}>
                {st.label}
              </span>
              {chips}
            </div>
            {actions && (
              <div className="rc-acts no-print" style={{ marginTop: 14 }}>
                {actions}
              </div>
            )}
          </div>
        </div>
        <BigRing pct={days === null ? 0 : left} color={st.c} value={days === null ? "—" : Math.abs(days)} sub={days === null ? L("بدون انتهاء", "No expiry") : days < 0 ? L("يوم منتهي", "days over") : L("يوم متبقي", "days left")} />
      </div>
      {days !== null && expiryDate && (
        <div className="rc-life">
          <div className="rc-steps">
            <div className="rc-step done">
              <span className="n">
                <Check />
              </span>
              <b>{L("الإصدار", "Issued")}</b>
              <small className="rp-num">{issueDate ? dmy(issueDate) : "—"}</small>
            </div>
            <div className="rc-track">
              <span className="fill" style={{ width: `${used}%` }} />
              {days >= 0 && (
                <span className="rc-now" style={css({ insetInlineStart: `${used}%` })}>
                  <i />
                  <span>
                    {L("اليوم", "Today")} · {Math.round(used)}%
                  </span>
                </span>
              )}
            </div>
            <div className={cn("rc-step", days < 0 && "done")}>
              <span className="n">{days < 0 ? <AlertTriangle /> : <Hourglass />}</span>
              <b>{days < 0 ? L("انتهى", "Ended") : L("الانتهاء", "Expiry")}</b>
              <small className="rp-num">{dmy(expiryDate)}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A cover hero for a person or an establishment. */
export function CoverHero({ color, tile, round, title, sub, chips, ring, stats }: { color: string; tile: ReactNode; round?: boolean; title: string; sub?: ReactNode; chips?: ReactNode; ring?: ReactNode; stats?: { value: ReactNode; label: string; color?: string }[] }) {
  return (
    <div className="rc-hero cov rp-rise" style={css({ "--i": 1, "--kc": color })}>
      <div className="rc-cover" />
      <div className="rc-hero-in">
        <div className="rc-id">
          <span className={cn("rc-tile", round && "round")}>{tile}</span>
          <div>
            <h1>{title}</h1>
            {sub && <div className="sub">{sub}</div>}
            {chips && <div className="rc-chips">{chips}</div>}
          </div>
        </div>
        {ring}
      </div>
      {stats && (
        <div className="rc-dstats">
          {stats.map((s) => (
            <div key={s.label}>
              <b style={s.color ? { color: s.color } : undefined}>{s.value}</b>
              <small>{s.label}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A small document card inside a details page. */
export function MiniDoc({ title, sub, expiryDate, onClick }: { title: string; sub?: ReactNode; expiryDate?: string | null; onClick: () => void }) {
  const n = daysFromToday(expiryDate);
  const st = stateOf(n);
  const pct = n === null ? 0 : n < 0 ? 100 : Math.max(6, Math.min(100, (n / 365) * 100));
  return (
    <button type="button" className="rc-mdoc" onClick={onClick} style={css({ "--sc": st.c })}>
      <MiniRing pct={pct} color={st.c} label={n === null ? "—" : Math.abs(n)} />
      <span>
        <b className="t">{title}</b>
        {sub && <small>{sub}</small>}
        <small className="s">{n === null ? L("بدون تاريخ انتهاء", "No expiry date") : n < 0 ? L(`منتهي منذ ${-n} يوم`, `Expired ${-n} days ago`) : `${st.label} · ${dmy(expiryDate!)}`}</small>
      </span>
    </button>
  );
}

/** The alert dates before a document ends, from the expiration rules. */
export function Reminders({ expiryDate, days }: { expiryDate?: string | null; days: number[] }) {
  if (!expiryDate) return <div className="rc-none">{L("لا يوجد تاريخ انتهاء", "No expiry date")}</div>;
  const n = daysFromToday(expiryDate) ?? 0;
  const exp = dayOf(expiryDate);
  const list = [...new Set(days)].filter((k) => k > 0).sort((a, b) => b - a);
  return (
    <div className="rc-rows">
      {list.map((k) => {
        const on = new Date(exp);
        on.setDate(on.getDate() - k);
        const d = daysFromToday(on) ?? 0;
        return (
          <div key={k}>
            <span className="d">{k}</span>
            <span className="min-w-0">
              <b>{L(`قبل الانتهاء بـ ${k} ${k === 1 ? "يوم" : k <= 10 ? "أيام" : "يومًا"}`, `${k} day${k === 1 ? "" : "s"} before expiry`)}</b>
              <small>
                {weekday(on)} {dmy(on)}
              </small>
            </span>
            {d <= 0 ? <small className={n < 0 && k === list[list.length - 1] ? "late" : "past"}>{L("حان موعده", "Due")}</small> : <small className="wait">{L(`بعد ${d} يوم`, `In ${d} days`)}</small>}
          </div>
        );
      })}
    </div>
  );
}

/** The file attached to a record: a paper thumbnail with view and download. */
export function Attachment({ fileId, fileName, color, onAdd }: { fileId?: string | null; fileName: string; color?: string; onAdd?: () => void }) {
  if (!fileId)
    return (
      <div className="rc-att-none">
        <b>{L("لا يوجد ملف مرفق", "No file attached")}</b>
        {onAdd && (
          <button type="button" className="rc-btn pri" onClick={onAdd}>
            <Upload />
            {L("إرفاق ملف", "Attach a file")}
          </button>
        )}
      </div>
    );
  return (
    <div className="rc-att" style={css({ "--kc": color })}>
      <div className="rc-att-doc" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <span className="tag">PDF</span>
      </div>
      <div className="min-w-0">
        <b>{fileName}</b>
        <small>{L("ملف المستند الرسمي", "The official document file")}</small>
        <div className="btns">
          <button type="button" className="rc-btn pri" onClick={() => filesApi.openInNewTab(fileId)}>
            <ExternalLink />
            {L("عرض", "View")}
          </button>
          <button type="button" className="rc-btn" onClick={() => filesApi.download(fileId, fileName)}>
            <Download />
            {L("تنزيل", "Download")}
          </button>
          {onAdd && (
            <button type="button" className="rc-btn" onClick={onAdd}>
              <Upload />
              {L("استبدال", "Replace")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Audit actions: word, icon and colour. */
export const ACTION_LOOK: Record<string, { ar: string; en: string; icon: LucideIcon; c: string }> = {
  CREATE: { ar: "إضافة", en: "Created", icon: Plus, c: "var(--ok)" },
  UPDATE: { ar: "تعديل", en: "Updated", icon: Edit, c: "var(--pri)" },
  DELETE: { ar: "حذف", en: "Deleted", icon: Trash2, c: "var(--bad)" },
  IMPORT: { ar: "استيراد", en: "Imported", icon: Upload, c: "var(--teal)" },
  EXPORT: { ar: "تصدير", en: "Exported", icon: Download, c: "var(--gold)" },
  DOWNLOAD: { ar: "تنزيل", en: "Downloaded", icon: Download, c: "var(--sky)" },
  LOGIN: { ar: "تسجيل دخول", en: "Signed in", icon: LogIn, c: "var(--vio)" },
  LOGOUT: { ar: "تسجيل خروج", en: "Signed out", icon: LogOut, c: "var(--muted)" },
};
export const actionLook = (a: string) => ACTION_LOOK[a] ?? { ar: a, en: a, icon: FileText, c: "var(--muted)" };
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(ar() ? "ar-EG-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" });

/** The days before expiry at which alerts go out (the settings, or the system's defaults). */
export function useReminderDays() {
  const can = useAuthStore((s) => s.hasPermission("settings.view"));
  const { data } = useQuery({ queryKey: ["settings", "expiration-rules"], queryFn: settingsApi.getExpirationRules, enabled: can, staleTime: 300_000 });
  return data?.notifyDaysBefore?.length ? data.notifyDaysBefore : [90, 60, 30, 15, 7, 3, 1];
}

/** What was done to one record, from the audit log (when the viewer may read it). */
export function useRecordHistory(recordId?: string | null) {
  const can = useAuthStore((s) => s.hasPermission("auditLogs.view"));
  return useQuery({
    queryKey: ["audit-logs", "record", recordId],
    queryFn: () => auditLogsApi.list({ recordId, pageSize: 20 }),
    enabled: Boolean(recordId) && can,
    staleTime: 30_000,
  });
}
export function History({ items, createdAt }: { items?: AuditLogItem[]; createdAt?: string | null }) {
  const rows: { key: string; icon: LucideIcon; c: string; title: string; who: string; at: string }[] = (items ?? []).map((e) => {
    const a = actionLook(e.action);
    return { key: e.id, icon: a.icon, c: a.c, title: L(a.ar, a.en), who: e.user?.fullName ?? L("النظام", "System"), at: e.createdAt };
  });
  if (!rows.length && createdAt) rows.push({ key: "created", icon: Plus, c: "var(--ok)", title: L("أُضيف إلى النظام", "Added to the system"), who: "", at: createdAt });
  if (!rows.length) return <div className="rc-none">{L("لا يوجد سجل بعد", "No history yet")}</div>;
  return (
    <div className="rc-hist">
      {rows.map((r) => (
        <div key={r.key}>
          <span className="dot" style={css({ "--c": r.c, "--t": `color-mix(in srgb, ${r.c} 13%, var(--surf))` })}>
            <r.icon />
          </span>
          <span className="min-w-0">
            <b>{r.title}</b>
            {r.who && <small>{r.who}</small>}
          </span>
          <time>
            {weekday(r.at)} {dmy(r.at)}
            <br />
            {timeOf(r.at)}
          </time>
        </div>
      ))}
    </div>
  );
}

export function Owner({ tile, round, color, title, sub, onOpen }: { tile: ReactNode; round?: boolean; color: string; title: string; sub?: ReactNode; onOpen?: () => void }) {
  return (
    <div className="rc-own">
      <span className={cn("rc-tile", round && "round")} style={css({ "--kc": color })}>
        {tile}
      </span>
      <div className="t">
        <b>{title}</b>
        {sub && <small>{sub}</small>}
      </div>
      {onOpen && (
        <button type="button" className="rc-btn" onClick={onOpen}>
          {L("فتح", "Open")}
        </button>
      )}
    </div>
  );
}

/** A stable colour per establishment, from its code or id. */
const EST_COLORS = ["var(--pri)", "var(--teal)", "var(--gold)", "var(--vio)", "var(--sky)", "var(--ok)", "var(--bad)"];
export const estColor = (key?: string | null) => EST_COLORS[[...(key ?? "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % EST_COLORS.length];

/** Back to where the viewer came from, or to the list when the page was opened directly. */
export function useBack(fallback: string) {
  const navigate = useNavigate();
  return () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(fallback));
}
