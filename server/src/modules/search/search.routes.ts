import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { globalSearch } from "@/modules/search/search.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  validate({ query: z.object({ q: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    res.json({ data: await globalSearch((req.query as { q: string }).q) });
  })
);

export default router;
