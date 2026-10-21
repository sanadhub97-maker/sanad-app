-- Login attempt counters shared by all server instances.
CREATE TABLE IF NOT EXISTS "RateLimitHit" (
  "key" TEXT PRIMARY KEY,
  "hits" INTEGER NOT NULL DEFAULT 0,
  "reset_at" TIMESTAMP(3) NOT NULL
);
