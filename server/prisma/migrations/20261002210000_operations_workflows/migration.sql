BEGIN;
CREATE TYPE "AssetState" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED');
CREATE TABLE "ManagedAsset" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT NOT NULL,
  "serialNumber" TEXT, "branchId" TEXT, "purchaseValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "state" "AssetState" NOT NULL DEFAULT 'AVAILABLE', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ManagedAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AssetHandover" (
  "id" TEXT NOT NULL, "assetId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "recordedById" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "returnedAt" TIMESTAMP(3), "issuedCondition" TEXT NOT NULL,
  "returnedCondition" TEXT, "notes" TEXT, CONSTRAINT "AssetHandover_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmployeeOffboarding" (
  "id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "plannedDate" DATE NOT NULL, "reason" TEXT NOT NULL,
  "steps" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeOffboarding_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RenewalCase" (
  "id" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "title" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "dueDate" DATE NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT, "paymentId" TEXT, "taskId" TEXT, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagedAsset_code_key" ON "ManagedAsset"("code");
CREATE INDEX "ManagedAsset_branchId_state_idx" ON "ManagedAsset"("branchId", "state");
CREATE INDEX "AssetHandover_employeeId_returnedAt_idx" ON "AssetHandover"("employeeId", "returnedAt");
CREATE INDEX "AssetHandover_assetId_returnedAt_idx" ON "AssetHandover"("assetId", "returnedAt");
CREATE UNIQUE INDEX "AssetHandover_one_active_assignment" ON "AssetHandover"("assetId") WHERE "returnedAt" IS NULL;
CREATE UNIQUE INDEX "EmployeeOffboarding_employeeId_key" ON "EmployeeOffboarding"("employeeId");
CREATE INDEX "RenewalCase_sourceType_sourceId_status_idx" ON "RenewalCase"("sourceType", "sourceId", "status");
CREATE INDEX "RenewalCase_ownerId_dueDate_idx" ON "RenewalCase"("ownerId", "dueDate");
CREATE UNIQUE INDEX "RenewalCase_one_active_renewal" ON "RenewalCase"("sourceType", "sourceId") WHERE "status" NOT IN ('COMPLETED', 'CANCELLED');
ALTER TABLE "ManagedAsset" ADD CONSTRAINT "ManagedAsset_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetHandover" ADD CONSTRAINT "AssetHandover_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManagedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetHandover" ADD CONSTRAINT "AssetHandover_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetHandover" ADD CONSTRAINT "AssetHandover_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RenewalCase" ADD CONSTRAINT "RenewalCase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
