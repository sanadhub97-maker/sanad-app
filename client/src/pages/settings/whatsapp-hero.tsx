import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCheck, Clock3, Globe2, LayoutDashboard, Link2, Palette, Radio, ScrollText, Users, XCircle, type LucideIcon } from "lucide-react";
import { CoverHero } from "@/components/royal/cards";
import { WhatsappLogo } from "@/components/common/whatsapp-logo";
import { settingsApi } from "@/api/settings";

const PROVIDER: Record<string, [string, string]> = {
  WHATSAPP_WEB: ["ربط مباشر برمز QR", "Direct QR link"],
  CALLMEBOT: ["بوابة CallMeBot", "CallMeBot gateway"],
  META: ["واجهة Meta الرسمية", "Meta Business API"],
};

/** Everything the WhatsApp page shows at a glance, from the queries its sections already make. */
function useWhatsappGlance() {
  const { data: settings } = useQuery({ queryKey: ["settings", "whatsapp"], queryFn: settingsApi.getWhatsapp });
  const { data: web } = useQuery({ queryKey: ["settings", "whatsapp", "web-status"], queryFn: settingsApi.getWhatsappWebStatus });
  const { data: schedule } = useQuery({ queryKey: ["settings", "whatsapp", "schedule"], queryFn: settingsApi.getWhatsappSchedule });
  const { data: recipients } = useQuery({ queryKey: ["settings", "whatsapp", "recipients"], queryFn: settingsApi.getWhatsappRecipients });
  const { data: feed } = useQuery({ queryKey: ["settings", "whatsapp", "messages", "ALL"], queryFn: () => settingsApi.getWhatsappMessages(), refetchInterval: 30_000 });
  return { settings, web, schedule, recipients, feed, linked: web?.status === "connected", active: (recipients ?? []).filter((r) => r.enabled).length };
}

/** The WhatsApp page's crown: the linked number, the provider, the daily send time and today's tally. */
export function WhatsappHero({ isRtl }: { isRtl: boolean }) {
  const L = (ar: string, en: string) => (isRtl ? ar : en);
  const { settings, web, schedule, feed, linked, active } = useWhatsappGlance();
  const provider = settings?.provider ? PROVIDER[settings.provider] : null;

  return (
    <CoverHero
      color="#25d366"
      tile={<WhatsappLogo className="wa-logo" />}
      title={L("مركز رسائل واتساب", "WhatsApp message centre")}
      sub={L("التنبيهات الصباحية والمسائية التي تصل فريقك كل يوم", "The morning and evening alerts your team receives every day")}
      chips={
        <>
          <span className={linked ? "wa-chip on" : "wa-chip"}>
            <Link2 />
            {linked ? <bdi dir="ltr">{web?.phone}</bdi> : L("لا يوجد رقم مربوط", "No number linked")}
          </span>
          {provider && (
            <span className="wa-chip">
              <Radio />
              {L(provider[0], provider[1])}
            </span>
          )}
          <span className={settings?.enabled ? "wa-chip on" : "wa-chip off"}>
            <i className="dot" />
            {settings?.enabled ? L("التنبيهات مفعّلة", "Alerts on") : L("التنبيهات متوقفة", "Alerts off")}
          </span>
          <span className="wa-chip">
            <Clock3 />
            {L("يوميًا الساعة", "Daily at")} <bdi dir="ltr">{schedule?.sendTime ?? "—"}</bdi>
          </span>
          <span className="wa-chip">
            <Globe2 />
            {schedule?.language === "en" ? "English" : "العربية"}
          </span>
        </>
      }
      stats={[
        { value: feed?.stats.sentToday ?? "—", label: L("رسالة اليوم", "sent today") },
        { value: feed?.stats.failedToday ?? "—", label: L("تعذّر إرسالها اليوم", "failed today"), color: feed?.stats.failedToday ? "#ef4444" : undefined },
        { value: feed?.stats.total ?? "—", label: L("إجمالي الرسائل", "messages in all") },
        { value: <span className="wa-num"><Users />{active}</span>, label: L("رقم يستقبل التنبيهات", "numbers receiving") },
      ]}
    />
  );
}

type SectionId = "overview" | "connect" | "schedule" | "look" | "people" | "log";
const KEEP = "sanad.whatsapp.section";

/** The page as a desk: a gold side menu, and one section at a time beside it. */
export function WhatsappDesk({ isRtl, connect, schedule, look, people, log }: { isRtl: boolean; connect: ReactNode; schedule: ReactNode; look: ReactNode; people: ReactNode; log: ReactNode }) {
  const L = (ar: string, en: string) => (isRtl ? ar : en);
  const g = useWhatsappGlance();
  const [open, setOpen] = useState<SectionId>(() => {
    try {
      return (localStorage.getItem(KEEP) as SectionId) || "overview";
    } catch {
      return "overview";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEEP, open);
    } catch {
      /* not kept */
    }
  }, [open]);

  const items: { id: SectionId; icon: LucideIcon; title: string; note: string; tone?: "ok" | "bad" }[] = [
    { id: "overview", icon: LayoutDashboard, title: L("نظرة عامة", "Overview"), note: L("حالة الإرسال اليوم", "Today at a glance") },
    { id: "connect", icon: Link2, title: L("الربط والخدمة", "Link & provider"), note: g.linked ? L("الرقم مربوط", "Number linked") : L("لا يوجد رقم مربوط", "No number linked"), tone: g.linked ? "ok" : "bad" },
    { id: "schedule", icon: CalendarClock, title: L("الجدولة واللغة", "Schedule & language"), note: L(`يوميًا ${g.schedule?.sendTime ?? ""}`, `Daily ${g.schedule?.sendTime ?? ""}`) },
    { id: "look", icon: Palette, title: L("شكل رسالة الصبح", "Morning message"), note: L("معاينة حية واختيار التصميم", "Live preview & design") },
    { id: "people", icon: Users, title: L("المستلمون", "Recipients"), note: L(`${g.active} رقم مفعّل`, `${g.active} active`) },
    { id: "log", icon: ScrollText, title: L("سجل الرسائل", "Message log"), note: L(`${g.feed?.stats.sentToday ?? 0} رسالة اليوم`, `${g.feed?.stats.sentToday ?? 0} today`) },
  ];
  const body: Record<SectionId, ReactNode> = { overview: <Overview isRtl={isRtl} go={setOpen} g={g} log={log} />, connect, schedule, look, people, log };
  const cur = items.find((i) => i.id === open) ?? items[0];

  return (
    <div className="wa-desk">
      <nav className="wa-nav" aria-label={L("أقسام واتساب", "WhatsApp sections")}>
        {items.map((it) => (
          <button key={it.id} type="button" className={it.id === open ? "on" : undefined} aria-current={it.id === open} onClick={() => setOpen(it.id)}>
            <span className="ic">
              <it.icon />
            </span>
            <span className="tx">
              <b>{it.title}</b>
              <small className={it.tone}>{it.note}</small>
            </span>
          </button>
        ))}
      </nav>
      <section className="wa-pane" key={open}>
        <header className="wa-pane-h">
          <span className="ic">
            <cur.icon />
          </span>
          <div>
            <h2>{cur.title}</h2>
            <p>{cur.note}</p>
          </div>
        </header>
        <div className="wa-pane-b space-y-6">{body[open]}</div>
      </section>
    </div>
  );
}

/** At a glance: four jewelled tiles that open their section, then the latest messages. */
function Overview({ isRtl, go, g, log }: { isRtl: boolean; go: (id: SectionId) => void; g: ReturnType<typeof useWhatsappGlance>; log: ReactNode }) {
  const L = (ar: string, en: string) => (isRtl ? ar : en);
  const tiles: { id: SectionId; icon: LucideIcon; label: string; value: ReactNode; foot: string; tone?: "ok" | "bad" }[] = [
    { id: "connect", icon: Link2, label: L("الرقم المربوط", "Linked number"), value: g.linked ? <bdi dir="ltr">{g.web?.phone}</bdi> : L("غير مربوط", "Not linked"), foot: g.settings?.provider ? L(PROVIDER[g.settings.provider]?.[0] ?? "", PROVIDER[g.settings.provider]?.[1] ?? "") : "—", tone: g.linked ? "ok" : "bad" },
    { id: "schedule", icon: CalendarClock, label: L("موعد الإرسال", "Send time"), value: <bdi dir="ltr">{g.schedule?.sendTime ?? "—"}</bdi>, foot: L("كل يوم بتوقيت مكة", "Every day, Riyadh time") },
    { id: "people", icon: Users, label: L("المستلمون", "Recipients"), value: g.active, foot: L(`من ${g.recipients?.length ?? 0} رقم مسجل`, `of ${g.recipients?.length ?? 0} saved`) },
    { id: "log", icon: g.feed?.stats.failedToday ? XCircle : CheckCheck, label: L("رسائل اليوم", "Today's messages"), value: g.feed?.stats.sentToday ?? 0, foot: g.feed?.stats.failedToday ? L(`${g.feed.stats.failedToday} تعذّر إرسالها`, `${g.feed.stats.failedToday} failed`) : L("كلها وصلت", "All delivered"), tone: g.feed?.stats.failedToday ? "bad" : "ok" },
  ];
  return (
    <>
      <div className="wa-tiles">
        {tiles.map((t) => (
          <button key={t.label} type="button" className="wa-tile" onClick={() => go(t.id)}>
            <span className="ic">
              <t.icon />
            </span>
            <small>{t.label}</small>
            <b>{t.value}</b>
            <span className={`ft ${t.tone ?? ""}`}>{t.foot}</span>
          </button>
        ))}
      </div>
      {log}
    </>
  );
}
