import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env, isProduction } from "@/config/env";

// Serverless Postgres (Neon's free tier included) suspends its compute after
// a few minutes idle; the first query after a gap can fail with P1001/P1017
// while the compute wakes, even though a retry a moment later succeeds. This
// extension retries once, transparently, instead of surfacing a 500 for
// what is really just a cold start.
const TRANSIENT_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isTransient(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_ERROR_CODES.has(err.code)) return true;
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  // With the pg driver adapter, a dropped or refused connection surfaces as a
  // Node socket error rather than a P1xxx code.
  const code = (err as { code?: string; cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code;
  return code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "57P01";
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter, log: isProduction ? ["error", "warn"] : ["warn", "error"] }).$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (!isTransient(err)) throw err;
          await new Promise((resolve) => setTimeout(resolve, 750));
          return query(args);
        }
      },
    },
  });
}

export const prisma = createClient();
