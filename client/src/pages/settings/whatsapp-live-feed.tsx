import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsApi, type WhatsappMessageItem } from "@/api/settings";
import { Rosette } from "@/components/royal/royale-fx";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";

/* Settings → WhatsApp: the registry of every message the system sends (styles/whatsapp-registry.css),
   as in the approved preview — a letterhead with a turning seal and today's success gauge, four
   engraved plaques, a gold marquee of the latest messages, the ledger with search and filters, and a
   gold-titanium iPhone that shows the chosen message as the recipient sees it. */

const POLL_MS = 8000;

const PATHS: Record<string, ReactNode> = {
  sent: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  fail: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5h.01" />
    </>
  ),
  all: <path d="M4 6h16M4 12h16M4 18h10" />,
  rate: <path d="M4 17l5-5 4 4 7-8M15 8h5v5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  test: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5c1.4-3.7 4.2-5.6 7.5-5.6s6.1 1.9 7.5 5.6" />
    </>
  ),
  dual: (
    <>
      <rect x="3" y="4" width="11" height="16" rx="2" />
      <rect x="16" y="4" width="5" height="16" rx="1.5" />
    </>
  ),
  stream: <path d="M4 6h16M4 12h16M4 18h16" />,
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" />,
  whatsapp: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
      <path d="M8.5 9.5c.4 2.6 2.4 4.6 5 5.2l1.4-1.4 2 1" />
    </>
  ),
  back: <path d="m15 6-6 6 6 6" />,
  video: (
    <>
      <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </>
  ),
  call: <path d="M5 3.5h3.5l2 5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  clip: <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L14.5 7" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
};
const Icon = ({ name }: { name: keyof typeof PATHS }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {PATHS[name]}
  </svg>
);

function useRelativeTime(isRtl: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(isRtl ? "ar-EG-u-nu-latn" : "en-GB", { numeric: "auto" }), [isRtl]);
  return (iso: string) => {
    const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const a = Math.abs(s);
    if (a < 45) return isRtl ? "الآن" : "just now";
    if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
    return rtf.format(Math.round(s / 86400), "day");
  };
}

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const c = phone.replace(/[^\d+]/g, "");
  if (c.startsWith("+966") && c.length === 13) return `+966 ${c.slice(4, 6)} ${c.slice(6, 9)} ${c.slice(9)}`;
  if (c.startsWith("+20") && c.length === 13) return `+20 ${c.slice(3, 5)} ${c.slice(5, 9)} ${c.slice(9)}`;
  return c;
}
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const tone = (m: WhatsappMessageItem) => (m.status === "FAILED" ? "bad" : m.kind === "TEST" ? "test" : "ok");

/** The phone's clock, minute by minute. */
function usePhoneClock() {
  const read = () => {
    const d = new Date();
    return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setT(read()), 10_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** A gold-titanium iPhone showing one message as WhatsApp shows it to the recipient. */
function Phone({ message, isRtl }: { message?: WhatsappMessageItem; isRtl: boolean }) {
  const clock = usePhoneClock();
  return (
    <div className="wr-iphone">
      <i className="wr-btn act" />
      <i className="wr-btn vup" />
      <i className="wr-btn vdn" />
      <i className="wr-btn pwr" />
      <div className="wr-frame" />
      <div className="wr-glass">
        <div className="wr-screen">
          <div className="wr-island">
            <i />
          </div>
          <div className="wr-status">
            <b>{clock}</b>
            <span className="ind">
              <svg viewBox="0 0 18 12" fill="currentColor">
                <rect x="0" y="8" width="3" height="4" rx=".8" />
                <rect x="5" y="5.5" width="3" height="6.5" rx=".8" />
                <rect x="10" y="3" width="3" height="9" rx=".8" />
                <rect x="15" y="0" width="3" height="12" rx=".8" />
              </svg>
              <svg viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.4A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .5 3.3l1.3 1.4A8.7 8.7 0 0 1 8 2.2zm0 3.7c1.4 0 2.7.5 3.6 1.4l1.3-1.4A7.1 7.1 0 0 0 8 4 7.1 7.1 0 0 0 3.1 5.9l1.3 1.4A5.2 5.2 0 0 1 8 5.9zm0 3.6c-.5 0-1 .2-1.3.5L8 11.6l1.3-1.6c-.3-.3-.8-.5-1.3-.5z" />
              </svg>
              <svg viewBox="0 0 27 12">
                <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45" />
                <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
                <path d="M24 4v4c.9-.3 1.5-1.1 1.5-2S24.9 4.3 24 4z" fill="currentColor" opacity=".5" />
              </svg>
            </span>
          </div>
          <div className="wr-wa">
            <span className="back">
              <Icon name="back" />
            </span>
            <span className="pic">{isRtl ? "س" : "S"}</span>
            <span className="tx">
              <b>
                {isRtl ? "تنبيهات سند" : "SanaD alerts"}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.8 4.5 5.8v5.4c0 4.7 3.2 8.3 7.5 10 4.3-1.7 7.5-5.3 7.5-10V5.8z" fill="currentColor" />
                  <path d="m8.8 12 2.2 2.2 4.2-4.4" fill="none" stroke="#0b141a" strokeWidth="2" />
                </svg>
              </b>
              <small>{isRtl ? "متصل الآن" : "online"}</small>
            </span>
            <span className="acts">
              <Icon name="video" />
              <Icon name="call" />
            </span>
          </div>
          <div className="wr-chat">
            <span className="wr-enc">{isRtl ? "🔒 الرسائل والمكالمات مشفّرة تمامًا بين الطرفين." : "🔒 Messages and calls are end-to-end encrypted."}</span>
            <span className="wr-day">{isRtl ? "اليوم" : "Today"}</span>
            {message?.message ? (
              <div key={message.id} className={cn("wr-bub", message.status === "FAILED" && "fail")}>
                <WhatsappText text={message.message} />
                {message.error && <span className="err">{isRtl ? `لم تصل: ${message.error}` : `Not delivered: ${message.error}`}</span>}
                <span className="tm">
                  {hhmm(message.at)}
                  {message.status === "FAILED" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff8a80" strokeWidth="2.4">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16.5h.01" />
                    </svg>
                  ) : (
                    <svg width="17" height="11" viewBox="0 0 18 11" fill="none" stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round">
                      <path d="m1 6 3.5 3.5L11 2M7 8.5 8 9.5 14.5 2" />
                    </svg>
                  )}
                </span>
              </div>
            ) : (
              <span className="wr-day">{isRtl ? "مفيش رسالة مختارة" : "No message selected"}</span>
            )}
          </div>
          <div className="wr-compose">
            <span className="field">
              <Icon name="smile" />
              <span>{isRtl ? "رسالة" : "Message"}</span>
              <Icon name="clip" />
              <Icon name="camera" />
            </span>
            <span className="mic">
              <Icon name="mic" />
            </span>
          </div>
          <div className="wr-home">
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsappLiveFeed({ isRtl }: { isRtl: boolean }) {
  const [filter, setFilter] = useState<"ALL" | "SENT" | "FAILED">("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"dual" | "stream" | "phone">("dual");
  const [copied, setCopied] = useState<string | null>(null);
  const ago = useRelativeTime(isRtl);

  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["settings", "whatsapp", "messages", filter],
    queryFn: () => settingsApi.getWhatsappMessages(filter === "ALL" ? undefined : filter),
    refetchInterval: POLL_MS,
  });
  const items = data?.items ?? [];

  // Messages that arrive while the page is open come in with a bloom.
  const seen = useRef<Set<string> | null>(null);
  const fresh = new Set<string>();
  if (data) {
    if (!seen.current) seen.current = new Set(items.map((m) => m.id));
    for (const m of items) if (!seen.current.has(m.id)) fresh.add(m.id);
  }
  useEffect(() => {
    if (data && seen.current) for (const m of data.items) seen.current.add(m.id);
  }, [data]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((m) => [m.to, m.name, m.message, m.error].some((x) => x?.toLowerCase().includes(q))) : items;
  }, [items, query]);
  const current = items.find((m) => m.id === selected) ?? list[0] ?? items[0];

  const stats = data?.stats ?? { sentToday: 0, failedToday: 0, total: 0 };
  const tried = stats.sentToday + stats.failedToday;
  const rate = tried ? Math.round((stats.sentToday / tried) * 100) : null;
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const ticker = items.slice(0, 15);
  const synced = dataUpdatedAt ? ago(new Date(dataUpdatedAt).toISOString()) : "";

  async function copy(phone: string | null) {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(phone);
      toast.success(isRtl ? "اتنسخ الرقم" : "Number copied");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error(isRtl ? "ما اتنسخش، انسخ الرقم بإيدك" : "Couldn't copy — copy the number by hand");
    }
  }

  const kindLabel = (m: WhatsappMessageItem) => (m.kind === "TEST" ? (isRtl ? "رسالة تجريبية" : "Test message") : isRtl ? "تنبيه تلقائي" : "Automatic alert");

  return (
    <section id="whatsapp-live-stream-panel" className="wr" dir={isRtl ? "rtl" : "ltr"} aria-labelledby="wr-title">
      <i className="wr-corner c1" />
      <i className="wr-corner c2" />
      <i className="wr-corner c3" />
      <i className="wr-corner c4" />

      <header className="wr-head">
        <div className="wr-seal">
          <Rosette />
          <b>
            <Icon name="whatsapp" />
          </b>
          <span className="wr-live" title={isRtl ? "البث شغال" : "Live"} />
        </div>
        <div className="min-w-0">
          <div className="wr-eyebrow">{isRtl ? "مركز البث المباشر" : "LIVE BROADCAST CENTER"}</div>
          <h2 id="wr-title" className="wr-title">
            {isRtl ? "ديوان رسائل واتساب" : "WhatsApp message registry"}
          </h2>
          <p className="wr-sub">{isRtl ? "كل رسالة بيبعتها النظام، لحظة بلحظة، مع معاينة على الموبايل." : "Every message the system sends, as it goes, with a preview on the phone."}</p>
        </div>
        <div className="wr-gauge" aria-label={isRtl ? "نسبة نجاح الإرسال اليوم" : "Today's delivery rate"}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="wr-gg" x1="0" x2="1">
                <stop offset="0" stopColor="#8a6a35" />
                <stop offset=".5" stopColor="#f3dfae" />
                <stop offset="1" stopColor="#c9a464" />
              </linearGradient>
            </defs>
            <circle className="tr" cx="60" cy="60" r="50" fill="none" strokeWidth="9" />
            <circle className="v" cx="60" cy="60" r="50" fill="none" strokeWidth="9" stroke="url(#wr-gg)" strokeDasharray={`${armed && rate !== null ? (rate / 100) * 314 : 0} 400`} />
          </svg>
          <b>
            <span>{rate === null ? "—" : `${rate}%`}</span>
            <small>{isRtl ? "نجاح اليوم" : "today"}</small>
          </b>
        </div>
      </header>

      <div className="wr-plaques">
        {(
          [
            ["ok", "sent", isRtl ? "المرسلة اليوم" : "Sent today", stats.sentToday, isRtl ? "رسالة" : "msgs", "0s"],
            ["bad", "fail", isRtl ? "المتعثرة اليوم" : "Failed today", stats.failedToday, isRtl ? "رسالة" : "msgs", ".8s"],
            ["gold", "all", isRtl ? "إجمالي السجل" : "In the log", stats.total, isRtl ? "رسالة" : "msgs", "1.6s"],
            ["ok", "rate", isRtl ? "نجاح الإرسال" : "Delivery rate", rate === null ? "—" : `${rate}%`, "", "2.4s"],
          ] as const
        ).map(([c, icon, label, value, unit, d]) => (
          <div key={label} className={cn("wr-plaque", c)} style={{ ["--d" as string]: d }}>
            <span className="t">
              {label}
              <Icon name={icon} />
            </span>
            <b>
              {value}
              {unit && <small>{unit}</small>}
            </b>
          </div>
        ))}
      </div>

      {ticker.length > 0 && (
        <div className="wr-marquee" aria-label={isRtl ? "آخر الرسائل" : "Latest messages"}>
          <span className="lab">
            <i />
            {isRtl ? "شريط البث" : "Live feed"}
          </span>
          <div className="wr-track" style={{ ["--dur" as string]: `${Math.max(30, ticker.length * 8)}s` }}>
            {[0, 1].map((copyNo) =>
              ticker.map((m) => (
                <span key={`${copyNo}-${m.id}`} className={cn("wr-chip", tone(m))} aria-hidden={copyNo === 1}>
                  <i />
                  {kindLabel(m)}
                  <span>{formatPhone(m.to)}</span>
                  <small>{ago(m.at)}</small>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      <div className="wr-bar">
        <div className="wr-seg" role="group" aria-label={isRtl ? "الحالة" : "Status"}>
          {(
            [
              ["ALL", isRtl ? "كل الرسائل" : "All"],
              ["SENT", isRtl ? "المرسلة" : "Sent"],
              ["FAILED", isRtl ? "المتعثرة" : "Failed"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
              {filter === k && <b>{items.length}</b>}
            </button>
          ))}
        </div>
        <label className="wr-search">
          <Icon name="search" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isRtl ? "ابحث برقم الجوال أو الاسم أو نص الرسالة" : "Search by number, name or text"} />
        </label>
        <div className="wr-seg" role="group" aria-label={isRtl ? "طريقة العرض" : "View"}>
          {(
            [
              ["dual", isRtl ? "السجل مع الموبايل" : "Log and phone"],
              ["stream", isRtl ? "السجل بس" : "Log only"],
              ["phone", isRtl ? "الموبايل بس" : "Phone only"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} title={l} aria-label={l} onClick={() => setView(k)}>
              <Icon name={k} />
            </button>
          ))}
        </div>
        <button type="button" className="wr-iconb" onClick={() => refetch()} aria-label={isRtl ? "تحديث" : "Refresh"}>
          <span className={cn("grid", isFetching && "animate-spin")}>
            <Icon name="refresh" />
          </span>
        </button>
        <span className="wr-sync">
          <i />
          {isRtl ? `مزامنة: ${synced}` : `Synced ${synced}`}
        </span>
      </div>

      <div className={cn("wr-stage", view !== "dual" && view)}>
        <div className="wr-ledger">
          {list.length ? (
            list.map((m) => {
              const c = tone(m);
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  className={cn("wr-entry", fresh.has(m.id) && "fresh")}
                  aria-current={current?.id === m.id}
                  onClick={() => {
                    setSelected(m.id);
                    if (view === "stream") setView("dual");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(m.id);
                    }
                  }}
                >
                  <span className={cn("wr-wax", c)}>
                    <Icon name={m.status === "FAILED" ? "fail" : m.kind === "TEST" ? "test" : "sent"} />
                  </span>
                  <div className="wr-card">
                    <div className="wr-ch">
                      <span className="wr-who">
                        <span className="wr-av">
                          <Icon name="user" />
                        </span>
                        <span className="min-w-0">
                          <b>{m.name || (isRtl ? "رقم غير مسمّى" : "Unnamed number")}</b>
                          <span className="wr-num">
                            {formatPhone(m.to)}
                            <button
                              type="button"
                              className="wr-copy"
                              aria-label={isRtl ? "نسخ الرقم" : "Copy number"}
                              onClick={(e) => {
                                e.stopPropagation();
                                void copy(m.to);
                              }}
                            >
                              <Icon name={copied === m.to ? "sent" : "copy"} />
                            </button>
                          </span>
                        </span>
                      </span>
                      <span className={cn("wr-tag", c)}>{kindLabel(m)}</span>
                      <span className="wr-when">
                        <Icon name="clock" />
                        {ago(m.at)}
                      </span>
                    </div>
                    {m.message && (
                      <div className="wr-body">
                        <WhatsappText text={m.message} />
                      </div>
                    )}
                    {m.error && <div className="wr-err">{isRtl ? `سبب التعثر: ${m.error}` : `Why it failed: ${m.error}`}</div>}
                    <div className="wr-cf">
                      {m.status === "FAILED" ? (
                        <span className="ko">
                          <Icon name="fail" />
                          {isRtl ? "ما اتبعتتش" : "Not sent"}
                        </span>
                      ) : (
                        <span className="ok">
                          <Icon name="sent" />
                          {isRtl ? `اتبعتت · ${hhmm(m.at)}` : `Sent · ${hhmm(m.at)}`}
                        </span>
                      )}
                      <span className="open">
                        <Icon name="eye" />
                        {isRtl ? "عرض على الموبايل" : "Show on the phone"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="wr-empty">{query ? (isRtl ? "مفيش رسايل بالبحث ده." : "No messages match.") : isRtl ? "لسه مفيش رسايل اتبعتت." : "No messages yet."}</div>
          )}
        </div>
        <aside className="wr-device" aria-label={isRtl ? "معاينة على الموبايل" : "Phone preview"}>
          <span className="cap">{isRtl ? "على موبايل المستلم" : "ON THE RECIPIENT'S PHONE"}</span>
          <Phone message={current} isRtl={isRtl} />
          {items.length > 1 && (
            <div className="wr-picker" aria-label={isRtl ? "اختار رسالة" : "Pick a message"}>
              {items.slice(0, 8).map((m) => (
                <button key={m.id} type="button" aria-pressed={current?.id === m.id} onClick={() => setSelected(m.id)}>
                  #{m.id.slice(-6)}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
