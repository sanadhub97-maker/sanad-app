import { Prisma, PrismaClient } from "@prisma/client";
import { isProduction } from "@/config/env";

export const prisma = new PrismaClient({
  log: isProduction ? ["error", "warn"] : ["warn", "error"],
});

// Serverless Postgres (Neon's free tier included) suspends its compute after
// a few minutes idle; the first query after a gap can fail with P1001/P1017
// while the compute wakes, even though a retry a moment later succeeds. This
// middleware retries once, transparently, instead of surfacing a 500 for
// what is really just a cold start.
const TRANSIENT_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (err) {
    const isKnownTransient = err instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_ERROR_CODES.has(err.code);
    const isInitError = err instanceof Prisma.PrismaClientInitializationError;
    if (!isKnownTransient && !isInitError) throw err;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return next(params);
  }
});
