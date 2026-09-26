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

/** "pairing": waiting for the 8-character code to be typed on the phone;
 * "finishing": scanned/entered — WhatsApp is completing the link. */
export type WebStatus = "disconnected" | "connecting" | "qr" | "pairing" | "finishing" | "connected";

const state: {
  status: WebStatus;
  qr: string | null;
  pairingCode: string | null;
  phone: string | null;
  lastError: string | null;
} = {
  status: "disconnected",
  qr: null,
  pairingCode: null,
  phone: null,
  lastError: null,
};

let sock: WASocket | null = null;
let starting: Promise<void> | null = null;

// The session being linked stays in memory across the reconnects WhatsApp
// asks for during linking: reloading it from the database could pick up a
// copy saved before the last credentials update and break the link.
type AuthData = { creds: AuthenticationState["creds"]; keys: Record<string, Record<string, unknown>> };
let authCache: AuthData | null = null;
// Saves run one at a time, in order, so an older snapshot never lands last.
let saveChain: Promise<void> = Promise.resolve();

// When a phone can't decrypt a message (it shows "waiting for this message"),
// it asks the sender to send it again; WhatsApp can only do that with the
// message's content, so recent ones are kept here for it (getMessage below).
const RECENT_LIMIT = 300;
const recentMessages = new Map<string, unknown>();
function rememberSent(sent: { key?: { id?: string | null }; message?: unknown } | undefined) {
  const id = sent?.key?.id;
  if (!id || !sent?.message) return;
  recentMessages.set(id, sent.message);
  if (recentMessages.size > RECENT_LIMIT) recentMessages.delete(recentMessages.keys().next().value as string);
}

// How many times each message has been re-sent on request (Baileys caps retries with it).
const retryCounts = new Map<string, unknown>();
const retryCounterCache = {
  get: <T>(key: string) => retryCounts.get(key) as T | undefined,
  set: <T>(key: string, value: T) => void retryCounts.set(key, value),
  del: (key: string) => void retryCounts.delete(key),
  flushAll: () => retryCounts.clear(),
};

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
  authCache = null;
  await saveChain.catch(() => undefined);
  await prisma.setting.deleteMany({ where: { key: AUTH_KEY } });
}

export async function hasStoredSession() {
  return Boolean(await prisma.setting.findUnique({ where: { key: AUTH_KEY } }));
}

async function openSocket(pairPhone?: string) {
  const baileys = await importEsm("@whiskeysockets/baileys");
  if (!authCache) {
    const stored = await loadStoredSession(baileys);
    authCache = stored ?? { creds: baileys.initAuthCreds(), keys: {} };
  }
  const { creds, keys } = authCache;
  // Set once another server instance takes over this session (a deploy starts
  // the new copy before stopping the old one): from then on this copy must not
  // write its now-stale encryption keys over the new copy's.
  let superseded = false;
  const save = () => {
    if (superseded) return saveChain;
    saveChain = saveChain
      .then(() => persistSession(baileys, creds, keys))
      .catch((err) => logger.error({ err }, "Could not save the WhatsApp session"));
    return saveChain;
  };

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
  if (state.status !== "finishing") state.status = "connecting";
  state.lastError = null;
  let pairingRequested = false;

  const socket = baileys.default({
    auth,
    version,
    printQRInTerminal: false,
    browser: ["SanaD", "Chrome", "1.0"],
    logger: logger.child({ module: "baileys" }, { level: "warn" }) as never,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    getMessage: async (key) => recentMessages.get(key.id ?? "") as never,
    msgRetryCounterCache: retryCounterCache as never,
  });
  sock = socket;

  socket.ev.on("creds.update", () => void save());

  socket.ev.on("connection.update", async (update) => {
    if (socket !== sock) return; // a newer socket superseded this one
    if (update.qr && !creds.me) {
      if (pairPhone) {
        // Linking by phone number: the socket is ready once it offers a QR;
        // ask for an 8-character code instead and show that.
        if (!pairingRequested) {
          pairingRequested = true;
          try {
            const code = await socket.requestPairingCode(pairPhone);
            state.pairingCode = code.length === 8 ? code.slice(0, 4) + "-" + code.slice(4) : code;
            state.status = "pairing";
          } catch (err) {
            logger.error({ err }, "WhatsApp pairing code request failed");
            state.lastError = "تعذر طلب كود الربط — تأكد من الرقم وحاول تاني، أو استخدم مسح QR";
            state.status = "disconnected";
            sock = null;
            socket.end(undefined);
          }
        }
      } else {
        state.status = "qr";
        state.qr = await QRCode.toDataURL(update.qr, { margin: 1, width: 280 });
      }
    }
    if (update.isNewLogin) {
      // Scanned / code entered: WhatsApp now restarts the connection to finish.
      state.status = "finishing";
      state.qr = null;
      state.pairingCode = null;
      await save();
    }
    if (update.connection === "open") {
      state.status = "connected";
      state.qr = null;
      state.pairingCode = null;
      state.phone = socket.user?.id ? "+" + socket.user.id.split(":")[0].split("@")[0] : null;
      await save();
      logger.info({ phone: state.phone }, "WhatsApp Web linked");
    }
    if (update.connection === "close") {
      const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      sock = null;
      state.qr = null;
      if (code === baileys.DisconnectReason.loggedOut) {
        state.status = "disconnected";
        state.phone = null;
        state.pairingCode = null;
        state.lastError = "تم فك الربط من الموبايل — اربط الرقم تاني";
        await clearSession();
      } else if (code === baileys.DisconnectReason.connectionReplaced) {
        // Another server instance (e.g. a fresh deploy) took over the session — let it.
        superseded = true;
        state.status = "disconnected";
      } else if (code === baileys.DisconnectReason.restartRequired || creds.me) {
        // 515 right after a scan is WhatsApp's normal "reconnect to finish
        // linking"; for a linked session any other drop is a reconnect too.
        if (state.status !== "finishing") state.status = "connecting";
        const delay = code === baileys.DisconnectReason.restartRequired ? 0 : 3000;
        setTimeout(() => void startWhatsappWeb(pairPhone).catch(() => undefined), delay);
      } else {
        // Never scanned before WhatsApp gave up on the code — stop instead of
        // generating codes nobody is looking at.
        state.status = "disconnected";
        state.pairingCode = null;
        state.lastError = pairPhone ? "انتهت مهلة كود الربط — اطلب كود جديد" : "انتهت مهلة مسح الكود — اضغط ربط رقم تاني";
        await clearSession();
      }
    }
  });
}

export async function startWhatsappWeb(pairPhone?: string) {
  if (sock || starting) return starting ?? undefined;
  starting = openSocket(pairPhone)
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

/** Starts linking from the settings page, by QR (no phone) or by an
 * 8-character pairing code for the given number. Any half-finished attempt
 * is dropped first so switching between the two methods works. */
export async function beginLinking(pairPhone?: string) {
  if (state.status === "connected" && sock) return;
  if (state.status === "finishing") return; // already completing a link
  const current = sock;
  sock = null;
  if (current) current.end(undefined);
  if (starting) await starting.catch(() => undefined);
  await clearSession();
  Object.assign(state, { status: "connecting", qr: null, pairingCode: null, lastError: null });
  await startWhatsappWeb(pairPhone ? pairPhone.replace(/\D/g, "") : undefined);
}

export async function logoutWhatsappWeb() {
  const current = sock;
  sock = null;
  if (current) await current.logout().catch(() => current.end(undefined));
  await clearSession();
  Object.assign(state, { status: "disconnected", qr: null, pairingCode: null, phone: null, lastError: null });
}

export function getWhatsappWebStatus() {
  return { ...state };
}

async function waitForConnection(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (state.status === "connected" && sock) return sock;
    if (state.status === "qr" || state.status === "pairing") return null; // needs a human — don't wait
    await new Promise((r) => setTimeout(r, 500));
  }
  return state.status === "connected" ? sock : null;
}

export async function sendViaWhatsappWeb(
  toPhone: string,
  message: string,
  image?: Buffer
): Promise<{ sent: boolean; reason?: string }> {
  if (!sock && (await hasStoredSession())) await startWhatsappWeb().catch(() => undefined);
  const socket = await waitForConnection(45_000);
  if (!socket) return { sent: false, reason: "رقم الواتساب مش مربوط — اربطه من الإعدادات بمسح كود QR" };

  const jid = `${toPhone.replace(/\D/g, "")}@s.whatsapp.net`;
  try {
    const [check] = (await socket.onWhatsApp(jid)) ?? [];
    if (check && !check.exists) return { sent: false, reason: `الرقم ${toPhone} مش عليه واتساب` };
    // With a picture the message travels as its caption.
    rememberSent(await socket.sendMessage(jid, image ? { image, caption: message, mimetype: "image/png" } : { text: message }));
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
