ALTER TABLE "Payment" ADD COLUMN "fileIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Payment" SET "fileIds" = ARRAY["fileId"] WHERE "fileId" IS NOT NULL;
