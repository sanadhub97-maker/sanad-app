CREATE TABLE "Passkey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "rpId" TEXT NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" TEXT[] NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Passkey_userId_rpId_idx" ON "Passkey"("userId", "rpId");
CREATE TABLE "PasskeyChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "challenge" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "userId" TEXT,
  "passwordProof" TEXT,
  "origin" TEXT NOT NULL,
  "rpId" TEXT NOT NULL,
  "rememberMe" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PasskeyChallenge_expiresAt_idx" ON "PasskeyChallenge"("expiresAt");
ALTER TABLE "Session" ADD COLUMN "passkeyId" TEXT;
ALTER TABLE "Session" ADD CONSTRAINT "Session_passkeyId_fkey" FOREIGN KEY ("passkeyId") REFERENCES "Passkey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
