-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateLetters" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "ownerName" TEXT,
    "make" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT,
    "branchId" TEXT,
    "driverId" TEXT,
    "inspectionExpiry" DATE NOT NULL,
    "insuranceExpiry" DATE NOT NULL,
    "registrationExpiry" DATE,
    "insurer" TEXT,
    "insuranceType" TEXT,
    "inspectionFileId" TEXT,
    "insuranceFileId" TEXT,
    "registrationFileId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleRenewal" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "previous" DATE,
    "next" DATE NOT NULL,
    "paymentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_branchId_idx" ON "Vehicle"("branchId");

-- CreateIndex
CREATE INDEX "Vehicle_inspectionExpiry_idx" ON "Vehicle"("inspectionExpiry");

-- CreateIndex
CREATE INDEX "Vehicle_insuranceExpiry_idx" ON "Vehicle"("insuranceExpiry");

-- CreateIndex
CREATE INDEX "VehicleRenewal_vehicleId_idx" ON "VehicleRenewal"("vehicleId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRenewal" ADD CONSTRAINT "VehicleRenewal_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRenewal" ADD CONSTRAINT "VehicleRenewal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Permissions for the vehicles page.
INSERT INTO "Permission" ("id", "key", "module", "description")
SELECT gen_random_uuid()::text, k, 'vehicles', NULL
FROM unnest(ARRAY['vehicles.view', 'vehicles.create', 'vehicles.edit', 'vehicles.delete', 'vehicles.export']) AS k
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."module" = 'vehicles'
WHERE r."name" IN ('Super Admin', 'Admin')
   OR (r."name" = 'HR' AND p."key" IN ('vehicles.view', 'vehicles.create', 'vehicles.edit', 'vehicles.export'))
   OR (r."name" = 'Manager' AND p."key" IN ('vehicles.view', 'vehicles.export'))
   OR (r."name" = 'Accountant' AND p."key" IN ('vehicles.view'))
ON CONFLICT DO NOTHING;
