import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Building2, Hourglass, Mail, Palette, Printer, ShieldCheck, type LucideIcon } from "lucide-react";
import { CoverHero } from "@/components/royal/cards";
import { AuthedFileImage } from "@/components/common/authed-file-image";
import { WhatsappLogo } from "@/components/common/whatsapp-logo";
import { settingsApi } from "@/api/settings";

const THEMES: Record<string, [string, string]> = { malaki: ["الملكي", "Royal"], zumurrudi: ["الزمردي", "Emerald"], aqiq: ["العقيقي", "Agate"] };

/** What each settings section stands at, for the crown and the side menu. */
function useSettingsGlance() {
  const company = useQuery({ queryKey: ["settings", "company"], queryFn: settingsApi.getCompany }).data;
  const theme = useQuery({ queryKey: ["settings", "print-theme"], queryFn: settingsApi.getPrintTheme }).data;
  const rules = useQuery({ queryKey: ["settings", "expiration"], queryFn: settingsApi.getExpirationRules }).data;
  const email = useQuery({ queryKey: ["settings", "email"], queryFn: settingsApi.getEmail }).data;
  const whatsapp = useQuery({ queryKey: ["settings", "whatsapp"], queryFn: settingsApi.getWhatsapp }).data;
  const appearance = useQuery({ queryKey: ["settings", "appearance"], queryFn: settingsApi.getAppearance }).data;
  return { company, theme, rules, email, whatsapp, appearance };
}

export type SettingsKey = "company" | "appearance" | "print" | "expiration" | "email" | "whatsapp";

/** The settings page as a desk: the company crown, a gold side menu, and the chosen section beside it. */
export function SettingsDesk({ isRtl, current, onPick, children }: { isRtl: boolean; current: SettingsKey; onPick: (k: SettingsKey) => void; children: ReactNode }) {
  const L = (ar: string, en: string) => (isRtl ? ar : en);
  const g = useSettingsGlance();
  const name = (isRtl ? g.company?.nameAr || g.company?.nameEn : g.company?.nameEn || g.company?.nameAr) || L("الشركة", "The company");
  const logo = g.company?.logoFileId;
  const themeName = g.theme ? L(THEMES[g.theme]?.[0] ?? g.theme, THEMES[g.theme]?.[1] ?? g.theme) : "—";
  const days = g.rules?.notifyDaysBefore?.length ? [...g.rules.notifyDaysBefore].sort((a, b) => b - a).join(" · ") : "—";
  const mode = g.appearance?.themeMode === "light" ? L("فاتح", "Light") : g.appearance?.themeMode === "dark" ? L("غامق", "Dark") : L("حسب الجهاز", "System");

  const items: { key: SettingsKey; icon: LucideIcon | typeof WhatsappLogo; title: string; note: string; tone?: "ok" | "bad" }[] = [
    { key: "company", icon: Building2, title: L("الشركة", "Company"), note: g.company?.crNumber ? L(`سجل ${g.company.crNumber}`, `CR ${g.company.crNumber}`) : L("الهوية والبيانات الرسمية", "Identity & legal details") },
    { key: "appearance", icon: Palette, title: L("المظهر", "Appearance"), note: L(`الوضع: ${mode}`, `Mode: ${mode}`) },
    { key: "print", icon: Printer, title: L("الطباعة", "Printing"), note: L(`القالب ${themeName}`, `${themeName} design`) },
    { key: "expiration", icon: Hourglass, title: L("قواعد الانتهاء", "Expiry rules"), note: L(`تنبيه قبل ${days} يوم`, `Alerts ${days} days before`) },
    { key: "email", icon: Mail, title: L("البريد الإلكتروني", "Email"), note: g.email?.enabled ? L("مفعّل", "On") : L("غير مفعّل", "Off"), tone: g.email?.enabled ? "ok" : "bad" },
    { key: "whatsapp", icon: WhatsappLogo, title: L("واتساب", "WhatsApp"), note: g.whatsapp?.enabled ? L("التنبيهات مفعّلة", "Alerts on") : L("التنبيهات متوقفة", "Alerts off"), tone: g.whatsapp?.enabled ? "ok" : "bad" },
  ];
  const cur = items.find((i) => i.key === current) ?? items[0];

  return (
    <div className="st-lux">
      {/* The WhatsApp section carries its own crown. */}
      {current !== "whatsapp" && (
        <CoverHero
          color="#c9a464"
          tile={logo ? <AuthedFileImage fileId={logo} isPublic alt={name} className="rx-lux-logo" /> : <ShieldCheck />}
          title={L("إعدادات النظام", "System settings")}
          sub={name}
          chips={
            <>
              <span className="wa-chip"><Printer />{L(`قالب الطباعة: ${themeName}`, `Print: ${themeName}`)}</span>
              <span className="wa-chip"><BellRing />{L(`التنبيه قبل ${days} يوم`, `Alerts ${days} days before`)}</span>
              <span className={g.email?.enabled ? "wa-chip on" : "wa-chip"}><Mail />{g.email?.enabled ? L("البريد مفعّل", "Email on") : L("البريد غير مفعّل", "Email off")}</span>
              <span className={g.whatsapp?.enabled ? "wa-chip on" : "wa-chip"}><WhatsappLogo />{g.whatsapp?.enabled ? L("واتساب مفعّل", "WhatsApp on") : L("واتساب متوقف", "WhatsApp off")}</span>
            </>
          }
          stats={[
            { value: g.rules?.expiringSoonThresholdDays ?? "—", label: L("يوم: حد «قريب الانتهاء»", "days: 'ending soon' line") },
            { value: g.rules?.notifyDaysBefore?.length ?? "—", label: L("موعد تنبيه قبل الانتهاء", "alert dates before expiry") },
            { value: themeName, label: L("قالب المطبوعات", "print design") },
            { value: mode, label: L("وضع العرض", "display mode") },
          ]}
        />
      )}
      <div className="st-desk">
        <nav className="wa-nav st-nav" aria-label={L("أقسام الإعدادات", "Settings sections")}>
          {items.map((it) => (
            <button key={it.key} type="button" className={it.key === current ? "on" : undefined} aria-current={it.key === current} onClick={() => onPick(it.key)}>
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
        <section className="st-pane" key={current}>
          {current !== "whatsapp" && (
            <header className="wa-pane-h">
              <span className="ic">
                <cur.icon />
              </span>
              <div>
                <h2>{cur.title}</h2>
                <p>{cur.note}</p>
              </div>
            </header>
          )}
          <div className="wa-pane-b">{children}</div>
        </section>
      </div>
    </div>
  );
}
