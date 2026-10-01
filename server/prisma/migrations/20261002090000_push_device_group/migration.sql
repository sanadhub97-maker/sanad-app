-- Computers and phones/tablets/iPads get their own notification settings.
ALTER TABLE "PushSubscription" ADD COLUMN "device" TEXT NOT NULL DEFAULT 'desktop';

-- Devices subscribed before: told apart by their browser's description.
UPDATE "PushSubscription" SET "device" = 'mobile' WHERE "userAgent" ~* '(iPhone|iPad|iPod|Android|Mobile|Tablet)';
