import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Globe, LayoutGrid, List, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { LuPager } from "@/components/lulu/lulu-ui";
import { DayHeader, Initials, Kpis, dayKey, dayOf, dmy, groupByDay, weekday } from "@/components/royal/rp";
import { ACTION_LOOK, actionLook, timeOf } from "@/components/royal/cards";
import { auditLogsApi } from "@/api/auditLogs";
import type { AuditLogItem } from "@/types/models";

/* The audit log in the Royal design, as in the approved preview: the day's
   figures, filters by action and section, then a timeline per day — who did
   what and when — beside the last two weeks' activity, the most active users
   and the busiest sections. */

const AUDIT_MODULES = ["employees", "employeeDocuments", "companyDocuments", "licenses", "branches", "payments", "notifications", "reports", "files", "importExport", "users", "roles", "settings", "auditLogs", "auth"] as const;
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT", "LOGIN"] as const;

/** The page a record opens in, when it has one. */
function recordPath(e: AuditLogItem) {
  if (!e.recordId || e.action === "DELETE") return null;
  if (e.module === "employees") return `/employees/${e.recordId}`;
  if (e.module === "companyDocuments" || e.module === "licenses") return `/company-documents/${e.recordId}`;
  if (e.module === "branches") return `/branches/${e.recordId}`;
  return null;
}

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const pageSize = 40;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", { page, module, action }],
    queryFn: () => auditLogsApi.list({ page, pageSize, module: module || undefined, action: action || undefined }),
  });
  const today = dayOf(new Date());
  const since = new Date(today);
  since.setDate(since.getDate() - 13);
  const { data: recent } = useQuery({ queryKey: ["audit-logs", "recent", dayKey(today)], queryFn: () => auditLogsApi.list({ page: 1, pageSize: 200, dateFrom: since.toISOString() }), staleTime: 60_000 });
  const count = (a: string) => ({ queryKey: ["audit-logs", "count", a], queryFn: () => auditLogsApi.list({ page: 1, pageSize: 1, action: a }), staleTime: 60_000 });
  const { data: nCreate } = useQuery(count("CREATE"));
  const { data: nUpdate } = useQuery(count("UPDATE"));
  const { data: nDelete } = useQuery(count("DELETE"));

  const rows = data?.data ?? [];
  const days = groupByDay(rows, (e) => e.createdAt);
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));
  const recentRows = recent?.data ?? [];
  const heatDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    return d;
  });
  // One count per day: the total of that day's actions, not a sample.
  const heatCounts = useQueries({
    queries: heatDays.map((d) => {
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      end.setMilliseconds(-1);
      return { queryKey: ["audit-logs", "day-count", dayKey(d)], queryFn: () => auditLogsApi.list({ page: 1, pageSize: 1, dateFrom: d.toISOString(), dateTo: end.toISOString() }), staleTime: 60_000 };
    }),
  });
  const heat = heatDays.map((d, i) => ({ d, n: heatCounts[i].data?.meta.total ?? 0 }));
  const heatMax = Math.max(1, ...heat.map((h) => h.n));
  const tally = (key: (e: AuditLogItem) => string) => {
    const m = new Map<string, number>();
    recentRows.forEach((e) => m.set(key(e), (m.get(key(e)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const users = tally((e) => e.user?.fullName ?? t("auditLogs.systemUser"));
  const sections = tally((e) => e.module);
  const sampleNote = isAr ? `من آخر ${recentRows.length} عملية` : `From the last ${recentRows.length} actions`;
  const moduleName = (m: string) => t(`moduleNames.${m}`, { defaultValue: m });
  const wd = (d: Date) => d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "short" });

  return (
    <div className="rp rc">
      <PageHeader title={t("auditLogs.title")} description={isAr ? "كل عملية في النظام: مين عملها، وإمتى، وعلى أي سجل" : "Every action in the system: who did it, when, and on which record"} />

      <Kpis
        items={[
          { label: isAr ? "عمليات اليوم" : "Actions today", value: heatCounts[13]?.data?.meta.total ?? "—", sub: `${weekday(today)} ${dmy(today)}`, hero: true },
          { label: isAr ? "إضافة" : "Created", value: nCreate?.meta.total ?? "—", sub: isAr ? "سجلات جديدة" : "New records", tone: "ok", onClick: () => (setAction(action === "CREATE" ? "" : "CREATE"), setPage(1)), active: action === "CREATE" },
          { label: isAr ? "تعديل" : "Updated", value: nUpdate?.meta.total ?? "—", sub: isAr ? "تغييرات على السجلات" : "Changes to records", tone: "pri", onClick: () => (setAction(action === "UPDATE" ? "" : "UPDATE"), setPage(1)), active: action === "UPDATE" },
          { label: isAr ? "حذف" : "Deleted", value: nDelete?.meta.total ?? "—", sub: isAr ? "سجلات محذوفة" : "Removed records", tone: "bad", onClick: () => (setAction(action === "DELETE" ? "" : "DELETE"), setPage(1)), active: action === "DELETE" },
        ]}
      />

      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 2 }}>
        <button type="button" className="rp-chip rp-pri" aria-pressed={!action} onClick={() => (setAction(""), setPage(1))}>
          <i />
          {isAr ? "كل العمليات" : "All actions"}
        </button>
        {ACTIONS.map((a) => {
          const look = ACTION_LOOK[a];
          return (
            <button key={a} type="button" className="rp-chip" aria-pressed={action === a} onClick={() => (setAction(a), setPage(1))} style={{ ["--c" as string]: look.c, ["--t" as string]: `color-mix(in srgb, ${look.c} 12%, var(--surf))` }}>
              <i />
              {isAr ? look.ar : look.en}
            </button>
          );
        })}
        <span className="sp" />
        <Select
          value={module || "all"}
          onValueChange={(v) => {
            setModule(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-[38px] w-56 shrink-0 rounded-[11px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
            <SelectValue placeholder={t("auditLogs.filterByModule")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("auditLogs.allModules")}</SelectItem>
            {AUDIT_MODULES.map((m) => (
              <SelectItem key={m} value={m}>
                {moduleName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rc-au">
        <div className="rc-au-col">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[220px] animate-pulse rounded-[20px] bg-[var(--l-surface)]" />)
          ) : !days.length ? (
            <div className="rp-card rp-empty">{t("common.noResults")}</div>
          ) : (
            days.map((g, di) => (
              <section key={dayKey(g.day)} className="rc-tl-day rp-rise" style={{ ["--i" as string]: di + 3 }}>
                <DayHeader
                  day={g.day}
                  right={
                    <>
                      <b>{g.items.length}</b>
                      {isAr ? "عملية" : "actions"}
                    </>
                  }
                />
                <div className="rc-tl">
                  {g.items.map((e) => {
                    const look = actionLook(e.action);
                    const path = recordPath(e);
                    const who = e.user?.fullName ?? t("auditLogs.systemUser");
                    return (
                      <div key={e.id} className="rc-ev">
                        <span className="dot" style={{ ["--c" as string]: look.c, ["--t" as string]: `color-mix(in srgb, ${look.c} 13%, var(--surf))` }}>
                          <look.icon />
                        </span>
                        <div className="rc-ev-card">
                          <div className="rc-ev-top">
                            <span className="rp-pill nodot" style={{ ["--c" as string]: look.c, ["--t" as string]: `color-mix(in srgb, ${look.c} 13%, var(--surf))` }}>
                              {t(`auditLogs.actions.${e.action}`, { defaultValue: isAr ? look.ar : look.en })}
                            </span>
                            <b>{moduleName(e.module)}</b>
                            <span className="time">{timeOf(e.createdAt)}</span>
                          </div>
                          {e.description && <p className="rc-ev-desc">{e.description}</p>}
                          <div className="rc-ev-foot">
                            <Initials name={who} />
                            <span>{who}</span>
                            <span>
                              <Clock />
                              {timeOf(e.createdAt)}
                            </span>
                            {e.ipAddress && (
                              <span className="rp-mono">
                                <Globe />
                                {e.ipAddress}
                              </span>
                            )}
                            {path && (
                              <Link to={path}>
                                <ExternalLink className="inline h-3 w-3" /> {isAr ? "فتح السجل" : "Open record"}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
          <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />
        </div>

        <aside className="rc-au-side">
          <div className="rp-card sc rp-rise" style={{ ["--i" as string]: 3 }}>
            <h2>
              <LayoutGrid />
              {isAr ? "نشاط آخر أسبوعين" : "The last two weeks"}
            </h2>
            <div className="rc-heat">
              {heat.map((h) => (
                <i key={dayKey(h.d)} style={{ ["--v" as string]: h.n ? 15 + Math.round((h.n / heatMax) * 85) : 0 }} title={`${weekday(h.d)} ${dmy(h.d)} · ${h.n}`} />
              ))}
            </div>
            <div className="rc-heat-l">
              {heat.slice(7).map((h) => (
                <span key={dayKey(h.d)}>{wd(h.d)}</span>
              ))}
            </div>
          </div>
          <div className="rp-card sc rp-rise" style={{ ["--i" as string]: 4 }}>
            <h2>
              <Users />
              {isAr ? "الأكثر نشاطًا" : "Most active"}
            </h2>
            <small className="rp-muted">{sampleNote}</small>
            <div className="rc-lb">
              {users.map(([u, n]) => (
                <div key={u}>
                  <Initials name={u} />
                  <span className="nm">{u}</span>
                  <b>{n}</b>
                  <span className="bar">
                    <i style={{ width: `${(n / users[0][1]) * 100}%` }} />
                  </span>
                </div>
              ))}
              {!users.length && <small className="rp-muted">{isAr ? "لا يوجد نشاط" : "No activity"}</small>}
            </div>
          </div>
          <div className="rp-card sc rp-rise" style={{ ["--i" as string]: 5 }}>
            <h2>
              <List />
              {isAr ? "حسب القسم" : "By section"}
            </h2>
            <small className="rp-muted">{sampleNote}</small>
            <div className="rc-lb">
              {sections.map(([m, n]) => (
                <button key={m} type="button" onClick={() => (setModule(m), setPage(1))}>
                    <span className="rc-kico" style={{ ["--kc" as string]: "var(--vio)" }}>
                      <List />
                    </span>
                    <span className="nm">{moduleName(m)}</span>
                    <b>{n}</b>
                    <span className="bar">
                      <i style={{ width: `${(n / sections[0][1]) * 100}%`, ["--c" as string]: "var(--vio)" }} />
                    </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
