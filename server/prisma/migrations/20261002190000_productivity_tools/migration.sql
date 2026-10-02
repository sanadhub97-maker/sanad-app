CREATE TABLE "EmployeeOnboarding" (
  "employeeId" TEXT NOT NULL, "steps" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeOnboarding_pkey" PRIMARY KEY ("employeeId")
);
CREATE TABLE "AlertAcknowledgement" (
  "userId" TEXT NOT NULL, "key" TEXT NOT NULL, "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertAcknowledgement_pkey" PRIMARY KEY ("userId", "key")
);
CREATE TABLE "ReportSchedule" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "frequency" TEXT NOT NULL, "time" TEXT NOT NULL, "weekday" INTEGER NOT NULL DEFAULT 0,
  "monthday" INTEGER NOT NULL DEFAULT 1, "language" TEXT NOT NULL DEFAULT 'ar', "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GeneratedReport" (
  "id" TEXT NOT NULL, "scheduleId" TEXT NOT NULL, "slot" TEXT NOT NULL, "status" TEXT NOT NULL,
  "fileId" TEXT, "error" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReportSchedule_enabled_idx" ON "ReportSchedule"("enabled");
CREATE UNIQUE INDEX "GeneratedReport_scheduleId_slot_key" ON "GeneratedReport"("scheduleId", "slot");
ALTER TABLE "EmployeeOnboarding" ADD CONSTRAINT "EmployeeOnboarding_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertAcknowledgement" ADD CONSTRAINT "AlertAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
