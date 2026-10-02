ALTER TABLE "Session" ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE TABLE "DocumentRevision" ("id" TEXT PRIMARY KEY, "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "subjectName" TEXT NOT NULL, "documentKind" TEXT NOT NULL, "actorId" TEXT, "actorName" TEXT NOT NULL, "before" JSONB NOT NULL, "after" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "DocumentRevision_subjectType_subjectId_createdAt_idx" ON "DocumentRevision"("subjectType", "subjectId", "createdAt");
CREATE TABLE "BackupSnapshot" ("id" TEXT PRIMARY KEY, "status" TEXT NOT NULL, "storedName" TEXT, "checksum" TEXT, "recordCount" INTEGER NOT NULL DEFAULT 0, "fileCount" INTEGER NOT NULL DEFAULT 0, "totalBytes" BIGINT NOT NULL DEFAULT 0, "error" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3));
CREATE INDEX "BackupSnapshot_createdAt_idx" ON "BackupSnapshot"("createdAt");
CREATE TABLE "MaintenanceLease" ("id" TEXT PRIMARY KEY, "token" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
