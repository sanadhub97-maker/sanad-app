import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { alertsApi } from "@/api/alerts";

/* The notifications page's current alerts: documents ending or ended and overdue
   tasks, each one markable as followed up. */
function useCopy() { const { i18n } = useTranslation(); const ar = (i18n.language || "ar").startsWith("ar"); return (a: string, e: string) => ar ? a : e; }
function SelectBox({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return <label className="grid gap-1 text-sm"><span>{label}</span><select className="h-10 rounded-lg border bg-background px-3" value={value} onChange={e => onChange(e.target.value)}>{children}</select></label>;
}
export function LiveAlerts() {
  const copy = useCopy(); const qc = useQueryClient();
  const [filter, setFilter] = useState("all"), [state, setState] = useState("all"), [page, setPage] = useState(1), [busy, setBusy] = useState("");
  const query = useQuery({ queryKey: ["alerts"], queryFn: alertsApi.list, refetchInterval: 60000 });
  const rows = (query.data ?? []).filter(a => (filter === "all" || a.category === filter) && (state === "all" || a.acknowledged === (state === "acknowledged")));
  async function acknowledge(key: string, done: boolean) { setBusy(key); try { await alertsApi.acknowledge(key, done); await qc.invalidateQueries({ queryKey: ["alerts"] }); } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(""); } }
  return <div className="space-y-4"><div className="flex flex-wrap items-end gap-3">
    <SelectBox label={copy("نوع التنبيه", "Alert type")} value={filter} onChange={v => { setFilter(v); setPage(1); }}><option value="all">{copy("الكل", "All")}</option><option value="document">{copy("المستندات والإقامات", "Documents & iqamas")}</option><option value="task">{copy("المهام المتأخرة", "Overdue tasks")}</option></SelectBox>
    <SelectBox label={copy("حالة المتابعة", "Follow-up")} value={state} onChange={v => { setState(v); setPage(1); }}><option value="all">{copy("الكل", "All")}</option><option value="pending">{copy("بحاجة للمتابعة", "Pending")}</option><option value="acknowledged">{copy("تمت المراجعة", "Reviewed")}</option></SelectBox>
    <span className="text-sm text-muted-foreground">{rows.length} {copy("تنبيه حالي", "current alerts")}</span></div>
    <p className="text-xs text-muted-foreground">{copy("المراجعة تسجل متابعتك للتنبيه؛ يختفي سبب التنبيه بعد تجديد المستند أو إنجاز المهمة. الإرسال على واتساب يظل وفق إعدادات الكفالة الحالية.", "Review records your follow-up; the alert clears when the document is renewed or task completed. WhatsApp follows your existing sponsorship settings.")}</p>
    {query.isPending && <p>{copy("جاري التحميل…", "Loading…")}</p>}{query.isError && <p role="alert">{getErrorMessage(query.error)}</p>}
    {!query.isPending && !query.isError && !rows.length && <p>{copy("لا توجد تنبيهات مطابقة.", "No matching alerts.")}</p>}
    {rows.slice((page - 1) * 20, page * 20).map(a => <div key={a.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><Link className="font-semibold hover:underline" to={a.href}>{copy(a.title, a.titleEn)}</Link><p className="text-sm text-muted-foreground">{a.due.slice(0, 10)} · {a.status === "EXPIRED" ? copy("منتهي", "Expired") : a.status === "OVERDUE" ? copy("مهمة متأخرة", "Overdue task") : copy("قارب الانتهاء", "Expiring soon")} · {a.acknowledged ? copy("تمت المراجعة", "Reviewed") : copy("بانتظار المتابعة", "Pending")}</p></div><Button variant="outline" disabled={Boolean(busy)} onClick={() => void acknowledge(a.key, !a.acknowledged)}>{a.acknowledged ? copy("إعادة للمتابعة", "Reopen") : copy("تمت المراجعة", "Mark reviewed")}</Button></div>)}
    <Pager page={page} total={rows.length} size={20} setPage={setPage} />
  </div>;
}
function Pager({ page, total, size = 20, setPage }: { page: number; total: number; size?: number; setPage: (v: number) => void }) { const c = useCopy(); return total > size ? <div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>{c("السابق", "Previous")}</Button><span>{page} / {Math.ceil(total / size)}</span><Button variant="outline" disabled={page * size >= total} onClick={() => setPage(page + 1)}>{c("التالي", "Next")}</Button></div> : null; }
