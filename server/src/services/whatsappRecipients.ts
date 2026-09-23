import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const RECIPIENTS_KEY = "whatsapp.recipients";

interface StoredRecipient {
  id: string;
  name: string;
  phone: string;
  enabled: boolean;
  // CallMeBot only: each number activates its own key.
  apiKeyEncrypted?: string | null;
}

export interface WhatsappRecipientInput {
  id?: string;
  name: string;
  phone: string;
  enabled: boolean;
  apiKey?: string; // omitted => keep the existing key
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

async function readStored(): Promise<StoredRecipient[]> {
  const row = await prisma.setting.findUnique({ where: { key: RECIPIENTS_KEY } });
  if (row) return (row.value as { recipients?: StoredRecipient[] }).recipients ?? [];

  // Before this list existed, CallMeBot kept its single number on WhatsappSettings.
  const legacy = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (legacy?.provider === "CALLMEBOT" && legacy.phoneNumberId) {
    return [
      { id: "legacy", name: "", phone: legacy.phoneNumberId, enabled: true, apiKeyEncrypted: legacy.apiKeyEncrypted },
    ];
  }
  return [];
}

export async function listRecipients() {
  return (await readStored()).map(({ apiKeyEncrypted, ...r }) => ({ ...r, hasApiKey: Boolean(apiKeyEncrypted) }));
}

export async function saveRecipients(input: WhatsappRecipientInput[]) {
  const existing = new Map((await readStored()).map((r) => [r.id, r]));
  const recipients: StoredRecipient[] = input.map((r) => {
    const previous = r.id ? existing.get(r.id) : undefined;
    return {
      id: previous?.id ?? randomUUID(),
      name: r.name.trim(),
      phone: normalizePhone(r.phone),
      enabled: r.enabled,
      apiKeyEncrypted: r.apiKey ? encryptSecret(r.apiKey.trim()) : previous?.apiKeyEncrypted ?? null,
    };
  });

  await prisma.setting.upsert({
    where: { key: RECIPIENTS_KEY },
    update: { value: { recipients } as never },
    create: { key: RECIPIENTS_KEY, value: { recipients } as never },
  });
  return listRecipients();
}

export async function getActiveRecipients(): Promise<{ phone: string; apiKey?: string }[]> {
  return (await readStored())
    .filter((r) => r.enabled)
    .map((r) => ({ phone: r.phone, apiKey: r.apiKeyEncrypted ? decryptSecret(r.apiKeyEncrypted) : undefined }));
}

export async function getRecipientApiKey(phone: string): Promise<string | undefined> {
  const match = (await readStored()).find((r) => r.phone === normalizePhone(phone));
  return match?.apiKeyEncrypted ? decryptSecret(match.apiKeyEncrypted) : undefined;
}
