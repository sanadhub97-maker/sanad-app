import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Smartphone, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { maintenanceApi } from "@/api/maintenance";
import { getErrorMessage, keepRefreshToken } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
export function SessionsCard({ isAr }: { isAr: boolean }) {
  const queryClient = useQueryClient(), navigate = useNavigate();
  const query = useQuery({ queryKey: ["account", "sessions"], queryFn: maintenanceApi.sessions });
  const [busy, setBusy] = useState<string | null>(null);
  async function revoke(id?: string, current = false) {
    if (current && !window.confirm(isAr ? "هتخرج من حسابك على الجهاز الحالي. متابعة؟" : "You will sign out on this device. Continue?")) return;
    setBusy(id ?? "others");
    try {
      const result = await maintenanceApi.revokeSession(id);
      if (result.signedOut) { keepRefreshToken(undefined); useAuthStore.getState().clearAuth(); queryClient.clear(); navigate("/login", { replace: true }); }
      else await queryClient.invalidateQueries({ queryKey: ["account", "sessions"] });
      toast.success(isAr ? "تم إغلاق الجلسة." : "Session revoked.");
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setBusy(null); }
  }
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Laptop size={20} />{isAr ? "الأجهزة والجلسات النشطة" : "Devices and active sessions"}</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">{isAr ? "راجع الأجهزة المفتوح عليها حسابك، وأغلق أي جلسة لا تستخدمها. آخر نشاط يُحدّث كل خمس دقائق تقريبًا." : "Review signed-in devices and revoke sessions you no longer use. Activity updates about every five minutes."}</p>
    <Button variant="outline" disabled={!!busy || !query.data?.some(s => !s.current)} onClick={() => revoke()}><LogOut size={16} />{isAr ? "إغلاق كل الجلسات الأخرى" : "Sign out all other sessions"}</Button>
    {query.isPending ? <Loader2 className="animate-spin" /> : query.isError ? <Button variant="outline" onClick={() => query.refetch()}>{isAr ? "إعادة المحاولة" : "Retry"}</Button> : query.data?.map(session => <div key={session.familyId} className="flex items-start gap-3 rounded-xl border p-3">
      {/Android|iPhone|iPad/i.test(session.userAgent ?? "") ? <Smartphone size={20} /> : <Laptop size={20} />}<div className="min-w-0 flex-1"><b className="text-sm">{session.current ? (isAr ? "الجهاز الحالي" : "Current device") : /Android|iPhone|iPad/i.test(session.userAgent ?? "") ? (isAr ? "هاتف أو جهاز لوحي" : "Phone or tablet") : (isAr ? "كمبيوتر / متصفح" : "Computer / browser")}</b><p className="break-all text-xs text-muted-foreground">{session.userAgent}</p><p className="text-xs text-muted-foreground">{session.ipAddress} · {isAr ? "آخر نشاط: " : "Last active: "}{new Date(session.lastUsedAt).toLocaleString(isAr ? "ar-SA" : "en-GB")}</p></div>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => revoke(session.familyId, session.current)}>{busy === session.familyId ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}{isAr ? "إغلاق" : "Sign out"}</Button>
    </div>)}
  </CardContent></Card>;
}
