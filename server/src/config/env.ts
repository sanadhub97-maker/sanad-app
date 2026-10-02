import "dotenv/config";
import { z } from "zod";

const booleanEnv = (fallback: boolean) => z.preprocess((value) => value === undefined ? fallback : value === true || value === "true" || value === "1", z.boolean());
const ttl = z.string().regex(/^\d+(s|m|h|d)$/).refine((value) => Number(value.slice(0, -1)) > 0, "Token lifetime must be positive");

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  TRUSTED_ORIGINS: z.string().default("https://sept.cloud,https://sanad-hr.sept.cloud"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  PDF_DISABLE_SANDBOX: booleanEnv(false),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: ttl.default("15m"),
  JWT_REFRESH_EXPIRES_IN: ttl.default("30d"),
  SETTINGS_ENCRYPTION_KEY: z.string().min(32),

  SEED_SUPERADMIN_NAME: z.string().default("Super Admin"),
  SEED_SUPERADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SEED_SUPERADMIN_PASSWORD: z.string().min(12).optional(),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().min(1).max(25).default(15),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_REGION: z.string().optional().default(""),
  STORAGE_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_SECRET_KEY: z.string().optional().default(""),
  STORAGE_BUCKET: z.string().optional().default(""),

  EMAIL_ENABLED: booleanEnv(false),
  EMAIL_HOST: z.string().optional().default(""),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_SECURE: booleanEnv(true),
  EMAIL_USER: z.string().optional().default(""),
  EMAIL_PASSWORD: z.string().optional().default(""),
  EMAIL_FROM_NAME: z.string().default("SanaD Documents & Licenses"),
  EMAIL_FROM_ADDRESS: z.string().optional().default(""),

  WHATSAPP_ENABLED: booleanEnv(false),
  WHATSAPP_API_URL: z.string().optional().default(""),
  WHATSAPP_API_KEY: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),

  EXPIRATION_SCAN_CRON: z.string().default("0 6 * * *"),
}).superRefine((value, ctx) => {
  for (const origin of value.TRUSTED_ORIGINS.split(",").filter(Boolean)) {
    try { const url = new URL(origin.trim()); if (url.protocol !== "https:" && value.NODE_ENV === "production") throw new Error(); }
    catch { ctx.addIssue({ code: "custom", path: ["TRUSTED_ORIGINS"], message: "Invalid trusted origin" }); }
  }
  if (value.NODE_ENV === "production" && new URL(value.CLIENT_URL).protocol !== "https:") ctx.addIssue({ code: "custom", path: ["CLIENT_URL"], message: "Production requires HTTPS" });
  if (value.NODE_ENV === "production") {
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "SETTINGS_ENCRYPTION_KEY"] as const) {
      if (/change[-_]?me|example|placeholder/i.test(value[key]) || new Set(value[key]).size < 10) ctx.addIssue({ code: "custom", path: [key], message: "Use an independently generated random secret" });
    }
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET || value.JWT_ACCESS_SECRET === value.SETTINGS_ENCRYPTION_KEY || value.JWT_REFRESH_SECRET === value.SETTINGS_ENCRYPTION_KEY) ctx.addIssue({ code: "custom", path: ["JWT_ACCESS_SECRET"], message: "Secrets must be independent" });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
