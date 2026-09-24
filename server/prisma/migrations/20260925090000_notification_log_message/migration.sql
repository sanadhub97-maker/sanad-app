-- The text of each sent message, for the live WhatsApp feed in Settings.
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "message" TEXT;
CREATE INDEX IF NOT EXISTS "NotificationLog_channel_createdAt_idx" ON "NotificationLog"("channel", "createdAt");
