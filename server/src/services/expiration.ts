import { DocumentStatus } from "@prisma/client";

export interface ExpirationRules {
  /** Days before expiry at which status flips from VALID to EXPIRING_SOON. */
  expiringSoonThresholdDays: number;
  /** Milestones (days-before-expiry) at which a notification should fire. */
  notifyDaysBefore: number[];
}

export const DEFAULT_EXPIRATION_RULES: ExpirationRules = {
  expiringSoonThresholdDays: 30,
  notifyDaysBefore: [90, 60, 30, 15, 7, 3, 1],
};

/** Whole-day difference between `date` and `from` (midnight-to-midnight), so
 * "today" always yields 0 regardless of time-of-day. */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((end - start) / 86_400_000);
}

/** Spec §20: >threshold days = Valid, 1..threshold = Expiring Soon, <=0 = Expired. */
export function computeStatus(
  expiryDate: Date | null | undefined,
  rules: ExpirationRules = DEFAULT_EXPIRATION_RULES
): DocumentStatus | null {
  if (!expiryDate) return null;
  const days = daysUntil(expiryDate);
  if (days <= 0) return DocumentStatus.EXPIRED;
  if (days <= rules.expiringSoonThresholdDays) return DocumentStatus.EXPIRING_SOON;
  return DocumentStatus.VALID;
}

export function daysRemainingLabel(expiryDate: Date | null | undefined): string | null {
  if (!expiryDate) return null;
  const days = daysUntil(expiryDate);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}
