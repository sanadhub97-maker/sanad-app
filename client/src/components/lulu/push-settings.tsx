import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarClock, CheckCircle2, IdCard, Laptop, Moon, Receipt, Send, Share, Smartphone, SquarePlus, Sun, Tablet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { disablePush, enablePush, pushApi, pushState, type PushDevice, type PushKindKey, type PushPrefs, type PushState } from "@/lib/push";
import { cn } from "@/lib/utils";

/* «إشعارات الجهاز»: turn push on for this device, choose what arrives,
   set quiet hours, and send a test. Opened from the account menu. */

const OPEN = "sanad:push-settings";
export const openPushSettings = () => window.dispatchEvent(new Event(OPEN));

const KINDS: { key: PushKindKey; c: string; icon: typeof IdCard; title: string; hint: string }[] = [
  { key: "exp", c: "#e5484d", icon: IdCard, title: "وثيقة انتهت", hint: "إقامة أو جواز أو رخصة انتهت صلاحيتها — بيوصل حتى في وقت الهدوء" },
  { key: "soon", c: "#f59e0b", icon: CalendarClock, title: "وثيقة قربت تنتهي", hint: "في الأيام المحددة في إعدادات الانتهاء" },
  { key: "brief", c: "#2f5fe0", icon: Sun, title: "ملخص الصبح", hint: "كل يوم الساعة 8:00 — المنتهي والقريب ومهام اليوم" },
  { key: "task", c: "#10b981", icon: CheckCircle2, title: "ميعاد مهمة", hint: "في ساعة المهمة، وتقدر تعلّمها «تم» من الإشعار نفسه" },
  { key: "pay", c: "#9333ea", icon: Receipt, title: "سند صرف جديد", hint: "لما حد تاني يسجّل سند" },
];

function deviceOf(d: PushDevice) {
  const ua = d.userAgent || "";
  const kind = /iPad|Tablet|Android(?!.*Mobile)/.test(ua) ? "tablet" : /iPhone|Android|Mobile/.test(ua) ? "phone" : "desktop";
  const os = /iPhone|iPad|Mac OS/.test(ua) && /Mobile|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return { kind, name: [os, browser].filter(Boolean).join(" · ") || "جهاز" };
}

export function PushSettings() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const f = () => setOpen(true);
    window.addEventListener(OPEN, f);
    return () => window.removeEventListener(OPEN, f);
  }, []);

  const { data } = useQuery({ queryKey: ["push", "status"], queryFn: pushApi.status, enabled: open });
  useEffect(() => {
    if (data?.prefs) setPrefs(data.prefs);
  }, [data?.prefs]);
  useEffect(() => {
    if (open) pushState().then(setState).catch(() => setState({ support: "unsupported", permission: "unknown", endpoint: null }));
  }, [open]);

  const on = !!state?.endpoint && state.permission === "granted";
  const devices = data?.devices ?? [];

  async function toggle() {
    setBusy(true);
    try {
      setState(on ? await disablePush() : await enablePush());
      qc.invalidateQueries({ queryKey: ["push", "status"] });
      toast.success(on ? "اتقفلت الإشعارات على الجهاز ده" : "اتفعّلت الإشعارات على الجهاز ده");
    } catch (e) {
      const m = (e as Error).message;
      console.warn("Push enable failed:", e);
      toast.error(
        m === "denied"
          ? "المتصفح رافض الإشعارات. افتح إعدادات الموقع واسمح بالإشعارات، وبعدين جرّب تاني."
          : m === "ios-install"
            ? "على الآيفون والآيباد لازم تضيف SanaD للشاشة الرئيسية الأول."
            : m === "unsupported"
              ? "الجهاز ده مش بيدعم الإشعارات من المتصفح."
              : "ماقدرناش نفعّل الإشعارات دلوقتي، جرّب تاني بعد شوية."
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(next: PushPrefs) {
    setPrefs(next);
    try {
      await pushApi.savePrefs(next);
    } catch {
      toast.error("ماتحفظش، جرّب تاني");
    }
  }

  async function test(kind: PushKindKey) {
    try {
      await pushApi.test(kind);
      toast.success("اتبعت — هيظهر على أجهزتك خلال ثواني");
    } catch {
      toast.error("مفيش جهاز مفعّل عليه الإشعارات لسه");
    }
  }

  async function remove(d: PushDevice) {
    await pushApi.removeDevice(d.id).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["push", "status"] });
    if (state?.endpoint?.endsWith(d.endpointTail)) setState(await pushState());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="font-head">إشعارات الجهاز</DialogTitle>
          <DialogDescription>تنبيهات SanaD توصلك على الموبايل والتابلت والكمبيوتر حتى لو الموقع مقفول.</DialogDescription>
        </DialogHeader>

        <div className={cn("flex items-center gap-3 rounded-3xl border p-4", on ? "border-emerald-500/30 bg-emerald-500/10" : "bg-muted/40")}>
          <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white", on ? "bg-emerald-500" : "bg-primary")}>
            <BellRing className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-sm">{on ? "مفعّلة على الجهاز ده" : "مش مفعّلة على الجهاز ده"}</b>
            <span className="text-xs text-muted-foreground">
              {state?.support === "ios-install"
                ? "محتاجة تضيف SanaD للشاشة الرئيسية الأول"
                : state?.permission === "denied"
                  ? "الإذن مرفوض من إعدادات المتصفح"
                  : devices.length
                    ? `شغّالة على ${devices.length === 1 ? "جهاز واحد" : devices.length === 2 ? "جهازين" : `${devices.length} أجهزة`}`
                    : "فعّلها عشان التنبيهات توصلك"}
            </span>
          </div>
          {state?.support !== "ios-install" && (
            <button type="button" disabled={busy || !state || state.support === "unsupported"} onClick={toggle} className={cn("lux-cta shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-50", on && "!bg-muted !text-foreground")}>
              {busy ? (on ? "جاري الإيقاف…" : "جاري التفعيل…") : on ? "إيقاف" : "تفعيل"}
            </button>
          )}
        </div>

        {state?.support === "ios-install" && (
          <ol className="space-y-2 rounded-3xl border bg-muted/30 p-4 text-sm">
            <li className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary"><Share className="h-4 w-4" /></span> اضغط زرار المشاركة في Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary"><SquarePlus className="h-4 w-4" /></span> اختار «إضافة إلى الشاشة الرئيسية»
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary"><BellRing className="h-4 w-4" /></span> افتح SanaD من أيقونته، وارجع هنا فعّل الإشعارات
            </li>
            <li className="text-xs text-muted-foreground">على الآيفون والآيباد الإشعار بيظهر بالنص بس، من غير صورة الكارت والأزرار.</li>
          </ol>
        )}

        {prefs && (
          <div className="space-y-1">
            <p className="px-1 text-xs font-semibold text-muted-foreground">إيه اللي يوصلك</p>
            {KINDS.map(({ key, c, icon: Icon, title, hint }) => (
              <div key={key} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/40">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: c }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{title}</b>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                {on && (
                  <button type="button" onClick={() => test(key)} className="shrink-0 rounded-xl px-2 py-1 text-xs text-primary hover:bg-primary/10" title="ابعت إشعار تجريبي">
                    <Send className="inline h-3.5 w-3.5" /> جرّب
                  </button>
                )}
                <Switch checked={prefs.kinds[key]} onCheckedChange={(v) => save({ ...prefs, kinds: { ...prefs.kinds, [key]: v } })} />
              </div>
            ))}

            <div className="mt-2 rounded-3xl border p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500 text-white">
                  <Moon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">وقت الهدوء</b>
                  <span className="block text-xs text-muted-foreground">مفيش إشعارات في الوقت ده، إلا الوثائق اللي انتهت</span>
                </span>
                <Switch checked={prefs.quiet.on} onCheckedChange={(v) => save({ ...prefs, quiet: { ...prefs.quiet, on: v } })} />
              </div>
              {prefs.quiet.on && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">من</span>
                  <input type="time" value={prefs.quiet.from} onChange={(e) => e.target.value && save({ ...prefs, quiet: { ...prefs.quiet, from: e.target.value } })} className="rounded-xl border bg-background px-2 py-1" />
                  <span className="text-muted-foreground">لحد</span>
                  <input type="time" value={prefs.quiet.to} onChange={(e) => e.target.value && save({ ...prefs, quiet: { ...prefs.quiet, to: e.target.value } })} className="rounded-xl border bg-background px-2 py-1" />
                </div>
              )}
            </div>
          </div>
        )}

        {devices.length > 0 && (
          <div className="space-y-1">
            <p className="px-1 text-xs font-semibold text-muted-foreground">أجهزتك</p>
            {devices.map((d) => {
              const dv = deviceOf(d);
              const Icon = dv.kind === "phone" ? Smartphone : dv.kind === "tablet" ? Tablet : Laptop;
              const here = !!state?.endpoint?.endsWith(d.endpointTail);
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm">
                    {dv.name}
                    {here && <span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-600">الجهاز ده</span>}
                    <span className="block text-[11px] text-muted-foreground">
                      {d.lastSentAt ? `آخر إشعار ${new Date(d.lastSentAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}` : `اتضاف ${new Date(d.createdAt).toLocaleDateString("ar-EG")}`}
                    </span>
                  </span>
                  <button type="button" onClick={() => remove(d)} className="rounded-xl p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="شيل الجهاز">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
