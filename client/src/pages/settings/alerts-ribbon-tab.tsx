import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ListChecks, Loader2, Palette, RotateCcw, Save, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { AppleIcon } from "@/components/common/apple-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ribbonApi, type AlertsRibbonSettings, type RibbonCat, type RibbonItem } from "@/api/alerts";
import { AlertsRibbonView } from "@/components/layout/alerts-ribbon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Settings → Alerts ribbon: the look and the content of the ribbon in the top bar, for the
   whole organisation. The preview is the real ribbon, fed with example items. */

export const DEFAULT_RIBBON: AlertsRibbonSettings = {
  enabled: true,
  speed: 70,
  direction: "rtl",
  skin: "black",
  height: "regular",
  fontSize: 13,
  chips: "pill",
  categories: { expired: true, soon: true, tasks: true, violations: true, tax: false },
  maxItems: 12,
  pauseOnHover: true,
  showCount: true,
  showDue: true,
  showAllClear: true,
};

const SAMPLES: Omit<RibbonItem, "key" | "date">[] = [
  { cat: "expired", title: "إقامة - أحمد محمد علي", days: -12, href: "" },
  { cat: "expired", title: "رخصة بلدية - فرع الرياض", days: -3, href: "" },
  { cat: "violations", title: "مخالفة مرور - هايلكس 4521", days: 4, href: "" },
  { cat: "tasks", title: "اعتماد كشف الرواتب", days: 0, time: "12:00", href: "" },
  { cat: "soon", title: "السجل التجاري - المؤسسة", days: 6, href: "" },
  { cat: "tax", title: "إقرار ضريبة القيمة المضافة 2026 — الربع 3", days: 10, href: "" },
  { cat: "soon", title: "التأمين الطبي - سارة خالد", days: 21, href: "" },
  { cat: "tasks", title: "متابعة تجديد السجل التجاري", days: 0, time: "15:00", href: "" },
];

function sampleItems(s: AlertsRibbonSettings): RibbonItem[] {
  const now = Date.now();
  return SAMPLES.filter((x) => s.categories[x.cat])
    .slice(0, s.maxItems)
    .map((x, n) => ({ ...x, key: `sample:${n}`, date: new Date(now + x.days * 86_400_000).toISOString().slice(0, 10) }));
}

const CATS: { key: RibbonCat; color: string; ar: string; en: string }[] = [
  { key: "expired", color: "#e5484d", ar: "وثائق منتهية", en: "Expired documents" },
  { key: "soon", color: "#f59e0b", ar: "وثائق قريبة الانتهاء", en: "Documents ending soon" },
  { key: "tasks", color: "#2f7de1", ar: "مهام اليوم المفتوحة والمتأخرة", en: "Open and late tasks" },
  { key: "violations", color: "#9333ea", ar: "مخالفات ميعادها خلال أسبوع", en: "Violations due within a week" },
  { key: "tax", color: "#10a874", ar: "إقرارات ضريبية مستحقة", en: "Tax returns due" },
];

function Seg<T extends string | number>({ value, options, onChange, disabled }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          disabled={disabled}
          aria-pressed={o.v === value}
          onClick={() => onChange(o.v)}
          className={cn("rounded-full border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60", o.v === value ? "border-amber-500 bg-amber-500 text-white" : "border-border bg-card/60 text-foreground hover:border-amber-500/60")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm font-bold text-foreground">
        <span>{label}</span>
        {value && <span className="text-xs font-semibold text-amber-600 tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled, dot }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; dot?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-foreground">
        {dot && <i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: dot }} />}
        <span className="truncate">{label}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

export function AlertsRibbonTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const L = (ar: string, en: string) => (isRtl ? ar : en);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings", "alerts-ribbon"], queryFn: ribbonApi.getSettings });
  const [draft, setDraft] = useState<AlertsRibbonSettings>(DEFAULT_RIBBON);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: ribbonApi.saveSettings,
    onSuccess: (res) => {
      toast.success(L("اتحفظت إعدادات الشريط", res.message || "Saved"));
      queryClient.invalidateQueries({ queryKey: ["settings", "alerts-ribbon"] });
      queryClient.invalidateQueries({ queryKey: ["alerts", "ribbon"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {L("جاري تحميل إعدادات الشريط...", "Loading ribbon settings...")}
      </div>
    );
  }

  const set = <K extends keyof AlertsRibbonSettings>(k: K, v: AlertsRibbonSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(data ?? DEFAULT_RIBBON);
  const lock = !canEdit;
  const speedLabel = draft.speed >= 120 ? L("بطيء جدًا", "Very slow") : draft.speed >= 85 ? L("بطيء", "Slow") : draft.speed >= 55 ? L("عادي", "Normal") : draft.speed >= 30 ? L("سريع", "Fast") : L("سريع جدًا", "Very fast");

  const section = (icon: LucideIcon, tone: "amber" | "purple" | "blue" | "emerald", title: string, desc: string, children: React.ReactNode) => (
    <Card className="specular-border overflow-hidden border-border/80">
      <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
        <div className="flex items-center gap-3.5">
          <AppleIcon icon={icon} tone={tone} size="md" />
          <div>
            <CardTitle className="text-base sm:text-lg font-black text-foreground">{title}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">{desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {section(
        Eye,
        "amber",
        L("معاينة حية", "Live preview"),
        L("الشريط الحقيقي بأمثلة تجريبية، بيتغير وإنت بتعدّل.", "The real ribbon with example items; it changes as you edit."),
        draft.enabled ? (
          <div className="rounded-2xl border border-border/70 bg-card/40 p-3">
            <AlertsRibbonView settings={draft} items={sampleItems(draft)} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">{L("الشريط مخفي. فعّل «إظهار الشريط» عشان يظهر.", "The ribbon is hidden.")}</p>
        )
      )}

      {section(
        Palette,
        "purple",
        L("الشكل والحركة", "Look and motion"),
        L("السرعة والاتجاه والألوان والحجم.", "Speed, direction, colours and size."),
        <div className="space-y-6">
          <Toggle label={L("إظهار الشريط في القائمة العلوية", "Show the ribbon in the top bar")} checked={draft.enabled} onChange={(v) => set("enabled", v)} disabled={lock} />
          <div className="grid gap-6 md:grid-cols-2">
            <Field label={L("سرعة الحركة", "Speed")} value={speedLabel}>
              <input type="range" min={15} max={180} step={5} dir="rtl" value={draft.speed} disabled={lock} onChange={(e) => set("speed", Number(e.target.value))} className="w-full accent-amber-600" aria-label={L("سرعة الحركة", "Speed")} />
            </Field>
            <Field label={L("حجم الخط", "Font size")} value={`${draft.fontSize}px`}>
              <input type="range" min={11} max={17} step={1} dir="rtl" value={draft.fontSize} disabled={lock} onChange={(e) => set("fontSize", Number(e.target.value))} className="w-full accent-amber-600" aria-label={L("حجم الخط", "Font size")} />
            </Field>
            <Field label={L("اتجاه الحركة", "Direction")}>
              <Seg value={draft.direction} disabled={lock} onChange={(v) => set("direction", v)} options={[{ v: "rtl", label: L("من اليمين لليسار", "Right to left") }, { v: "ltr", label: L("من اليسار لليمين", "Left to right") }]} />
            </Field>
            <Field label={L("شكل الشريط", "Style")}>
              <Seg value={draft.skin} disabled={lock} onChange={(v) => set("skin", v)} options={[{ v: "black", label: L("أسود وذهب", "Black & gold") }, { v: "ivory", label: L("عاجي", "Ivory") }, { v: "emerald", label: L("زمردي", "Emerald") }]} />
            </Field>
            <Field label={L("الارتفاع", "Height")}>
              <Seg value={draft.height} disabled={lock} onChange={(v) => set("height", v)} options={[{ v: "compact", label: L("مدمج", "Compact") }, { v: "regular", label: L("عادي", "Regular") }, { v: "large", label: L("كبير", "Large") }]} />
            </Field>
            <Field label={L("شكل التنبيه", "Item style")}>
              <Seg value={draft.chips} disabled={lock} onChange={(v) => set("chips", v)} options={[{ v: "pill", label: L("بإطار", "Framed") }, { v: "plain", label: L("بدون إطار", "Plain") }]} />
            </Field>
          </div>
        </div>
      )}

      {section(
        ListChecks,
        "blue",
        L("اللي يظهر في الشريط", "What the ribbon shows"),
        L("كل مستخدم بيشوف اللي صلاحياته تسمح له بيه بس.", "Each person sees only what their permissions allow."),
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            {CATS.map((c) => (
              <Toggle key={c.key} dot={c.color} label={L(c.ar, c.en)} checked={draft.categories[c.key]} disabled={lock} onChange={(v) => set("categories", { ...draft.categories, [c.key]: v })} />
            ))}
          </div>
          <div className="max-w-md">
            <Field label={L("أقصى عدد تنبيهات", "Most items")} value={String(draft.maxItems)}>
              <input type="range" min={3} max={20} step={1} dir="rtl" value={draft.maxItems} disabled={lock} onChange={(e) => set("maxItems", Number(e.target.value))} className="w-full accent-amber-600" aria-label={L("أقصى عدد تنبيهات", "Most items")} />
            </Field>
          </div>
        </div>
      )}

      {section(
        SlidersHorizontal,
        "emerald",
        L("السلوك والتفاصيل", "Behaviour and details"),
        L("لو مفيش تنبيهات ورسالة «كله سليم» مقفولة، الشريط بيختفي لحد ما يظهر تنبيه.", "With nothing to show and the all-clear message off, the ribbon hides."),
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label={L("يقف لما أمرر الماوس عليه", "Pause on hover")} checked={draft.pauseOnHover} disabled={lock} onChange={(v) => set("pauseOnHover", v)} />
          <Toggle label={L("إظهار عدد التنبيهات", "Show the count")} checked={draft.showCount} disabled={lock} onChange={(v) => set("showCount", v)} />
          <Toggle label={L("إظهار موعد الانتهاء", "Show the due date")} checked={draft.showDue} disabled={lock} onChange={(v) => set("showDue", v)} />
          <Toggle label={L("رسالة «كله سليم» لما مفيش تنبيهات", "“All clear” message when empty")} checked={draft.showAllClear} disabled={lock} onChange={(v) => set("showAllClear", v)} />
        </div>
      )}

      {canEdit ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setDraft(DEFAULT_RIBBON)} className="rounded-xl h-11 px-6 text-xs font-black gap-2">
            <RotateCcw className="h-4 w-4" />
            {L("إعادة الضبط للافتراضي", "Reset to default")}
          </Button>
          <Button type="button" onClick={() => save.mutate(draft)} disabled={save.isPending || !dirty} className="rounded-xl px-8 h-11 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110 gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {L("حفظ الإعدادات", "Save settings")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{L("ليس لديك صلاحية تعديل هذه الإعدادات.", "You can view but not edit these settings.")}</p>
      )}
    </div>
  );
}
