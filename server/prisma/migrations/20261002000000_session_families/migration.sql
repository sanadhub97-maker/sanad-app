-- Every refresh successor keeps the initial login's random family identifier.
-- Existing sessions receive unique identifiers; no session tokens are exposed.
ALTER TABLE "Session" ADD COLUMN "familyId" TEXT;
UPDATE "Session" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "familyId" SET NOT NULL;
CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");
