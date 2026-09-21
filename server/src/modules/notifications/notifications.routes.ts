import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import * as controller from "@/modules/notifications/notifications.controller";
import { idParamSchema, listNotificationsQuerySchema } from "@/modules/notifications/notifications.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", validate({ query: listNotificationsQuerySchema }), controller.list);
router.post("/read-all", controller.markAllRead);
router.post("/:id/read", validate({ params: idParamSchema }), controller.markRead);
router.delete("/:id", validate({ params: idParamSchema }), controller.remove);

export default router;
