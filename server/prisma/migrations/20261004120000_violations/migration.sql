-- Violations: government authority fines on an establishment and staff penalties.
CREATE TYPE "ViolationKind" AS ENUM ('AUTHORITY', 'STAFF');
CREATE TYPE "ViolationStatus" AS ENUM ('NEW', 'OBJECTION', 'ACCEPTED', 'REJECTED', 'PAID', 'OPEN', 'APPLIED');

CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "kind" "ViolationKind" NOT NULL,
    "authority" TEXT,
    "authorityName" TEXT,
    "number" TEXT,
    "date" DATE NOT NULL,
    "branchId" TEXT,
    "employeeId" TEXT,
    "reason" TEXT NOT NULL,
    "penalty" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payDeadline" DATE,
    "objectionDeadline" DATE,
    "status" "ViolationStatus" NOT NULL,
    "paymentId" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "relatedLabel" TEXT,
    "fileId" TEXT,
    "assigneeId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ViolationEvent" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViolationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Violation_paymentId_key" ON "Violation"("paymentId");
CREATE INDEX "Violation_kind_status_idx" ON "Violation"("kind", "status");
CREATE INDEX "Violation_branchId_idx" ON "Violation"("branchId");
CREATE INDEX "Violation_employeeId_idx" ON "Violation"("employeeId");
CREATE INDEX "Violation_payDeadline_idx" ON "Violation"("payDeadline");
CREATE INDEX "ViolationEvent_violationId_idx" ON "ViolationEvent"("violationId");

ALTER TABLE "Violation" ADD CONSTRAINT "Violation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ViolationEvent" ADD CONSTRAINT "ViolationEvent_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViolationEvent" ADD CONSTRAINT "ViolationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permissions for the new page.
INSERT INTO "Permission" ("id", "key", "module", "description")
SELECT gen_random_uuid()::text, k, 'violations', NULL
FROM unnest(ARRAY['violations.view', 'violations.create', 'violations.edit', 'violations.delete', 'violations.pay', 'violations.export']) AS k
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."module" = 'violations'
WHERE r."name" IN ('Super Admin', 'Admin')
   OR (r."name" = 'HR' AND p."key" IN ('violations.view', 'violations.create', 'violations.edit', 'violations.export'))
   OR (r."name" = 'Manager' AND p."key" IN ('violations.view', 'violations.export'))
   OR (r."name" = 'Accountant' AND p."key" IN ('violations.view', 'violations.pay', 'violations.export'))
ON CONFLICT DO NOTHING;
