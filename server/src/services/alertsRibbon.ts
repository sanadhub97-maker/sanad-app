import { z } from "zod";
import { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canViewSource, hasPermission } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import { getTrackableItems } from "@/services/expiringItems";
import { computeStatus, daysUntil } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import { riyadhDay } from "@/services/whatsappDigest";

/* The alerts ribbon in the top bar: how it looks and what it carries is set once for the
   whole organisation in Settings → Alerts ribbon (stored as one row in `Setting`); what it
   carries is worked out here per user, from what that user's permissions let them see. */

const KEY = "alertsRibbon";
const DAY = 86_400_000;

export const RIBBON_CATS = ["expired", "soon", "tasks", "violations", "tax"] as const;
export type RibbonCat = (typeof RIBBON_CATS)[number];

export const alertsRibbonSchema = z.object({
  enabled: z.boolean(),
  /** Seconds for one full pass: smaller is faster. */
  speed: z.number().int().min(15).max(180),
  direction: z.enum(["rtl", "ltr"]),
  skin: z.enum(["black", "ivory", "emerald"]),
  height: z.enum(["compact", "regular", "large"]),
  fontSize: z.number().int().min(11).max(17),
  chips: z.enum(["pill", "plain"]),
  categories: z.object({ expired: z.boolean(), soon: z.boolean(), tasks: z.boolean(), violations: z.boolean(), tax: z.boolean() }),
  maxItems: z.number().int().min(3).max(20),
  pauseOnHover: z.boolean(),
  showCount: z.boolean(),
  showDue: z.boolean(),
  showAllClear: z.boolean(),
});
export type AlertsRibbonSettings = z.infer<typeof alertsRibbonSchema>;

export const DEFAULT_ALERTS_RIBBON: AlertsRibbonSettings = {
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

/** The saved settings; anything missing or no longer valid falls back to the default one by one. */
export async function getAlertsRibbon(): Promise<AlertsRibbonSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const saved = (row?.value ?? {}) as Partial<AlertsRibbonSettings>;
  const merged = { ...DEFAULT_ALERTS_RIBBON, ...saved, categories: { ...DEFAULT_ALERTS_RIBBON.categories, ...(saved.categories ?? {}) } };
  const parsed = alertsRibbonSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_ALERTS_RIBBON;
}

export async function saveAlertsRibbon(value: AlertsRibbonSettings): Promise<AlertsRibbonSettings> {
  await prisma.setting.upsert({ where: { key: KEY }, update: { value: value as never }, create: { key: KEY, value: value as never } });
  return value;
}

export interface RibbonItem {
  key: string;
  cat: RibbonCat;
  title: string;
  /** The calendar day it is about (YYYY-MM-DD), and how many days from today: negative when already past. */
  date: string;
  days: number;
  /** A task's time of day, "HH:mm". */
  time?: string | null;
  href: string;
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** What the ribbon carries for this user right now, most pressing first, as the settings allow. */
export async function ribbonItems(auth: AuthContext, s: AlertsRibbonSettings): Promise<RibbonItem[]> {
  const today = new Date(`${riyadhDay()}T00:00:00Z`);
  const on = s.categories;
  const out: RibbonItem[] = [];

  if (on.expired || on.soon) {
    const [items, rules] = await Promise.all([getTrackableItems(), getExpirationRules()]);
    for (const i of items) {
      if (!canViewSource(auth, i.sourceType)) continue;
      const status = computeStatus(i.expiryDate, rules);
      const cat: RibbonCat | null = status === DocumentStatus.EXPIRED ? (on.expired ? "expired" : null) : status === DocumentStatus.EXPIRING_SOON ? (on.soon ? "soon" : null) : null;
      if (!cat) continue;
      out.push({
        key: `${i.key}:${i.expiryDate.toISOString()}`,
        cat,
        title: i.sourceType === "VEHICLE" ? `${i.kindAr} — ${i.labelAr}` : i.labelAr,
        date: dayOf(i.expiryDate),
        days: daysUntil(i.expiryDate),
        href: i.sourceType === "VEHICLE" ? `/vehicles?focus=${i.recordId}` : i.sourceType === "COMPANY_DOCUMENT" ? `/company-documents/${i.recordId}` : i.sourceType === "EMPLOYEE_DOCUMENT" ? `/employee-documents/${i.employeeId}/${i.recordId}` : `/employees/${i.employeeId}`,
      });
    }
  }

  if (on.tasks && hasPermission(auth, "tasks.view")) {
    const rows = await prisma.dailyTask.findMany({
      where: { deletedAt: null, done: false, date: { lte: today } },
      select: { id: true, title: true, date: true, time: true },
      orderBy: [{ date: "asc" }, { time: { sort: "asc", nulls: "last" } }],
      take: 40,
    });
    for (const t of rows) out.push({ key: `task:${t.id}`, cat: "tasks", title: t.title.trim(), date: dayOf(t.date), days: Math.round((t.date.getTime() - today.getTime()) / DAY), time: t.time, href: `/daily-tasks?date=${dayOf(t.date)}` });
  }

  if (on.violations && hasPermission(auth, "violations.view")) {
    const week = new Date(today.getTime() + 7 * DAY);
    const rows = await prisma.violation.findMany({
      where: {
        deletedAt: null,
        kind: "AUTHORITY",
        OR: [
          { status: { in: ["NEW", "REJECTED"] }, payDeadline: { lte: week } },
          { status: "NEW", objectionDeadline: { gte: today, lte: week } },
        ],
      },
      select: { id: true, number: true, reason: true, payDeadline: true, objectionDeadline: true },
      take: 40,
    });
    for (const v of rows) {
      const due = v.payDeadline ?? v.objectionDeadline;
      if (!due) continue;
      out.push({ key: `violation:${v.id}`, cat: "violations", title: `${v.number ? `${v.number} — ` : ""}${v.reason}`.slice(0, 90), date: dayOf(due), days: Math.round((due.getTime() - today.getTime()) / DAY), href: `/violations/${v.id}` });
    }
  }

  if (on.tax && hasPermission(auth, "taxReturns.view")) {
    const soon = new Date(today.getTime() + 30 * DAY);
    const rows = await prisma.taxReturn.findMany({
      where: { deletedAt: null, status: { not: "PAID" }, dueDate: { lte: soon } },
      select: { id: true, kind: true, year: true, quarter: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    });
    for (const r of rows) {
      const name = r.kind === "VAT" ? "إقرار ضريبة القيمة المضافة" : "إقرار الزكاة";
      out.push({ key: `tax:${r.id}`, cat: "tax", title: `${name} ${r.year}${r.quarter ? ` — الربع ${r.quarter}` : ""}`, date: dayOf(r.dueDate), days: Math.round((r.dueDate.getTime() - today.getTime()) / DAY), href: "/tax-declarations" });
    }
  }

  // Past due first, then the nearest date; the kinds keep a steady order when the dates tie.
  const rank: Record<RibbonCat, number> = { expired: 0, violations: 1, tasks: 2, tax: 3, soon: 4 };
  out.sort((a, b) => Number(b.days < 0) - Number(a.days < 0) || a.days - b.days || rank[a.cat] - rank[b.cat]);
  return out.slice(0, s.maxItems);
}
