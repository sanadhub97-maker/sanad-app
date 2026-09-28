-- The employee's sponsor (kafeel) and whether the worker is on the company's sponsorship.
ALTER TABLE "Employee" ADD COLUMN "sponsorName" TEXT;
ALTER TABLE "Employee" ADD COLUMN "onSponsorship" BOOLEAN;
