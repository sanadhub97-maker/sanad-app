/** The designs of the morning summary sent as text (built in services/dailyText). Kept apart so settings can name them without loading the builders. */
export const DAILY_TEXT_IDS = ["report", "grouped", "cards", "brief", "letter", "executive", "dashboard", "timeline"] as const;
export type DailyTextId = (typeof DAILY_TEXT_IDS)[number];
export const isDailyTextId = (v: unknown): v is DailyTextId => (DAILY_TEXT_IDS as readonly string[]).includes(String(v));
