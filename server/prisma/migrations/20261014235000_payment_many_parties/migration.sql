-- A payment for several establishments (wage protection) or employees (health certificates).
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "branchIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "employeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
