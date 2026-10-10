import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Bell, Building2, Check, Clock, Download, FileText, Plus, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { dashboardApi, type DashboardAttentionItem } from "@/api/dashboard";
import { tasksApi, type DailyTask } from "@/api/tasks";
import { violationsApi } from "@/api/violations";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency } from "@/lib/utils";
import { PxArea, PxBadge, PxBars, PxCard, PxDonut, PxStat } from "@/components/royal/px";

/* The home page in the Royal design, as approved in the preview: a royal-blue
   welcome with a stack of documents, the compliance gauge, four stat cards,
   payments by category month by month, documents by status, what ends soon,
   the latest activity, payments by branch, and today's tasks. */

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const daysAr = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);
const docsAr = (n: number) => (n === 1 ? "وثيقة واحدة" : n === 2 ? "وثيقتان" : n <= 10 ? `${n} وثائق` : `${n} وثيقة`);
const v = (o: Record<string, string | number>) => o as CSSProperties;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Waits two frames so gauges and bars grow from zero. */
function useArmed() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

export default function DashboardLulu() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canTasks = hasPermission("tasks.view");
  const canEditTask = hasPermission("tasks.edit");
  const today = localIso();
  const armed = useArmed();
  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";

  const { data: summary } = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary });
  const { data: charts } = useQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });
  const { data: overview } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: recent } = useQuery({ queryKey: ["dashboard", "recent"], queryFn: dashboardApi.recentActivity, staleTime: 60_000 });
  const dayKey = ["tasks", "day", today];
  const { data: tasks } = useQuery({ queryKey: dayKey, queryFn: () => tasksApi.day(today), enabled: canTasks });
  const canViolations = hasPermission("violations.view");
  const { data: vio } = useQuery({ queryKey: ["violations", "stats"], queryFn: violationsApi.stats, enabled: canViolations });

  const toggleTask = useMutation({
    mutationFn: (x: DailyTask) => tasksApi.update(x.id, { done: !x.done }),
    onMutate: (x) => {
      queryClient.setQueryData<DailyTask[]>(dayKey, (old) => old?.map((y) => (y.id === x.id ? { ...y, done: !x.done } : y)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast.error(isAr ? "تعذّر تحديث المهمة" : "Couldn't update the task"),
  });

  const dateLine = useMemo(() => {
    const d = new Date();
    const g = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    let h = "";
    try {
      h = d.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      /* no Hijri calendar in this browser */
    }
    return h ? `${g} · ${h.replace(/\s*(هـ|AH)$/, "")} ${isAr ? "هـ" : "AH"}` : g;
  }, [locale, isAr]);
  const hour = new Date().getHours();
  const greeting = isAr ? (hour < 12 ? "صباح الخير" : "مساء الخير") : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.fullName ?? "").trim().split(/\s+/)[0] ?? "";

  const tracked = summary?.totalTrackedDocuments ?? 0;
  const valid = summary?.validDocuments ?? 0;
  const soon = overview?.endingIn30 ?? summary?.expiringDocuments ?? 0;
  const expired = overview?.expired ?? summary?.expiredDocuments ?? 0;
  const score = tracked ? valid / tracked : 1;
  const pct = Math.round(score * 100);
  const taskList = tasks ?? [];
  const done = taskList.filter((x) => x.done).length;
  const nearest = (overview?.attention ?? []).find((a) => a.days >= 0);

  // The last six months, oldest first.
  const months = useMemo(() => {
    const n = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(n.getFullYear(), n.getMonth() - 5 + i, 1);
      return { key: localIso(d).slice(0, 7), label: d.toLocaleDateString(locale, { month: "long" }) };
    });
  }, [locale]);
  const monthly = useMemo(() => {
    const byKey = new Map((charts?.monthlyPayments ?? []).map((m) => [String(m.month).slice(0, 7), m.total]));
    return months.map((m) => byKey.get(m.key) ?? 0);
  }, [charts, months]);
  const thisMonth = summary?.monthlyPaymentsAmount ?? monthly[5] ?? 0;
  const change = monthly[4] > 0 ? ((thisMonth - monthly[4]) / monthly[4]) * 100 : null;

  const sixTotal = monthly.reduce((a, b) => a + b, 0);
  const attention = (overview?.attention ?? []).slice(0, 6);
  const leftText = (d: number) => (d < 0 ? (isAr ? `انتهت منذ ${daysAr(-d)}` : `Expired ${-d}d ago`) : d === 0 ? (isAr ? "تنتهي اليوم" : "Ends today") : isAr ? `بعد ${daysAr(d)}` : `In ${d} days`);
  const openItem = (item: DashboardAttentionItem) => navigate(item.employeeId ? `/employees/${item.employeeId}` : item.sourceType === "VEHICLE" ? `/vehicles?focus=${item.recordId}` : "/company-documents");
  const rel = useMemo(() => new Intl.RelativeTimeFormat(isAr ? "ar" : "en", { numeric: "auto" }), [isAr]);
  const ago = (iso: string) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return rel.format(-Math.max(1, Math.round(s / 60)), "minute");
    if (s < 86400) return rel.format(-Math.round(s / 3600), "hour");
    return rel.format(-Math.round(s / 86400), "day");
  };
  const activity = (recent?.recentActivities ?? []).slice(0, 5);

  const upcoming = (overview?.upcoming ?? []).slice(0, 6);
  const upLabels = upcoming.map((m) => {
    const [yy, mm] = m.month.split("-").map(Number);
    return new Date(yy, mm - 1, 1).toLocaleDateString(locale, { month: "long" });
  });
  const ringLen = 2 * Math.PI * 27;

  return (
    <div className="px">
      <PageHeader
        title={isAr ? "لوحة التحكم" : "Dashboard"}
        description={dateLine}
        actions={
          <>
            {hasPermission("reports.view") && (
              <button type="button" className="ry-btn" onClick={() => navigate("/reports")}>
                <Download /> {isAr ? "تصدير التقرير" : "Export report"}
              </button>
            )}
            {hasPermission("employees.create") && (
              <Button onClick={() => navigate("/employees?new=true")}>
                <Plus className="h-4 w-4" /> {isAr ? "إضافة موظف" : "Add employee"}
              </Button>
            )}
          </>
        }
      />

      <section className="px-welcome" style={v({ "--i": 0 })}>
        <svg className="px-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="tr" cx="32" cy="32" r="27" fill="none" strokeWidth="6" />
          <circle className="v" cx="32" cy="32" r="27" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${armed ? score * ringLen : 0} ${ringLen}`} transform="rotate(-90 32 32)" />
          <text x="32" y="37" textAnchor="middle">
            {pct}%
          </text>
        </svg>
        <div className="tx">
          <h2>
            {greeting}
            {firstName && (isAr ? ` يا ${firstName}` : `, ${firstName}`)}
          </h2>
          <p>
            {isAr ? (
              <>
                {pct}% من الوثائق سارية
                {expired > 0 && (
                  <>
                    ، و<b>{docsAr(expired)} منتهية</b> تحتاج تجديد
                  </>
                )}
                {soon > 0 && (
                  <>
                    ، و<b>{docsAr(soon)}</b> تنتهي خلال 30 يومًا
                  </>
                )}
                {canTasks && taskList.length > 0 && <>، و{taskList.length - done} مهام مفتوحة اليوم</>}.
              </>
            ) : (
              <>
                {pct}% of documents are valid
                {expired > 0 && (
                  <>
                    ; <b>{expired} have expired</b>
                  </>
                )}
                {soon > 0 && (
                  <>
                    ; <b>{soon}</b> end within 30 days
                  </>
                )}
                .
              </>
            )}
          </p>
        </div>
        <div className="acts">
          {hasPermission("reports.view") && (
            <button type="button" className="wb" onClick={() => navigate("/reports")}>
              <Download /> {isAr ? "تقرير اليوم" : "Today’s report"}
            </button>
          )}
          <button type="button" className="wb gold" onClick={() => navigate("/notifications")}>
            <Bell /> {isAr ? "راجع الوثائق" : "Review documents"}
          </button>
        </div>
      </section>

      <div className="px-stats">
        <PxStat
          i={1}
          label={isAr ? "إجمالي الموظفين" : "Employees"}
          value={summary?.totalEmployees ?? 0}
          icon={Users}
          color="#2563eb"
          chip={{ text: `${summary?.activeEmployees ?? 0}`, tone: "up" }}
          sub={isAr ? "على رأس العمل" : "on duty"}
          onClick={() => navigate("/employees")}
        />
        <PxStat
          i={2}
          label={isAr ? "وثائق منتهية" : "Expired documents"}
          value={expired}
          icon={AlertTriangle}
          color="#dc2626"
          chip={expired ? { text: isAr ? "تحتاج تجديد" : "Renew", tone: "dn" } : { text: isAr ? "لا شيء" : "None", tone: "up" }}
          sub={isAr ? `من ${tracked} وثيقة` : `of ${tracked}`}
          onClick={() => navigate("/reports?tab=documents&status=EXPIRED&scope=all")}
        />
        <PxStat
          i={3}
          label={isAr ? "تنتهي خلال 30 يوم" : "Ending within 30 days"}
          value={soon}
          icon={Clock}
          color="#d97706"
          chip={nearest ? { text: leftText(nearest.days), tone: "warn" } : { text: isAr ? "لا شيء قريب" : "Nothing soon", tone: "up" }}
          spark={upcoming.map((m) => m.count)}
          onClick={() => navigate("/reports?tab=documents&status=EXPIRING_SOON&scope=all")}
        />
        <PxStat
          i={4}
          label={isAr ? "مدفوعات الشهر" : "This month’s payments"}
          value={Math.round(thisMonth)}
          unit={isAr ? "ر.س" : "SAR"}
          icon={Wallet}
          color="#16a34a"
          chip={change === null ? undefined : { text: `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}%`, tone: change >= 0 ? "up" : "dn" }}
          sub={change === null ? (isAr ? "هذا الشهر" : "This month") : isAr ? "عن الشهر الماضي" : "vs last month"}
          spark={monthly}
          onClick={() => navigate("/payments")}
        />
      </div>

      <div className="px-g2">
        <PxCard i={5} title={isAr ? "مواعيد الانتهاء القادمة" : "Upcoming expiries"} sub={isAr ? "الوثائق اللي هتنتهي في كل شهر من الشهور الجاية" : "Documents ending in each of the coming months"}>
          {upcoming.length ? (
            <PxArea labels={upLabels} series={[{ name: isAr ? "تنتهي" : "Ending", color: "var(--lx)", values: upcoming.map((m) => m.count) }]} />
          ) : (
            <div className="px-empty">{isAr ? "لا شيء ينتهي في الشهور الجاية" : "Nothing ends in the coming months"}</div>
          )}
        </PxCard>
        <PxCard i={6} title={isAr ? "حالة الوثائق" : "Documents by status"} sub={isAr ? `${tracked} وثيقة` : `${tracked} documents`}>
          <PxDonut
            center={tracked}
            centerLabel={isAr ? "وثيقة" : "documents"}
            parts={[
              { label: isAr ? "سارية" : "Valid", value: valid, color: "var(--l-green)" },
              { label: isAr ? "قريبة الانتهاء" : "Ending soon", value: soon, color: "var(--l-amber)" },
              { label: isAr ? "منتهية" : "Expired", value: expired, color: "var(--l-rose)" },
            ]}
          />
        </PxCard>
      </div>

      <div className="px-g2">
        <PxCard
          i={7}
          body={false}
          title={isAr ? "تحتاج متابعة" : "Needs follow-up"}
          sub={isAr ? "الأقرب للانتهاء" : "Soonest first"}
          actions={
            <button type="button" className="px-btn" onClick={() => navigate("/notifications")}>
              {isAr ? "عرض الكل" : "View all"}
            </button>
          }
        >
          {overview && attention.length === 0 ? (
            <div className="px-empty">{isAr ? "كل الوثائق سارية، لا شيء ينتهي قريبًا" : "Every document is valid; nothing ends soon"}</div>
          ) : (
            <div className="px-tw">
              <table className="px-t">
                <thead>
                  <tr>
                    <th>{isAr ? "الاسم" : "Name"}</th>
                    <th>{isAr ? "الوثيقة" : "Document"}</th>
                    <th>{isAr ? "الانتهاء" : "Expiry"}</th>
                    <th>{isAr ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((item, j) => {
                    const name = (isAr ? item.nameAr : item.nameEn || item.nameAr).trim();
                    const tone = item.days < 0 ? "bad" : item.days <= 30 ? "warn" : "ok";
                    return (
                      <tr key={item.key} className="click" style={v({ "--j": j })} onClick={() => openItem(item)}>
                        <td>
                          <div className="px-who">
                            <span className="px-av">
                              {item.sourceType === "COMPANY_DOCUMENT" ? (
                                <Building2 style={{ width: 16, height: 16 }} />
                              ) : (
                                name
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((w) => w[0])
                                  .join("")
                              )}
                            </span>
                            <div>
                              <b>{name}</b>
                              <small>{(isAr ? item.branchName : item.branchNameEn ?? item.branchName) ?? "—"}</small>
                            </div>
                          </div>
                        </td>
                        <td>{isAr ? item.documentAr : item.documentEn}</td>
                        <td>{leftText(item.days)}</td>
                        <td>
                          <PxBadge tone={tone}>{tone === "bad" ? (isAr ? "منتهي" : "Expired") : tone === "warn" ? (isAr ? "قريب الانتهاء" : "Ending soon") : isAr ? "ساري" : "Valid"}</PxBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PxCard>
        <PxCard i={8} body={false} title={isAr ? "آخر النشاطات" : "Latest activity"}>
          {activity.length === 0 ? (
            <div className="px-empty">{isAr ? "لا يوجد نشاط بعد" : "No activity yet"}</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="px-li">
                <span className="px-av">{(a.user?.fullName ?? (isAr ? "النظام" : "System")).trim().charAt(0)}</span>
                <div className="px-who">
                  <div>
                    <b>{a.user?.fullName ?? (isAr ? "النظام" : "System")}</b>
                    <small>
                      {t(`auditLogs.actions.${a.action}`, { defaultValue: a.action })} · {t(`moduleNames.${a.module}`, { defaultValue: a.module })}
                    </small>
                  </div>
                </div>
                <span className="t">{ago(a.createdAt)}</span>
              </div>
            ))
          )}
        </PxCard>
      </div>

      <div className={canTasks ? "px-g2" : "px"}>
        <PxCard i={9} title={isAr ? "المدفوعات الشهرية" : "Monthly payments"} sub={isAr ? `آخر 6 أشهر · ${fmt(sixTotal)} ر.س` : `Last 6 months · ${fmt(sixTotal)} SAR`}>
          {sixTotal === 0 ? <div className="px-empty">{isAr ? "لا توجد مدفوعات في آخر 6 أشهر" : "No payments in the last 6 months"}</div> : <PxBars labels={months.map((m) => m.label)} values={monthly} unit={isAr ? "ر.س" : "SAR"} />}
        </PxCard>
        {canTasks && (
          <PxCard
            i={10}
            body={false}
            title={isAr ? "مهام اليوم" : "Today’s tasks"}
            sub={isAr ? `أنجزت ${done} من ${taskList.length}` : `${done} of ${taskList.length} done`}
            actions={
              <button type="button" className="px-btn" onClick={() => navigate("/daily-tasks")}>
                {isAr ? "كل المهام" : "All tasks"}
              </button>
            }
          >
            {taskList.length === 0 ? (
              <div className="px-empty">{isAr ? "لا توجد مهام اليوم" : "No tasks today"}</div>
            ) : (
              taskList.slice(0, 6).map((x) => (
                <button key={x.id} type="button" className={cn("px-li w-full text-start", x.done && "opacity-60")} aria-pressed={x.done} disabled={!canEditTask} onClick={() => toggleTask.mutate(x)}>
                  <span className="px-av">{x.done ? <Check style={{ width: 16, height: 16 }} /> : <Clock style={{ width: 16, height: 16 }} />}</span>
                  <div className="px-who">
                    <div>
                      <b className={cn(x.done && "line-through")}>{x.title}</b>
                      {x.notes && <small>{x.notes}</small>}
                    </div>
                  </div>
                  <PxBadge tone={x.done ? "ok" : "mut"}>{x.done ? (isAr ? "تمت" : "Done") : isAr ? "مفتوحة" : "Open"}</PxBadge>
                </button>
              ))
            )}
          </PxCard>
        )}
      </div>

      {canViolations && vio && vio.authorityTotal + vio.staffTotal > 0 && (
        <div className="px-stats">
          <PxStat i={11} label={isAr ? "مخالفات مفتوحة" : "Open violations"} value={vio.open} icon={AlertTriangle} color="#b91c1c" sub={formatCurrency(vio.unpaidAmount)} onClick={() => navigate("/violations")} />
          <PxStat i={12} label={isAr ? "متأخرة السداد" : "Overdue"} value={vio.overdue} icon={Clock} color="#dc2626" onClick={() => navigate("/violations")} />
          <PxStat i={13} label={isAr ? "ميعادها خلال أسبوعين" : "Due in 2 weeks"} value={vio.dueSoon} icon={Clock} color="#d97706" onClick={() => navigate("/violations")} />
          <PxStat i={14} label={isAr ? "جزاءات قائمة" : "Open penalties"} value={vio.staffOpen} icon={FileText} color="#7c3aed" onClick={() => navigate("/violations")} />
        </div>
      )}
    </div>
  );
}
