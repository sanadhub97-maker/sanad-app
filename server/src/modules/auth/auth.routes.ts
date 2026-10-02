import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createHash } from "node:crypto";
import { validate } from "@/middleware/validate";
import { requireAuth } from "@/middleware/auth";
import { ApiError } from "@/utils/apiError";
import * as controller from "@/modules/auth/auth.controller";
import { upload } from "@/modules/files/files.upload";
import { uploadBudget, uploadLimiter } from "@/middleware/resourceLimits";
import { z } from "zod";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@/modules/auth/auth.schemas";

const router = Router();

// Tighter limits on credential-guessing / enumeration-prone endpoints (§43).
// A custom handler is required here — express-rate-limit's default JSON body
// doesn't match our {error:{code,message}} shape, so the frontend's generic
// fallback text ("Invalid email or password") was masking the real 429,
// which is actively misleading when it fires.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooMany("Too many attempts. Please wait a few minutes and try again."));
  },
});

// No public self-registration — accounts are created by an admin via
// Users & Roles, matching this app's internal-system access model.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => createHash("sha256").update(String(req.body.email).trim().toLowerCase()).digest("hex"),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooMany("Too many attempts. Please wait a few minutes and try again.")),
});
router.post("/login", authLimiter, validate({ body: loginSchema }), accountLimiter, controller.login);
const password = z.string().min(1).max(72);
const credentialId = z.string().min(1).max(1400).regex(/^[A-Za-z0-9_-]+$/);
const responseBase = { id: credentialId, rawId: credentialId, type: z.literal("public-key"), clientExtensionResults: z.record(z.unknown()), authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional() };
const ceremonyId = z.string().length(43).regex(/^[A-Za-z0-9_-]+$/);
const clientDataJSON = z.string().min(1).max(8192);
router.get("/passkeys", requireAuth, controller.passkeyList);
router.post("/passkeys/register/options", authLimiter, requireAuth, validate({ body: z.object({ password }) }), controller.passkeyRegistrationOptions);
router.post("/passkeys/register/verify", authLimiter, requireAuth, validate({ body: z.object({ ceremonyId, name: z.string().trim().min(1).max(80), response: z.object({ ...responseBase, response: z.object({ clientDataJSON, attestationObject: z.string().min(1).max(65536), transports: z.array(z.string().max(30)).max(10).optional() }) }) }) }), controller.passkeyRegistrationVerify);
router.post("/passkeys/login/options", authLimiter, validate({ body: z.object({ rememberMe: z.boolean().default(true) }) }), controller.passkeyAuthenticationOptions);
router.post("/passkeys/login/verify", authLimiter, validate({ body: z.object({ ceremonyId, response: z.object({ ...responseBase, response: z.object({ clientDataJSON, authenticatorData: z.string().min(1).max(8192), signature: z.string().min(1).max(8192), userHandle: z.string().max(512).nullable().optional() }) }) }) }), controller.passkeyAuthenticationVerify);
router.post("/passkeys/remove", authLimiter, requireAuth, validate({ body: z.object({ id: credentialId, password }) }), controller.passkeyRemove);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);
router.post("/forgot-password", authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post("/verify-email", authLimiter, validate({ body: verifyEmailSchema }), controller.verifyEmail);
router.post("/change-password", authLimiter, requireAuth, validate({ body: changePasswordSchema }), controller.changePassword);
router.put(
  "/avatar",
  requireAuth,
  validate({ body: z.object({ avatarKey: z.string().regex(/^[a-z0-9-]{2,60}$/).nullable() }) }),
  controller.setAvatar
);
router.post("/avatar/photo", requireAuth, uploadLimiter, uploadBudget, upload.single("file"), controller.uploadAvatarPhoto);

export default router;
