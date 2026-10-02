import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import { appOrigin, devicesOf, getPushPrefs, sendToUser, setPushPrefs, subscribe, unsubscribe, vapidKeys } from "@/services/push";
import { drawCard, openToken, type PushCard } from "@/services/pushCard";
import { runTaskAction } from "@/services/pushAlerts";

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  }),
  via: z.enum(["app", "sept"]).default("app"),
  device: z.enum(["desktop", "mobile"]).optional(),
});
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const groupSchema = z.object({
  kinds: z.object({ exp: z.boolean(), soon: z.boolean(), brief: z.boolean(), task: z.boolean(), pay: z.boolean() }),
  quiet: z.object({ on: z.boolean(), from: hm, to: hm }),
});
// Computers, and phones/tablets/iPads, each with their own settings.
const prefsSchema = z.object({ desktop: groupSchema, mobile: groupSchema });

const userId = (req: Request) => {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.userId;
};

const router = Router();

/* ---------- open to the devices themselves (no sign-in on a lock screen) ---------- */

// The picture under a notification. Its content is in the signed token.
router.get(
  "/card/:token.png",
  asyncHandler(async (req: Request, res: Response) => {
    const token = String(req.params.token);
    const card = openToken<PushCard>(token);
    if (!card) throw ApiError.notFound("Card not found");
    const png = await drawCard(token, card, `${appOrigin()}/pwa/icon-192.png`);
    res.set("Cache-Control", "private, no-store").type("png").send(png);
  })
);

// A button on a task notification ("تم", "تأجيل ساعة"), sent by the service worker.
router.post(
  "/act/:token",
  asyncHandler(async (req: Request, res: Response) => {
    const token = openToken<{ a: string; id: string; u: string; exp: number; iat: number }>(String(req.params.token));
    if (!token) throw ApiError.notFound("Unknown action");
    res.json({ ok: await runTaskAction(token) });
  })
);

/* ---------- the signed-in user's own devices and settings ---------- */

router.use(requireAuth);

router.get(
  "/key",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: { publicKey: (await vapidKeys()).publicKey } });
  })
);

router.get(
  "/status",
  asyncHandler(async (req: Request, res: Response) => {
    const id = userId(req);
    const [devices, prefs] = await Promise.all([devicesOf(id), getPushPrefs(id)]);
    res.json({
      data: {
        prefs,
        devices: devices.map((d) => ({ id: d.id, via: d.via, device: d.device, userAgent: d.userAgent, createdAt: d.createdAt, lastSentAt: d.lastSentAt, endpointTail: d.endpoint.slice(-16) })),
      },
    });
  })
);

router.post(
  "/subscribe",
  validate({ body: subscriptionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { subscription, via, device } = req.body as z.infer<typeof subscriptionSchema>;
    await subscribe(userId(req), subscription, via, req.get("user-agent"), device);
    res.status(201).json({ message: "Device subscribed." });
  })
);

router.post(
  "/unsubscribe",
  validate({ body: z.object({ endpoint: z.string().min(1).max(1000) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    await unsubscribe(userId(req), String(req.body.endpoint));
    res.json({ message: "Device removed." });
  })
);

router.delete(
  "/devices/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.pushSubscription.deleteMany({ where: { id: String(req.params.id), userId: userId(req) } });
    res.json({ message: "Device removed." });
  })
);

router.put(
  "/prefs",
  validate({ body: prefsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await setPushPrefs(userId(req), req.body);
    res.json({ data: await getPushPrefs(userId(req)) });
  })
);

// "جرّب إشعار" — one of the real designs, to the user's computers or to their phones and tablets.
router.post(
  "/test",
  validate({ body: z.object({ kind: z.enum(["exp", "soon", "brief", "task", "pay"]).default("soon"), group: z.enum(["desktop", "mobile"]).optional() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const first = (req.auth?.fullName || "").trim().split(/\s+/)[0];
    const samples = {
      exp: { k: "#e5484d", ic: "id", title: "إشعار تجريبي: وثيقة منتهية", body: "كده هيوصلك التنبيه لما وثيقة تنتهي.", ring: ["0", "اليوم"], tag: "منتهي", life: "تجربة", used: 100, pct: 100 },
      soon: { k: "#f59e0b", ic: "clock", title: "إشعار تجريبي: وثيقة قريبة", body: "كده هيوصلك التنبيه قبل ما وثيقة تنتهي.", ring: ["7", "يوم باقي"], tag: "قريب", life: "تجربة", used: 70, pct: 70 },
      brief: { k: "#2f5fe0", ic: "sun", title: `صباح الخير${first ? ` يا ${first}` : ""}`, body: "كده هيوصلك ملخص اليوم كل يوم الساعة 8 الصبح.", ring: ["8:00", "الصبح"], tag: "صباحي", life: "تجربة", used: 66, pct: 66 },
      task: { k: "#10b981", ic: "check", title: "إشعار تجريبي: مهمة", body: "كده هيوصلك التنبيه في ميعاد المهمة.", ring: ["10:00", "الساعة"], tag: "مهمة", life: "تجربة", used: 45, pct: 70 },
      pay: { k: "#9333ea", ic: "receipt", title: "إشعار تجريبي: سند صرف", body: "كده هيوصلك التنبيه لما حد يسجّل سند صرف.", ring: ["✓", "مسجّل"], tag: "جديد", life: "تجربة", used: 100, pct: 100 },
    } as const;
    const kind = (req.body.kind ?? "soon") as keyof typeof samples;
    const s = samples[kind];
    const result = await sendToUser(
      userId(req),
      {
        kind: "test",
        tag: `test-${kind}`,
        title: s.title,
        body: s.body,
        url: "/dashboard",
        card: { k: s.k, ic: s.ic, kind: "إشعارات SanaD", who: "إشعار تجريبي", tag: s.tag, no: "SanaD", date: "الآن", ring: [...s.ring], pct: s.pct, used: s.used, life: s.life },
        actions: [{ action: "open", title: "فتح SanaD", url: "/dashboard" }],
      },
      { force: true, group: req.body.group }
    );
    if (result.sent === 0) throw ApiError.badRequest(result.skipped === "no-devices" ? "No device is subscribed yet." : `The notification could not be sent: ${result.failures?.join(" | ") || result.skipped || "unknown"}`);
    res.json({ data: result });
  })
);

export default router;
