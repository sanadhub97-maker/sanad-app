import { prisma } from "@/lib/prisma";
import { getExpirationRules } from "@/services/settingsStore";
import { getTrackableItems, bucketByStatus, bucketByWindow, type TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";

export async function getSummary() {
  const rules = await getExpirationRules();
  const items = await getTrackableItems();
  const statusBuckets = bucketByStatus(items, rules);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalEmployees, activeEmployees, totalCompanyDocuments, totalPayments, monthlyPayments] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null, employmentStatus: "ACTIVE" } }),
    prisma.companyDocument.count({ where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { deletedAt: null }, _sum: { total: true } }),
    prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfMonth } }, _sum: { total: true } }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    totalCompanyDocuments,
    totalTrackedDocuments: items.length,
    validDocuments: statusBuckets.VALID,
    expiringDocuments: statusBuckets.EXPIRING_SOON,
    expiredDocuments: statusBuckets.EXPIRED,
    totalPaymentsAmount: totalPayments._sum.total ?? 0,
    monthlyPaymentsAmount: monthlyPayments._sum.total ?? 0,
  };
}

export async function getExpirationWidget() {
  const items = await getTrackableItems();
  return bucketByWindow(items);
}

export async function getCharts() {
  const rules = await getExpirationRules();
  const items = await getTrackableItems();

  const [employeesByStatus, employeesByDepartment, paymentsByCategory, paymentsByBranch, monthlyPaymentsRaw, monthlyByCategoryRaw] = await Promise.all([
    prisma.employee.groupBy({ by: ["employmentStatus"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["department"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["category"], where: { deletedAt: null }, _sum: { total: true } }),
    prisma.payment.groupBy({ by: ["branchId"], where: { deletedAt: null }, _sum: { total: true } }),
    prisma.$queryRaw<{ month: Date; total: string }[]>`
      SELECT date_trunc('month', "paymentDate") AS month, SUM(total) AS total
      FROM "Payment"
      WHERE "deletedAt" IS NULL AND "paymentDate" >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1
    `,
    // The last six months (this one included), split by category.
    prisma.$queryRaw<{ month: Date; category: string; total: string }[]>`
      SELECT date_trunc('month', "paymentDate") AS month, category::text AS category, SUM(total) AS total
      FROM "Payment"
      WHERE "deletedAt" IS NULL AND "paymentDate" >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY 1, 2 ORDER BY 1
    `,
  ]);

  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

  return {
    employeesByStatus: employeesByStatus.map((r) => ({ status: r.employmentStatus, count: r._count._all })),
    employeesByDepartment: employeesByDepartment.map((r) => ({ department: r.department ?? "Unassigned", count: r._count._all })),
    documentsByStatus: bucketByStatusChart(items, rules),
    paymentsByCategory: paymentsByCategory.map((r) => ({ category: r.category, total: Number(r._sum.total ?? 0) })),
    paymentsByBranch: paymentsByBranch.map((r) => ({
      branch: r.branchId ? branchNameById.get(r.branchId) ?? "Unknown" : "Unassigned",
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

export async function getRecentActivity(userId: string) {
  const [recentEmployees, recentPayments, recentNotifications, recentActivities] = await Promise.all([
    prisma.employee.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.payment.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { fullName: true } } } }),
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
export async function getOverview() {
  const items = await getTrackableItems();
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

  const branches = await prisma.branch.findMany({ where: { deletedAt: null }, select: { status: true, city: true } });

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
      documentAr: item.documentAr ?? item.labelAr,
      documentEn: item.documentEn ?? item.label,
      documentNumber: item.documentNumber ?? null,
      branchName: item.branchName ?? null,
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
