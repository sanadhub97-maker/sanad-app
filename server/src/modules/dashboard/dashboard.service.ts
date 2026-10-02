import type { AuthContext } from "@/types/express";
import { canViewSource, hasPermission, notificationVisibility } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { getExpirationRules } from "@/services/settingsStore";
import { getTrackableItems, bucketByStatus, bucketByWindow, type TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { singleFlight } from "@/lib/singleFlight";

// Summary, charts, attention and expiration widgets ask for the same records.
// Share their overlapping database reads, then apply each caller's permissions.
const readDashboardItems = singleFlight(getTrackableItems);

export async function getSummary(auth: AuthContext) {
  const [rules, records] = await Promise.all([getExpirationRules(), readDashboardItems()]);
  const items = records.filter((item) => canViewSource(auth, item.sourceType));
  const statusBuckets = bucketByStatus(items, rules);
  // The same counts split by owner, for the sidebar's two document sections.
  const companyBuckets = bucketByStatus(items.filter((i) => i.sourceType === "COMPANY_DOCUMENT"), rules);
  const employeeBuckets = bucketByStatus(items.filter((i) => i.sourceType !== "COMPANY_DOCUMENT"), rules);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalEmployees, activeEmployees, totalCompanyDocuments, totalPayments, monthlyPayments] = await Promise.all([
    hasPermission(auth, "employees.view") ? prisma.employee.count({ where: { deletedAt: null } }) : Promise.resolve(0),
    hasPermission(auth, "employees.view") ? prisma.employee.count({ where: { deletedAt: null, employmentStatus: "ACTIVE" } }) : Promise.resolve(0),
    hasPermission(auth, "companyDocuments.view") ? prisma.companyDocument.count({ where: { deletedAt: null } }) : Promise.resolve(0),
    hasPermission(auth, "payments.view") ? prisma.payment.aggregate({ where: { deletedAt: null }, _sum: { total: true } }) : Promise.resolve({ _sum: { total: null } }),
    hasPermission(auth, "payments.view") ? prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfMonth } }, _sum: { total: true } }) : Promise.resolve({ _sum: { total: null } }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    totalCompanyDocuments,
    totalTrackedDocuments: items.length,
    validDocuments: statusBuckets.VALID,
    expiringDocuments: statusBuckets.EXPIRING_SOON,
    expiredDocuments: statusBuckets.EXPIRED,
    employeeDocuments: { expired: employeeBuckets.EXPIRED, expiring: employeeBuckets.EXPIRING_SOON },
    companyDocuments: { expired: companyBuckets.EXPIRED, expiring: companyBuckets.EXPIRING_SOON },
    totalPaymentsAmount: totalPayments._sum.total ?? 0,
    monthlyPaymentsAmount: monthlyPayments._sum.total ?? 0,
  };
}

export async function getExpirationWidget(auth: AuthContext) {
  const items = (await readDashboardItems()).filter((item) => canViewSource(auth, item.sourceType));
  return bucketByWindow(items);
}

export async function getCharts(auth: AuthContext) {
  const [rules, records] = await Promise.all([getExpirationRules(), readDashboardItems()]);
  const items = records.filter((item) => canViewSource(auth, item.sourceType));

  const [employeesByStatus, employeesByDepartment, paymentsByCategory, paymentsByBranch, monthlyPaymentsRaw, monthlyByCategoryRaw] = await Promise.all([
    hasPermission(auth, "employees.view") ? prisma.employee.groupBy({ by: ["employmentStatus"], where: { deletedAt: null }, _count: { _all: true } }) : Promise.resolve([]),
    hasPermission(auth, "employees.view") ? prisma.employee.groupBy({ by: ["department"], where: { deletedAt: null }, _count: { _all: true } }) : Promise.resolve([]),
    hasPermission(auth, "payments.view") ? prisma.payment.groupBy({ by: ["category"], where: { deletedAt: null }, _sum: { total: true } }) : Promise.resolve([]),
    hasPermission(auth, "payments.view") ? prisma.payment.groupBy({ by: ["branchId"], where: { deletedAt: null }, _sum: { total: true } }) : Promise.resolve([]),
    hasPermission(auth, "payments.view") ? prisma.$queryRaw<{ month: Date; total: string }[]>`
      SELECT date_trunc('month', "paymentDate") AS month, SUM(total) AS total
      FROM "Payment"
      WHERE "deletedAt" IS NULL AND "paymentDate" >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1
    ` : Promise.resolve([]),
    // The last six months (this one included), split by category.
    hasPermission(auth, "payments.view") ? prisma.$queryRaw<{ month: Date; category: string; total: string }[]>`
      SELECT date_trunc('month', "paymentDate") AS month, category::text AS category, SUM(total) AS total
      FROM "Payment"
      WHERE "deletedAt" IS NULL AND "paymentDate" >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY 1, 2 ORDER BY 1
    ` : Promise.resolve([]),
  ]);

  const branches = hasPermission(auth, "branches.view") ? await prisma.branch.findMany({ select: { id: true, name: true, nameEn: true } }) : [];
  const branchById = new Map(branches.map((b) => [b.id, b]));

  return {
    employeesByStatus: employeesByStatus.map((r) => ({ status: r.employmentStatus, count: r._count._all })),
    employeesByDepartment: employeesByDepartment.map((r) => ({ department: r.department ?? "Unassigned", count: r._count._all })),
    documentsByStatus: bucketByStatusChart(items, rules),
    paymentsByCategory: paymentsByCategory.map((r) => ({ category: r.category, total: Number(r._sum.total ?? 0) })),
    paymentsByBranch: paymentsByBranch.map((r) => ({
      branch: r.branchId ? branchById.get(r.branchId)?.name ?? "Unknown" : "Unassigned",
      branchEn: r.branchId ? branchById.get(r.branchId)?.nameEn || branchById.get(r.branchId)?.name || "Unknown" : "Unassigned",
      total: Number(r._sum.total ?? 0),
    })),
    monthlyPayments: monthlyPaymentsRaw.map((r) => ({ month: r.month, total: Number(r.total) })),
    monthlyByCategory: monthlyByCategoryRaw.map((r) => ({ month: r.month, category: r.category, total: Number(r.total) })),
  };
}

function bucketByStatusChart(items: Awaited<ReturnType<typeof getTrackableItems>>, rules: Parameters<typeof bucketByStatus>[1]) {
  const buckets = bucketByStatus(items, rules);
  return [
    { status: "VALID", count: buckets.VALID },
    { status: "EXPIRING_SOON", count: buckets.EXPIRING_SOON },
    { status: "EXPIRED", count: buckets.EXPIRED },
  ];
}

export async function getRecentActivity(auth: AuthContext) {
  const [recentEmployees, recentPayments, recentNotifications, recentActivities] = await Promise.all([
    hasPermission(auth, "employees.view") ? prisma.employee.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }) : Promise.resolve([]),
    hasPermission(auth, "payments.view") ? prisma.payment.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }) : Promise.resolve([]),
    prisma.notification.findMany({ where: { userId: auth.userId, ...notificationVisibility(auth) }, orderBy: { createdAt: "desc" }, take: 5 }),
    hasPermission(auth, "auditLogs.view") ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { fullName: true } } } }) : Promise.resolve([]),
  ]);

  return { recentEmployees, recentPayments, recentNotifications, recentActivities };
}

/** Groups for the dashboard's "by type" card. */
function typeGroup(item: TrackableItem): string {
  if (item.sourceType === "EMPLOYEE_IQAMA") return "IQAMA";
  if (item.sourceType === "EMPLOYEE_PASSPORT") return "PASSPORT";
  if (item.sourceType === "COMPANY_DOCUMENT") return "COMPANY";
  if (item.docType === "HEALTH_CERTIFICATE") return "HEALTH_CERTIFICATE";
  if (item.docType === "MEDICAL_INSURANCE") return "MEDICAL_INSURANCE";
  return "OTHER";
}

/** The dashboard's overview cards: what needs attention (expired or ending
 * within 30 days, soonest first), expiries in each of the next six months,
 * documents by type, and the branches summary. */
export async function getOverview(auth: AuthContext) {
  const items = (await readDashboardItems()).filter((item) => hasPermission(auth, item.sourceType === "COMPANY_DOCUMENT" ? "companyDocuments.view" : "employees.view"));
  const withDays = items.map((item) => ({ item, days: daysUntil(item.expiryDate) }));

  const due = withDays.filter((x) => x.days <= 30).sort((a, b) => a.days - b.days);
  const top = due.slice(0, 5);
  const taken = new Set(
    (
      await prisma.dailyTask.findMany({
        where: { sourceKey: { in: top.map((x) => x.item.key) }, deletedAt: null },
        select: { sourceKey: true },
      })
    ).map((t) => t.sourceKey)
  );

  const now = new Date();
  const upcoming = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return {
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      count: items.filter((x) => x.expiryDate >= start && x.expiryDate < end).length,
    };
  });

  const byType: Record<string, number> = {};
  for (const item of items) byType[typeGroup(item)] = (byType[typeGroup(item)] ?? 0) + 1;

  const branches = hasPermission(auth, "branches.view") ? await prisma.branch.findMany({ where: { deletedAt: null }, select: { status: true, city: true } }) : [];

  // Expiries per day around today, for the dashboard's week strip.
  const expiriesByDate: Record<string, number> = {};
  for (const { item, days } of withDays) {
    if (days < -7 || days > 14) continue;
    const key = item.expiryDate.toISOString().slice(0, 10);
    expiriesByDate[key] = (expiriesByDate[key] ?? 0) + 1;
  }

  return {
    expiriesByDate,
    expired: withDays.filter((x) => x.days < 0).length,
    endingIn30: withDays.filter((x) => x.days >= 0 && x.days <= 30).length,
    attention: top.map(({ item, days }) => ({
      key: item.key,
      sourceType: item.sourceType,
      recordId: item.recordId,
      employeeId: item.employeeId ?? null,
      nameAr: item.employeeNameAr ?? item.labelAr,
      nameEn: item.employeeName ?? item.label,
      // A company document's own name is the establishment's; its kind says what it is.
      documentAr: item.sourceType === "COMPANY_DOCUMENT" ? item.kindAr : (item.documentAr ?? item.labelAr),
      documentEn: item.sourceType === "COMPANY_DOCUMENT" ? item.kindEn : (item.documentEn ?? item.label),
      documentNumber: item.documentNumber ?? null,
      branchName: item.branchName ?? null,
      branchNameEn: item.branchNameEn || item.branchName || null,
      days,
      taskAdded: taken.has(item.key),
    })),
    attentionTotal: due.length,
    upcoming,
    byType,
    branches: {
      total: branches.length,
      active: branches.filter((b) => b.status === "ACTIVE").length,
      cities: new Set(branches.map((b) => b.city?.trim()).filter(Boolean)).size,
    },
  };
}
