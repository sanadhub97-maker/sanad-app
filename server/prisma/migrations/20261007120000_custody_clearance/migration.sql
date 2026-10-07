-- Custody handovers, their items and end-of-service clearances; each establishment's own logo.
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "logoFileId" TEXT;

-- CreateTable
CREATE TABLE "CustodyHandover" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "deliveredBy" TEXT,
    "notes" TEXT,
    "signedFileId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustodyHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyItem" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "serialNumber" TEXT,
    "condition" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "returnedAt" DATE,
    "returnCondition" TEXT,
    "clearanceId" TEXT,

    CONSTRAINT "CustodyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clearance" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lastWorkingDay" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "dues" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "departments" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "issuedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Clearance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustodyHandover_number_key" ON "CustodyHandover"("number");

-- CreateIndex
CREATE INDEX "CustodyHandover_employeeId_idx" ON "CustodyHandover"("employeeId");

-- CreateIndex
CREATE INDEX "CustodyHandover_date_idx" ON "CustodyHandover"("date");

-- CreateIndex
CREATE INDEX "CustodyItem_handoverId_idx" ON "CustodyItem"("handoverId");

-- CreateIndex
CREATE INDEX "CustodyItem_clearanceId_idx" ON "CustodyItem"("clearanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Clearance_number_key" ON "Clearance"("number");

-- CreateIndex
CREATE INDEX "Clearance_employeeId_idx" ON "Clearance"("employeeId");

-- CreateIndex
CREATE INDEX "Clearance_status_idx" ON "Clearance"("status");

-- AddForeignKey
ALTER TABLE "CustodyHandover" ADD CONSTRAINT "CustodyHandover_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyHandover" ADD CONSTRAINT "CustodyHandover_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyItem" ADD CONSTRAINT "CustodyItem_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "CustodyHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyItem" ADD CONSTRAINT "CustodyItem_clearanceId_fkey" FOREIGN KEY ("clearanceId") REFERENCES "Clearance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Permissions for the two new pages.
INSERT INTO "Permission" ("id", "key", "module", "description")
SELECT gen_random_uuid()::text, k, 'custody', NULL
FROM unnest(ARRAY['custody.view', 'custody.create', 'custody.edit', 'custody.delete', 'custody.export']) AS k
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."module" = 'custody'
WHERE r."name" IN ('Super Admin', 'Admin')
   OR (r."name" = 'HR' AND p."key" IN ('custody.view', 'custody.create', 'custody.edit', 'custody.export'))
   OR (r."name" = 'Manager' AND p."key" IN ('custody.view', 'custody.export'))
   OR (r."name" = 'Accountant' AND p."key" IN ('custody.view'))
ON CONFLICT DO NOTHING;
