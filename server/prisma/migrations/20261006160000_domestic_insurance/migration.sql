-- A domestic worker's medical insurance follows the iqama; this keeps it separate for the exceptions.
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "insuranceSeparate" BOOLEAN NOT NULL DEFAULT false;
