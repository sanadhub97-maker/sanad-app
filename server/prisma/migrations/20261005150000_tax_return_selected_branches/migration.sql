ALTER TABLE "Branch" ADD COLUMN "vatRegistrationNumber" TEXT;
CREATE TABLE "TaxReturnBranch" ("taxReturnId" TEXT NOT NULL, "branchId" TEXT NOT NULL, "nameSnapshot" TEXT NOT NULL, PRIMARY KEY ("taxReturnId", "branchId"));
CREATE INDEX "TaxReturnBranch_branchId_idx" ON "TaxReturnBranch"("branchId");
ALTER TABLE "TaxReturnBranch" ADD CONSTRAINT "TaxReturnBranch_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxReturnBranch" ADD CONSTRAINT "TaxReturnBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "TaxReturnBranch" ("taxReturnId", "branchId", "nameSnapshot") SELECT t.id,t."branchId",b.name FROM "TaxReturn" t JOIN "Branch" b ON b.id=t."branchId";
