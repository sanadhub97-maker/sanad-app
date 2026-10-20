import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, CircleCheck, Clock, Coins, FileWarning, ListChecks, TriangleAlert, type LucideIcon } from "lucide-react";
import { ribbonApi, type AlertsRibbonSettings, type RibbonCat, type RibbonItem } from "@/api/alerts";
import { tr } from "@/i18n";

/* The alerts ribbon: the second row of the top bar, on every page. Its look and what it
   carries are set once for the whole organisation in Settings → Alerts ribbon. */

const KINDS: Record<RibbonCat | "clear", { color: string; icon: LucideIcon; ar: string; en: string }> = {
  expired: { color: "#e5484d", icon: FileWarning, ar: "وثيقة منتهية", en: "Expired document" },
  soon: { color: "#e39a14", icon: Clock, ar: "قريبة الانتهاء", en: "Ending soon" },
  tasks: { color: "#2f7de1", icon: ListChecks, ar: "مهمة", en: "Task" },
  violations: { color: "#9333ea", icon: TriangleAlert, ar: "مخالفة", en: "Violation" },
  tax: { color: "#10a874", icon: Coins, ar: "إقرار مستحق", en: "Tax return due" },
  clear: { color: "#10a874", icon: CircleCheck, ar: "الوضع العام", en: "All clear" },
};

const HEIGHTS = { compact: 44, regular: 52, large: 62 } as const;
const dmy = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const plural = (n: number) => (n === 1 ? tr("يوم", "day") : n === 2 ? tr("يومين", "2 days") : n <= 10 ? tr(`${n} أيام`, `${n} days`) : tr(`${n} يومًا`, `${n} days`));

/** The short line on the right of a ribbon item: how far the date is, and what it is. */
function dueText(i: RibbonItem): { text: string; tone: "bad" | "warn" | "" } {
  if (i.cat === "expired" || i.cat === "soon") {
    if (i.days < 0) return { text: tr(`منتهية منذ ${plural(-i.days)}`, `${plural(-i.days)} ago`), tone: "bad" };
    if (i.days === 0) return { text: tr("تنتهي اليوم", "Ends today"), tone: "bad" };
    return { text: tr(`باقي ${plural(i.days)} · ${dmy(i.date)}`, `${plural(i.days)} left · ${dmy(i.date)}`), tone: i.days <= 7 ? "warn" : "" };
  }
  if (i.cat === "tasks") {
    if (i.days < 0) return { text: tr(`متأخرة ${plural(-i.days)}`, `${plural(-i.days)} late`), tone: "bad" };
    return { text: i.time ? tr(`اليوم ${i.time}`, `Today ${i.time}`) : tr("اليوم", "Today"), tone: "" };
  }
  if (i.days < 0) return { text: tr(`فات ميعادها منذ ${plural(-i.days)}`, `Overdue by ${plural(-i.days)}`), tone: "bad" };
  return { text: tr(`آخر موعد ${dmy(i.date)}`, `Due ${dmy(i.date)}`), tone: i.days <= 3 ? "warn" : "" };
}

/** The ribbon itself, from the settings and the items to show (also used for the live preview in Settings). */
export function AlertsRibbonView({ settings, items }: { settings: AlertsRibbonSettings; items: RibbonItem[] }) {
  const clear = items.length === 0;
  const row = (i: RibbonItem, n: number, preview: boolean) => {
    const kind = KINDS[i.cat];
    const due = dueText(i);
    const inner = (
      <>
        <span className="ar-ic" style={{ ["--c" as string]: kind.color }}>
          <kind.icon aria-hidden="true" />
        </span>
        <span className="ar-tx">
          <em>{tr(kind.ar, kind.en)}</em>
          <b>{i.title}</b>
        </span>
        {settings.showDue && <span className={`ar-due ${due.tone}`}>{due.text}</span>}
      </>
    );
    const urgent = i.cat === "expired" || (i.days < 0 && i.cat !== "soon");
    return (
      <span key={`${i.key}:${n}`} className="contents">
        {preview ? (
          <span className="ar-it" data-urgent={urgent ? 1 : undefined} style={{ ["--c" as string]: kind.color }}>{inner}</span>
        ) : (
          <Link to={i.href} className="ar-it" data-urgent={urgent ? 1 : undefined} style={{ ["--c" as string]: kind.color }}>{inner}</Link>
        )}
        <span className="ar-orn" aria-hidden="true"><i /><i /><i /></span>
      </span>
    );
  };

  const list = clear ? [] : items;
  const reps = Math.max(1, Math.ceil(4 / Math.max(1, list.length)));
  const preview = items.some((i) => i.key.startsWith("sample:"));
  const clearRow = (
    <span key="clear" className="contents">
      <span className="ar-it" style={{ ["--c" as string]: KINDS.clear.color }}>
        <span className="ar-ic" style={{ ["--c" as string]: KINDS.clear.color }}><CircleCheck aria-hidden="true" /></span>
        <span className="ar-tx"><em>{tr(KINDS.clear.ar, KINDS.clear.en)}</em><b>{tr("كل الوثائق والتراخيص سارية وبحالة ممتازة", "All documents and licences are valid")}</b></span>
        {settings.showDue && <span className="ar-due ok">{tr("تحديث مباشر", "Live")}</span>}
      </span>
      <span className="ar-orn" aria-hidden="true"><i /><i /><i /></span>
    </span>
  );
  const one = clear ? [clearRow, clearRow, clearRow, clearRow] : Array.from({ length: reps }, (_, r) => list.map((i, n) => row(i, r * list.length + n, preview))).flat();
  const half = (suffix: string) => <span className="contents" key={suffix} aria-hidden={suffix === "b" ? true : undefined}>{one}</span>;

  return (
    <div
      className="ar-ribbon no-print"
      role="region"
      aria-label={tr("شريط التنبيهات", "Alerts ribbon")}
      data-skin={settings.skin}
      data-dir={settings.direction}
      data-style={settings.chips}
      data-pause={settings.pauseOnHover ? 1 : 0}
      style={{ ["--ar-h" as string]: `${HEIGHTS[settings.height]}px`, ["--ar-fs" as string]: `${settings.fontSize}px`, ["--ar-spd" as string]: `${settings.speed}s` }}
    >
      <div className="ar-in">
        <div className="ar-badge">
          <span className="ar-medal"><Bell aria-hidden="true" /></span>
          <span className="ar-badge-t"><strong>{tr("التنبيهات", "Alerts")}</strong><small>{tr("مباشر", "LIVE")}</small></span>
          {settings.showCount && !clear && <span className="ar-cnt">{items.length}</span>}
        </div>
        <div className="ar-win">
          <div className="ar-run">
            {half("a")}
            {half("b")}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The ribbon in the top bar: nothing while it loads, when it is switched off, or when there is nothing to say. */
export function AlertsRibbon() {
  const { data } = useQuery({ queryKey: ["alerts", "ribbon"], queryFn: ribbonApi.get, refetchInterval: 60_000, staleTime: 30_000, retry: false });
  if (!data || !data.settings.enabled) return null;
  if (data.items.length === 0 && !data.settings.showAllClear) return null;
  return (
    <div className="ar-row">
      <AlertsRibbonView settings={data.settings} items={data.items} />
    </div>
  );
}
