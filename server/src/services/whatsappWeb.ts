import QRCode from "qrcode";
import type { AuthenticationState, SignalDataTypeMap, WASocket } from "@whiskeysockets/baileys";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";

// Links one WhatsApp number to the system by QR code (the same mechanism as
// WhatsApp Web) and sends alerts from it to any number. Not an official Meta
// API — the admin is told to link a spare number.

const AUTH_KEY = "whatsapp.web.session";

export type WebStatus = "disconnected" | "connecting" | "qr" | "connected";

const state: { status: WebStatus; qr: string | null; phone: string | null; lastError: string | null } = {
  status: "disconnected",
  qr: null,
  phone: null,
  lastError: null,
};

let sock: WASocket | null = null;
let starting: Promise<void> | null = null;

// Baileys is ESM-only; this CommonJS server has to load it with a real dynamic
// import (TypeScript would otherwise compile `import()` into `require()`).
const importEsm = new Function("s", "return import(s)") as (s: string) => Promise<typeof import("@whiskeysockets/baileys")>;

async function loadStoredSession(baileys: typeof import("@whiskeysockets/baileys")) {
  const row = await prisma.setting.findUnique({ where: { key: AUTH_KEY } });
  const encrypted = (row?.value as { data?: string } | undefined)?.data;
  if (!encrypted) return null;
  try {
    return JSON.parse(decryptSecret(encrypted), baileys.BufferJSON.reviver) as { creds: AuthenticationState["creds"]; keys: Record<string, Record<string, unknown>> };
  } catch (err) {
    // Encrypted with another environment's key (e.g. production's) — never overwrite it from here.
    logger.error({ err }, "WhatsApp Web session could not be decrypted");
    throw new Error("Stored WhatsApp session belongs to another environment");
  }
}

async function persistSession(baileys: typeof import("@whiskeysockets/baileys"), creds: unknown, keys: unknown) {
  const data = encryptSecret(JSON.stringify({ creds, keys }, baileys.BufferJSON.replacer));
  await prisma.setting.upsert({
    where: { key: AUTH_KEY },
    update: { value: { data } },
    create: { key: AUTH_KEY, value: { data } },
  });
}

async function clearSession() {
  await prisma.setting.deleteMany({ where: { key: AUTH_KEY } });
}

export async function hasStoredSession() {
  return Boolean(await prisma.setting.findUnique({ where: { key: AUTH_KEY } }));
}

async function openSocket() {
  const baileys = await importEsm("@whiskeysockets/baileys");
  const stored = await loadStoredSession(baileys);
  const creds = stored?.creds ?? baileys.initAuthCreds();
  const keys: Record<string, Record<string, unknown>> = stored?.keys ?? {};
  const save = () => persistSession(baileys, creds, keys);

  const auth: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const out: { [id: string]: SignalDataTypeMap[typeof type] } = {};
        for (const id of ids) {
          let value = keys[type]?.[id];
          if (value && type === "app-state-sync-key") value = baileys.proto.Message.AppStateSyncKeyData.fromObject(value as object);
          if (value) out[id] = value as SignalDataTypeMap[typeof type];
        }
        return out;
      },
      set: async (data) => {
        for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          keys[category] ??= {};
          for (const [id, value] of Object.entries(data[category] ?? {})) {
            if (value) keys[category][id] = value;
            else delete keys[category][id];
          }
        }
        await save();
      },
    },
  };

  const { version } = await baileys.fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  state.status = "connecting";
  state.lastError = null;

  const socket = baileys.default({
    auth,
    version,
    printQRInTerminal: false,
    browser: ["SanaD", "Chrome", "1.0"],
    logger: logger.child({ module: "baileys" }, { level: "warn" }) as never,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  sock = socket;

  socket.ev.on("creds.update", () => void save());

  socket.ev.on("connection.update", async (update) => {
    if (socket !== sock) return; // a newer socket superseded this one
    if (update.qr) {
      state.status = "qr";
      state.qr = await QRCode.toDataURL(update.qr, { margin: 1, width: 280 });
    }
    if (update.connection === "open") {
      state.status = "connected";
      state.qr = null;
      state.phone = socket.user?.id ? `+${socket.user.id.split(":")[0].split("@")[0]}` : null;
      logger.info({ phone: state.phone }, "WhatsApp Web linked");
    }
    if (update.connection === "close") {
      const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      sock = null;
      state.qr = null;
      if (code === baileys.DisconnectReason.loggedOut) {
        state.status = "disconnected";
        state.phone = null;
        state.lastError = "تم فك الربط من الموبايل";
        await clearSession();
      } else if (code === baileys.DisconnectReason.connectionReplaced) {
        // Another server instance (e.g. a fresh deploy) took over the session — let it.
        state.status = "disconnected";
      } else {
        state.status = "connecting";
        setTimeout(() => void startWhatsappWeb().catch(() => undefined), 3000);
      }
    }
  });
}

export async function startWhatsappWeb() {
  if (sock || starting) return starting ?? undefined;
  starting = openSocket()
    .catch((err) => {
      state.status = "disconnected";
      state.lastError = (err as Error).message;
      throw err;
    })
    .finally(() => {
      starting = null;
    });
  return starting;
}

export async function logoutWhatsappWeb() {
  const current = sock;
  sock = null;
  if (current) await current.logout().catch(() => current.end(undefined));
  await clearSession();
  Object.assign(state, { status: "disconnected", qr: null, phone: null, lastError: null });
}

export function getWhatsappWebStatus() {
  return { ...state };
}

async function waitForConnection(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (state.status === "connected" && sock) return sock;
    if (state.status === "qr") return null; // needs a human to scan — don't wait
    await new Promise((r) => setTimeout(r, 500));
  }
  return state.status === "connected" ? sock : null;
}

export async function sendViaWhatsappWeb(toPhone: string, message: string): Promise<{ sent: boolean; reason?: string }> {
  if (!sock && (await hasStoredSession())) await startWhatsappWeb().catch(() => undefined);
  const socket = await waitForConnection(45_000);
  if (!socket) return { sent: false, reason: "رقم الواتساب مش مربوط — اربطه من الإعدادات بمسح كود QR" };

  const jid = `${toPhone.replace(/\D/g, "")}@s.whatsapp.net`;
  try {
    const [check] = (await socket.onWhatsApp(jid)) ?? [];
    if (check && !check.exists) return { sent: false, reason: `الرقم ${toPhone} مش عليه واتساب` };
    await socket.sendMessage(jid, { text: message });
    return { sent: true };
  } catch (err) {
    logger.error({ err, toPhone }, "WhatsApp Web send failed");
    return { sent: false, reason: (err as Error).message };
  }
}

/** Reconnects a previously linked session on boot. Only in production: the
 * local dev server shares this database, and two servers on one session
 * would keep kicking each other off. */
export async function resumeWhatsappWebOnBoot() {
  if (env.NODE_ENV !== "production") return;
  const row = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (row?.enabled && row.provider === WHATSAPP_WEB_PROVIDER && (await hasStoredSession())) {
    await startWhatsappWeb().catch((err) => logger.error({ err }, "Could not resume WhatsApp Web session"));
  }
}

export const WHATSAPP_WEB_PROVIDER = "WHATSAPP_WEB";
