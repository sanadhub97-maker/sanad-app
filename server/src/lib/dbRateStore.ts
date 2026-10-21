import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import { prisma } from "@/lib/prisma";

/** A rate-limit store kept in Postgres, so every serverless instance counts the same attempts
 * (an in-memory count resets with each cold start). Used only on the login limiters. */
export class DbRateStore implements Store {
  windowMs = 60_000;
  constructor(public prefix: string) {}
  init(options: Options) { this.windowMs = options.windowMs; }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const k = `${this.prefix}:${key}`;
    const reset = new Date(Date.now() + this.windowMs);
    const rows = await prisma.$queryRaw<{ hits: number; reset_at: Date }[]>`
      INSERT INTO "RateLimitHit" ("key", "hits", "reset_at") VALUES (${k}, 1, ${reset})
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "RateLimitHit"."reset_at" <= now() THEN 1 ELSE "RateLimitHit"."hits" + 1 END,
        "reset_at" = CASE WHEN "RateLimitHit"."reset_at" <= now() THEN ${reset} ELSE "RateLimitHit"."reset_at" END
      RETURNING "hits", "reset_at"`;
    return { totalHits: Number(rows[0].hits), resetTime: rows[0].reset_at };
  }

  async decrement(key: string) {
    await prisma.$executeRaw`UPDATE "RateLimitHit" SET "hits" = GREATEST("hits" - 1, 0) WHERE "key" = ${`${this.prefix}:${key}`}`;
  }

  async resetKey(key: string) {
    await prisma.$executeRaw`DELETE FROM "RateLimitHit" WHERE "key" = ${`${this.prefix}:${key}`}`;
  }
}
