import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env itself. Render passes the variables in the
// environment, so a missing file here is fine.
config({ path: path.join(__dirname, ".env"), quiet: true });

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  // Migrations use the direct (non-pooled) Neon URL, as `directUrl` did.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
