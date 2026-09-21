import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "@/middleware/validate";
import { requireAuth } from "@/middleware/auth";
import { ApiError } from "@/utils/apiError";
import * as controller from "@/modules/auth/auth.controller";
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
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);
router.post("/forgot-password", authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post("/verify-email", validate({ body: verifyEmailSchema }), controller.verifyEmail);
router.post("/change-password", requireAuth, validate({ body: changePasswordSchema }), controller.changePassword);

export default router;
