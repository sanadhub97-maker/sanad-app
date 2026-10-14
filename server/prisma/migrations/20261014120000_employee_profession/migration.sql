-- The profession on the iqama, apart from the job title: a domestic worker's medical insurance follows the iqama by it.
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "profession" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "professionEn" TEXT;
