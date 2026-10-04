-- Reconcile the tax feature previously installed outside migration history.
-- This migration sorts before the already-applied optional owner-name migration.
-- Existing rows and columns are preserved; no sample financial data is inserted.
DO $$ BEGIN
  CREATE TYPE "TaxReturnKind" AS ENUM ('VAT', 'ZAKAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "TaxReturnStatus" AS ENUM ('DRAFT', 'FILED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "TaxReturn" (
  "id" TEXT NOT NULL,
  "kind" "TaxReturnKind" NOT NULL,
  "branchId" TEXT,
  "year" INTEGER NOT NULL,
  "quarter" INTEGER,
  "dueDate" DATE NOT NULL,
  "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "salesStandard" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "salesZero" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "salesExports" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "salesExempt" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "purchasesStandard" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "purchasesImports" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "purchasesZero" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "purchasesExempt" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "outputVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "inputVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "corrections" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "zakatBase" DECIMAL(16,2),
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "penalty" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "filedDate" DATE,
  "reference" TEXT,
  "sadadNumber" TEXT,
  "paymentId" TEXT,
  "fileId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TaxReturn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TaxReturn_paymentId_key" ON "TaxReturn"("paymentId");
CREATE INDEX IF NOT EXISTS "TaxReturn_kind_year_quarter_idx" ON "TaxReturn"("kind", "year", "quarter");
CREATE INDEX IF NOT EXISTS "TaxReturn_branchId_idx" ON "TaxReturn"("branchId");
CREATE INDEX IF NOT EXISTS "TaxReturn_dueDate_idx" ON "TaxReturn"("dueDate");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"TaxReturn"'::regclass AND conname = 'TaxReturn_branchId_fkey') THEN
    ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"TaxReturn"'::regclass AND conname = 'TaxReturn_paymentId_fkey') THEN
    ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"TaxReturn"'::regclass AND conname = 'TaxReturn_fileId_fkey') THEN
    ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"TaxReturn"'::regclass AND conname = 'TaxReturn_createdById_fkey') THEN
    ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
