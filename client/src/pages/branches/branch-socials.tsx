import { Share2 } from "lucide-react";
import { tr } from "@/i18n";
import { Input } from "@/components/ui/input";
import { SOCIALS, socialList, type SocialKey, type Socials } from "@/lib/socials";
import "@/styles/custody.css";

/* The establishment's social accounts and website: one field per network with its
   own mark, and beneath them the row exactly as it prints at the foot of its
   documents (certificates, custody records, clearances). */

const HINT: Record<SocialKey, string> = {
  website: "www.example.sa",
  whatsapp: "05XXXXXXXX",
  x: "@username",
  instagram: "@username",
  snapchat: "@username",
  tiktok: "@username",
  linkedin: "linkedin.com/company/…",
  facebook: "facebook.com/…",
  youtube: "@channel",
  telegram: "@username",
};

export function SocialMark({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** The row as it prints. */
export function SocialsStrip({ socials }: { socials: Socials | null | undefined }) {
  const list = socialList(socials);
  if (!list.length) return null;
  return (
    <div className={`cu-soc-strip${list.length > 5 ? " many" : ""}`}>
      {list.map((s) => (
        <span key={s.key} className="it">
          <span className="ic"><SocialMark path={s.path} /></span>
          <b dir="ltr">{s.label}</b>
        </span>
      ))}
    </div>
  );
}

export function BranchSocialsSection({ value, onChange, isAr }: { value: Socials | null | undefined; onChange: (v: Socials) => void; isAr: boolean }) {
  const v = value ?? {};
  const filled = socialList(v).length;
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.03] p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-amber-500/15">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{isAr ? "وسائل التواصل الاجتماعي" : "Social accounts"}</span>
        </div>
        <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
          {isAr ? "بتتطبع في آخر شهادات وأوراق المؤسسة" : "Printed at the foot of the establishment's documents"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIALS.map((s) => (
          <label key={s.key} className="cu-soc-field">
            <span className="ic"><SocialMark path={s.path} /></span>
            <span className="min-w-0 flex-1">
              <small>{isAr ? s.ar : s.en}</small>
              <Input
                dir="ltr"
                value={v[s.key] ?? ""}
                maxLength={200}
                placeholder={HINT[s.key]}
                onChange={(e) => onChange({ ...v, [s.key]: e.target.value })}
                className="h-9 rounded-lg border-border/60 bg-background/90 text-sm"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="cu-soc-preview">
        <span className="cap">{filled ? tr("هتظهر كده في الطباعة", "How it prints") : tr("اكتب أي حساب وهتشوف شكله في الطباعة هنا", "Fill in an account to see how it prints")}</span>
        <div className="paper">
          {filled ? <SocialsStrip socials={v} /> : <span className="empty">— {tr("مفيش حسابات لسه", "No accounts yet")} —</span>}
        </div>
        <small className="note">{tr("تقدر تكتب اسم المستخدم أو تحط الرابط كامل، وهيتطبع كاسم مستخدم. ورقم الواتساب بيتطبع بمفتاح الدولة.", "Type the username or paste the full link; it prints as a handle. A WhatsApp number prints with its country code.")}</small>
      </div>
    </div>
  );
}
