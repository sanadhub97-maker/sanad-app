import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  SETTINGS_ENCRYPTION_KEY: z.string().min(16),

  SEED_SUPERADMIN_NAME: z.string().default("Super Admin"),
  SEED_SUPERADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SEED_SUPERADMIN_PASSWORD: z.string().min(6).default("ChangeMe123!"),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(15),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_REGION: z.string().optional().default(""),
  STORAGE_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_SECRET_KEY: z.string().optional().default(""),
  STORAGE_BUCKET: z.string().optional().default(""),

  EMAIL_ENABLED: z.coerce.boolean().default(false),
  EMAIL_HOST: z.string().optional().default(""),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_SECURE: z.coerce.boolean().default(true),
  EMAIL_USER: z.string().optional().default(""),
  EMAIL_PASSWORD: z.string().optional().default(""),
  EMAIL_FROM_NAME: z.string().default("SanaD Documents & Licenses"),
  EMAIL_FROM_ADDRESS: z.string().optional().default(""),

  WHATSAPP_ENABLED: z.coerce.boolean().default(false),
  WHATSAPP_API_URL: z.string().optional().default(""),
  WHATSAPP_API_KEY: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),

  EXPIRATION_SCAN_CRON: z.string().default("0 6 * * *"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
