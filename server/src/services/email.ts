import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

interface EmailConfig {
  enabled: boolean;
  host?: string | null;
  port?: number | null;
  secure: boolean;
  username?: string | null;
  password?: string;
  fromName: string;
  fromEmail?: string;
}

async function getEmailConfig(): Promise<EmailConfig> {
  const row = await prisma.emailSettings.findUnique({ where: { id: 1 } });
  if (row?.enabled) {
    return {
      enabled: true,
      host: row.host,
      port: row.port,
      secure: row.secure,
      username: row.username,
      password: row.passwordEncrypted ? decryptSecret(row.passwordEncrypted) : undefined,
      fromName: row.fromName ?? env.EMAIL_FROM_NAME,
      fromEmail: row.fromEmail ?? env.EMAIL_FROM_ADDRESS,
    };
  }
  // Fall back to environment defaults (useful for first boot before an
  // administrator has visited Settings → Email).
  return {
    enabled: env.EMAIL_ENABLED,
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    username: env.EMAIL_USER,
    password: env.EMAIL_PASSWORD,
    fromName: env.EMAIL_FROM_NAME,
    fromEmail: env.EMAIL_FROM_ADDRESS,
  };
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends real email via SMTP when configured. If email is not yet
 * configured (no SMTP host/credentials), this safely no-ops and logs —
 * per §22, nothing is faked, but nothing crashes the calling flow either
 * (e.g. registration must still succeed even with email unconfigured).
 */
export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; reason?: string }> {
  const config = await getEmailConfig();
  if (!config.enabled || !config.host || !config.fromEmail) {
    logger.warn({ to: input.to, subject: input.subject }, "Email not configured — skipping send");
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure,
    auth: config.username ? { user: config.username, pass: config.password } : undefined,
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return { sent: true };
}
