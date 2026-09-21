-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CompanyDocumentCategory" ADD VALUE 'ENTERTAINMENT_AUTHORITY_PERMIT';
ALTER TYPE "CompanyDocumentCategory" ADD VALUE 'TOBACCO_LICENSE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployeeDocumentType" ADD VALUE 'EXIT_REENTRY_VISA';
ALTER TYPE "EmployeeDocumentType" ADD VALUE 'FINAL_EXIT_VISA';
ALTER TYPE "EmployeeDocumentType" ADD VALUE 'FLIGHT_TICKET';
