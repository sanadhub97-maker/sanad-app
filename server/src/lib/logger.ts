import pino from "pino";
import { isProduction } from "@/config/env";
import { LOG_REDACTION } from "@/lib/security";

export const logger = pino({
  redact: LOG_REDACTION,
  level: isProduction ? "info" : "debug",
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
});
