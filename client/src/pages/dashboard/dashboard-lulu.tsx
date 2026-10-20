import { useMemo, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Activity, AlertTriangle, Bell, BookUser, Building2, Car, Check, ClipboardList, Clock, Download, FileText, FileWarning, HeartPulse, IdCard, KeyRound, ListChecks, Plus, Settings, ShieldPlus, TriangleAlert, Users, WalletCards, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { dashboardApi, type DashboardAttentionItem } from "@/api/dashboard";
import { tasksApi, type DailyTask } from "@/api/tasks";
import { violationsApi } from "@/api/violations";
import { maintenanceApi } from "@/api/maintenance";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency } from "@/lib/utils";
import { PxBadge, PxBars, monthColor, PxCard, PxDonut } from "@/components/royal/px";
import { ActivityTimeline, FollowLedger, KindLedger, RoyalArea, RoyalCard, RoyalStat, type KindRow } from "@/components/royal/royal-kit";
import { Guilloche, Medal } from "@/components/royal/royale-fx";

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

/** The coin on each activity: what part of the system it touched. */
const MODULE_ICON: Record<string, LucideIcon> = {
  employees: Users, employeeDocuments: IdCard, companyDocuments: Building2, licenses: FileText, branches: Building2, payments: WalletCards,
  tasks: ListChecks, violations: TriangleAlert, vehicles: Car, custody: ClipboardList, settings: Settings, users: Users, roles: KeyRound, auth: KeyRound,
};
const ACTION_COLOR: Record<string, string> = { CREATE: "#3fbf7f", UPDATE: "#29a8d6", DELETE: "#ef6b5b", LOGIN: "#d6b678", LOGOUT: "#a89c82", IMPORT: "#a86de0", EXPORT: "#a86de0", DOWNLOAD: "#a86de0" };
const SOURCE_ICON: Record<DashboardAttentionItem["sourceType"], LucideIcon> = { EMPLOYEE_IQAMA: IdCard, EMPLOYEE_PASSPORT: BookUser, EMPLOYEE_DOCUMENT: FileText, COMPANY_DOCUMENT: Building2, VEHICLE: Car };

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
  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";

  const { data: summary } = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary });
  const { data: charts } = useQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });
  const { data: overview } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: recent } = useQuery({ queryKey: ["dashboard", "recent"], queryFn: dashboardApi.recentActivity, staleTime: 60_000 });
  const dayKey = ["tasks", "day", today];
  const { data: tasks } = useQuery({ queryKey: dayKey, queryFn: () => tasksApi.day(today), enabled: canTasks });
  const canViolations = hasPermission("violations.view");
  const { data: vio } = useQuery({ queryKey: ["violations", "stats"], queryFn: violationsApi.stats, enabled: canViolations });
  // What the daily rounds missed (the backup, the morning message), for the admins.
  const isAdmin = Boolean(user?.isSuperAdmin || user?.roles?.includes("Admin"));
  const { data: health } = useQuery({ queryKey: ["maintenance", "health"], queryFn: maintenanceApi.health, enabled: isAdmin, staleTime: 10 * 60_000 });

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

  // Documents by kind, for the ledger card; a kind with nothing tracked is left out.
  const byType = overview?.byType ?? {};
  const kinds: KindRow[] = (
    [
      ["IQAMA", isAr ? "الإقامات" : "Iqamas", "#29a8d6", IdCard, "/employee-documents?category=IQAMA"],
      ["PASSPORT", isAr ? "الجوازات" : "Passports", "#6d6cf0", BookUser, "/employee-documents?category=PASSPORT"],
      ["HEALTH_CERTIFICATE", isAr ? "الشهادات الصحية" : "Health certificates", "#2bb5a6", HeartPulse, "/employee-documents?category=HEALTH_CERTIFICATE"],
      ["MEDICAL_INSURANCE", isAr ? "التأمين الطبي" : "Medical insurance", "#e39a14", ShieldPlus, "/employee-documents?category=MEDICAL_INSURANCE"],
      ["COMPANY", isAr ? "وثائق الشركة" : "Company documents", "#a86de0", Building2, "/company-documents"],
      ["VEHICLE", isAr ? "المركبات" : "Vehicles", "#ef8a5b", Car, "/vehicles"],
      ["OTHER", isAr ? "وثائق أخرى" : "Other documents", "#8c97a8", FileText, "/employee-documents"],
    ] as [string, string, string, LucideIcon, string][]
  )
    .filter(([key]) => (byType[key] ?? 0) > 0)
    .map(([key, label, color, icon, to]) => ({ key, label, color, icon, count: byType[key] ?? 0, onOpen: () => navigate(to) }));
  const maxMonth = Math.max(1, ...monthly);
  const dmy = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toLocaleDateString("en-GB"); };

  return (
    <div className="px">
      <PageHeader
        title={isAr ? "لوحة التحكم" : "Dashboard"}
        eyebrow={dateLine}
        description={isAr ? "ملخص اليوم لكل المؤسسات." : "Today's summary across every establishment."}
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

      {health?.problems.map((p) => (
        <div key={p.code} className="rx-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div className="min-w-0">
            <b>{isAr ? p.titleAr : p.titleEn}</b>
            <span>{isAr ? p.detailAr : p.detailEn}</span>
          </div>
          <button type="button" className="ry-btn" onClick={() => navigate(p.code === "backup" || p.code === "cron" ? "/maintenance?tab=backups" : "/settings/whatsapp")}>
            {p.code === "backup" || p.code === "cron" ? (isAr ? "النسخ الاحتياطي" : "Backups") : isAr ? "إعدادات الواتساب" : "WhatsApp settings"}
          </button>
        </div>
      ))}

      <section className="px-welcome px-home" style={v({ "--i": 0 })}>
        <Guilloche />
        <Medal>{pct}%</Medal>
        <div className="tx">
          <span className="rx-eyebrow">{dateLine}</span>
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
          {hasPermission("employees.create") && (
            <button type="button" className="wb" onClick={() => navigate("/employees?new=true")}>
              <Plus /> {isAr ? "إضافة موظف" : "Add employee"}
            </button>
          )}
          <button type="button" className="wb gold" onClick={() => navigate("/notifications")}>
            <Bell /> {isAr ? "راجع الوثائق" : "Review documents"}
          </button>
        </div>
      </section>

      <div className="rk-stats">
        <RoyalStat i={1} label={isAr ? "إجمالي الموظفين" : "Employees"} value={summary?.totalEmployees ?? 0} icon={Users} color="#29a8d6"
          chip={{ text: isAr ? `${summary?.activeEmployees ?? 0} على رأس العمل` : `${summary?.activeEmployees ?? 0} on duty`, tone: "up" }}
          bar={summary?.totalEmployees ? ((summary?.activeEmployees ?? 0) / summary.totalEmployees) * 100 : 0} onClick={() => navigate("/employees")} />
        <RoyalStat i={2} label={isAr ? "وثائق منتهية" : "Expired documents"} value={expired} icon={FileWarning} color="#ef6b5b"
          chip={expired ? { text: isAr ? "تحتاج تجديد" : "Renew", tone: "dn" } : { text: isAr ? "لا شيء" : "None", tone: "up" }} sub={isAr ? `من ${tracked} وثيقة` : `of ${tracked}`}
          bar={tracked ? (expired / tracked) * 100 : 0} onClick={() => navigate("/reports?tab=documents&status=EXPIRED&scope=all")} />
        <RoyalStat i={3} label={isAr ? "تنتهي خلال 30 يوم" : "Ending within 30 days"} value={soon} icon={Clock} color="#e39a14"
          chip={nearest ? { text: leftText(nearest.days), tone: "warn" } : { text: isAr ? "لا شيء قريب" : "Nothing soon", tone: "up" }}
          bar={tracked ? (soon / tracked) * 100 : 0} onClick={() => navigate("/reports?tab=documents&status=EXPIRING_SOON&scope=all")} />
        <RoyalStat i={4} label={isAr ? "مدفوعات الشهر" : "This month’s payments"} value={Math.round(thisMonth)} unit={isAr ? "ر.س" : "SAR"} icon={WalletCards} color="#3fbf7f"
          chip={change === null ? undefined : { text: `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}%`, tone: change >= 0 ? "up" : "dn" }}
          sub={change === null ? (isAr ? "هذا الشهر" : "This month") : isAr ? "عن الشهر الماضي" : "vs last month"}
          bar={(thisMonth / maxMonth) * 100} onClick={() => navigate("/payments")} />
      </div>

      <div className="px-g2">
        <RoyalCard i={5} title={isAr ? "مواعيد الانتهاء القادمة" : "Upcoming expiries"} sub={isAr ? "الوثائق اللي هتنتهي في كل شهر من الشهور الجاية" : "Documents ending in each of the coming months"} total={{ label: isAr ? "الإجمالي" : "TOTAL", value: upcoming.reduce((a, m) => a + m.count, 0) }}>
          {upcoming.length ? (
            <RoyalArea labels={upLabels} values={upcoming.map((m) => m.count)} rtl={isAr} />
          ) : (
            <div className="px-empty">{isAr ? "لا شيء ينتهي في الشهور الجاية" : "Nothing ends in the coming months"}</div>
          )}
        </RoyalCard>
        <RoyalCard i={6} rosette={false} title={isAr ? "حالة الوثائق" : "Documents by status"} sub={isAr ? `${tracked} وثيقة` : `${tracked} documents`}>
          <PxDonut
            center={tracked}
            centerLabel={isAr ? "وثيقة" : "documents"}
            parts={[
              { label: isAr ? "سارية" : "Valid", value: valid, color: "var(--l-green)" },
              { label: isAr ? "قريبة الانتهاء" : "Ending soon", value: summary?.expiringDocuments ?? soon, color: "var(--l-amber)" },
              { label: isAr ? "منتهية" : "Expired", value: summary?.expiredDocuments ?? expired, color: "var(--l-rose)" },
            ]}
          />
        </RoyalCard>
      </div>

      <div className="px-g2">
        <RoyalCard i={7} title={isAr ? "الوثائق حسب النوع" : "Documents by kind"} sub={isAr ? "كل الوثائق المتتبَّعة" : "Every tracked document"} total={{ label: isAr ? "الإجمالي" : "TOTAL", value: tracked }}>
          {kinds.length === 0 ? <div className="px-empty">{isAr ? "لا توجد وثائق متتبَّعة بعد" : "No tracked documents yet"}</div> : <KindLedger rows={kinds} />}
        </RoyalCard>
        <RoyalCard i={8} title={isAr ? "آخر النشاطات" : "Latest activity"} sub={isAr ? "اللي حصل في النظام مؤخرًا" : "What happened lately"}
          actions={hasPermission("auditLogs.view") ? <button type="button" className="rk-act" onClick={() => navigate("/audit-logs")}>{isAr ? "سجل النشاط" : "Activity log"}</button> : undefined}>
          {activity.length === 0 ? (
            <div className="px-empty">{isAr ? "لا يوجد نشاط بعد" : "No activity yet"}</div>
          ) : (
            <ActivityTimeline
              events={activity.map((a) => ({
                id: a.id,
                title: a.description?.trim() || `${t(`auditLogs.actions.${a.action}`, { defaultValue: a.action })} · ${t(`moduleNames.${a.module}`, { defaultValue: a.module })}`,
                tag: t(`auditLogs.actions.${a.action}`, { defaultValue: a.action }),
                who: a.user?.fullName ?? (isAr ? "النظام" : "System"),
                when: ago(a.createdAt),
                color: ACTION_COLOR[a.action] ?? "#d6b678",
                icon: MODULE_ICON[a.module] ?? Activity,
              }))}
            />
          )}
        </RoyalCard>
      </div>

      <RoyalCard i={9} rosette={false} title={isAr ? "تحتاج متابعة" : "Needs follow-up"} sub={isAr ? "الأقرب للانتهاء أولًا" : "Soonest first"}
        actions={<button type="button" className="rk-act" onClick={() => navigate("/notifications")}>{isAr ? "عرض الكل" : "View all"}</button>}>
        {overview && attention.length === 0 ? (
          <div className="px-empty">{isAr ? "كل الوثائق سارية، لا شيء ينتهي قريبًا" : "Every document is valid; nothing ends soon"}</div>
        ) : (
          <FollowLedger
            isAr={isAr}
            rows={attention.map((item) => ({
              key: item.key,
              doc: isAr ? item.documentAr : item.documentEn,
              who: [(isAr ? item.nameAr : item.nameEn || item.nameAr).trim(), (isAr ? item.branchName : item.branchNameEn ?? item.branchName) ?? ""].filter(Boolean).join(" · "),
              date: dmy(item.days),
              days: item.days,
              icon: SOURCE_ICON[item.sourceType] ?? FileText,
              onOpen: () => openItem(item),
            }))}
          />
        )}
      </RoyalCard>

      <div className={canTasks ? "px-g2" : "px"}>
        <RoyalCard i={9}  title={isAr ? "المدفوعات الشهرية" : "Monthly payments"} sub={isAr ? "آخر 6 أشهر" : "Last 6 months"} total={{ label: isAr ? "الإجمالي" : "TOTAL", value: sixTotal, unit: isAr ? "ر.س" : "SAR" }}>
          {sixTotal === 0 ? <div className="px-empty">{isAr ? "لا توجد مدفوعات في آخر 6 أشهر" : "No payments in the last 6 months"}</div> : <PxBars labels={months.map((m) => m.label)} values={monthly} colors={months.map((m) => monthColor(m.key))} unit={isAr ? "ر.س" : "SAR"} />}
        </RoyalCard>
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
        <div className="rk-stats">
          <RoyalStat i={11} label={isAr ? "مخالفات مفتوحة" : "Open violations"} value={vio.open} icon={TriangleAlert} color="#ef6b5b" sub={formatCurrency(vio.unpaidAmount)} bar={vio.authorityTotal + vio.staffTotal ? (vio.open / (vio.authorityTotal + vio.staffTotal)) * 100 : 0} onClick={() => navigate("/violations")} />
          <RoyalStat i={12} label={isAr ? "متأخرة السداد" : "Overdue"} value={vio.overdue} icon={Clock} color="#e5484d" bar={vio.open ? (vio.overdue / vio.open) * 100 : 0} onClick={() => navigate("/violations")} />
          <RoyalStat i={13} label={isAr ? "ميعادها خلال أسبوعين" : "Due in 2 weeks"} value={vio.dueSoon} icon={Clock} color="#e39a14" bar={vio.open ? (vio.dueSoon / vio.open) * 100 : 0} onClick={() => navigate("/violations")} />
          <RoyalStat i={14} label={isAr ? "جزاءات قائمة" : "Open penalties"} value={vio.staffOpen} icon={FileText} color="#a86de0" bar={vio.staffTotal ? (vio.staffOpen / vio.staffTotal) * 100 : 0} onClick={() => navigate("/violations")} />
        </div>
      )}
    </div>
  );
}
