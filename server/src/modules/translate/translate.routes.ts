import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { translateToEnglish } from "@/modules/translate/translate.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  validate({
    body: z.object({
      text: z.string().max(300),
      kind: z.enum(["text", "nationality"]).default("text"),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { text, kind } = req.body as { text: string; kind: "text" | "nationality" };
    res.json({ data: { text: await translateToEnglish(text, kind) } });
  })
);

export default router;
