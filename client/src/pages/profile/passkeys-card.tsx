import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPasskeys, registerPasskey, removePasskey, passkeysSupported, passkeyError } from "@/api/passkeys";
import { getErrorMessage } from "@/lib/api";

export function PasskeysCard({ isAr }: { isAr: boolean }) {
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: ["account", "passkeys"], queryFn: listPasskeys });
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const supported = passkeysSupported();
  const embedded = window.self !== window.top;
  async function perform(id?: string) {
    setBusy(id ?? "register");
    try {
      if (id) await removePasskey(id, password);
      else await registerPasskey(password, name.trim());
      setPassword("");
      if (!id) setName("");
      await queryClient.invalidateQueries({ queryKey: ["account", "passkeys"] });
      toast.success(isAr ? (id ? "تم إلغاء المفتاح وجلسات الدخول الخاصة به." : "تم تفعيل الدخول بالبصمة أو الوجه. جرّبه عند تسجيل الدخول القادم.") : (id ? "Passkey and its sessions revoked." : "Passkey enabled. Try it the next time you sign in."));
    } catch (error) { toast.error(passkeyError(error, isAr) ?? getErrorMessage(error)); }
    finally { setBusy(null); }
  }
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5" />{isAr ? "الدخول بالبصمة أو الوجه" : "Fingerprint or face sign-in"}</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">{isAr ? "فعّل مفتاح مرور لحسابك باستخدام Face ID أو بصمة الإصبع أو Windows Hello. الجهاز يختار طريقة التحقق وقد يطلب رمز قفل الجهاز. بيانات البصمة لا تُرسل إلى الموقع، وكلمة المرور تظل متاحة للدخول." : "Create a passkey using Face ID, fingerprint or Windows Hello. Your device chooses verification and may use its screen-lock PIN. Biometrics stay on your device; password sign-in remains available."}</p>
    {embedded ? <p className="text-sm"><a className="text-primary underline" href={`${window.location.origin}/profile`} target="_blank" rel="noopener noreferrer">{isAr ? "افتح الحساب مباشرة لتفعيل البصمة" : "Open your account directly to set up a passkey"}</a></p> : !supported ? <p className="text-sm text-muted-foreground">{isAr ? "مفاتيح المرور تحتاج متصفحًا متوافقًا واتصال HTTPS." : "Passkeys require a compatible browser and HTTPS."}</p> : null}
    <div className="space-y-1.5"><Label htmlFor="passkey-password">{isAr ? "كلمة المرور الحالية لتأكيد الإضافة أو الإلغاء" : "Current password to confirm adding or removing"}</Label><Input id="passkey-password" type="password" autoComplete="current-password" value={password} maxLength={72} onChange={e => setPassword(e.target.value)} /></div>
    {!embedded && supported && <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (password && name.trim() && !busy) void perform(); }}><Input aria-label={isAr ? "اسم الجهاز" : "Device name"} className="min-w-40 flex-1" placeholder={isAr ? "اسم الجهاز، مثل آيفون العمل" : "Device name, e.g. Work iPhone"} value={name} maxLength={80} onChange={e => setName(e.target.value)} /><Button type="submit" disabled={!password || !name.trim() || !!busy}>{busy === "register" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}{isAr ? "تفعيل البصمة / الوجه" : "Enable fingerprint / face"}</Button></form>}
    {keys.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : keys.isError ? <Button variant="outline" onClick={() => keys.refetch()}>{isAr ? "تعذّر تحميل المفاتيح — إعادة المحاولة" : "Could not load passkeys — retry"}</Button> : keys.data?.length ? <ul className="space-y-2">{keys.data.map(key => <li key={key.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><b className="block break-words text-sm">{key.name}</b><small className="block text-muted-foreground">{key.rpId}</small><small className="text-muted-foreground">{isAr ? "آخر استخدام: " : "Last used: "}{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString(isAr ? "ar-SA" : "en-GB") : isAr ? "لم يُستخدم بعد" : "Not used yet"}</small></div><Button type="button" variant="outline" size="sm" disabled={!password || !!busy} onClick={() => perform(key.id)} aria-label={(isAr ? "إلغاء مفتاح " : "Remove passkey ") + key.name}>{busy === key.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{isAr ? "إلغاء" : "Remove"}</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">{isAr ? "لا توجد مفاتيح مرور مفعّلة لحسابك." : "No passkeys enabled for your account."}</p>}
  </CardContent></Card>;
}
