-- Optional English versions of free-text fields, shown when the UI is in English.
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "cityEn" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "nationalityEn" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "cityEn" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "jobTitleEn" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "departmentEn" TEXT;
