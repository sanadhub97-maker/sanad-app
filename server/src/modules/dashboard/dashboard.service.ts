import { prisma } from "@/lib/prisma";
import { getExpirationRules } from "@/services/settingsStore";
import { getTrackableItems, bucketByStatus, bucketByWindow } from "@/services/expiringItems";

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

  const [employeesByStatus, employeesByDepartment, paymentsByCategory, paymentsByBranch, monthlyPaymentsRaw] = await Promise.all([
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
