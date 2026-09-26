-- Daily tasks: a to-do list kept per calendar day.
DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DailyTask" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assigneeId" TEXT,
    "time" TEXT,
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "carriedFrom" DATE,
    "sourceKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DailyTask_date_idx" ON "DailyTask"("date");
CREATE INDEX IF NOT EXISTS "DailyTask_sourceKey_idx" ON "DailyTask"("sourceKey");

ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permissions for the new page, granted to the roles that manage day-to-day work.
INSERT INTO "Permission" ("id", "key", "module", "description")
SELECT gen_random_uuid()::text, k, 'tasks', NULL
FROM unnest(ARRAY['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.export']) AS k
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."module" = 'tasks'
WHERE r."name" IN ('Super Admin', 'Admin')
   OR (r."name" IN ('HR', 'Manager') AND p."key" <> 'tasks.delete')
ON CONFLICT DO NOTHING;
