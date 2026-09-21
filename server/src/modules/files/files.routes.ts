import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { auditLog } from "@/middleware/audit";
import { upload } from "@/modules/files/files.upload";
import * as controller from "@/modules/files/files.controller";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requirePermission("files.upload"),
  upload.single("file"),
  auditLog(AuditAction.CREATE, "files"),
  controller.uploadFile
);
router.get("/", requirePermission("files.view"), controller.list);
router.get("/:id", requirePermission("files.view"), controller.getMetadata);
router.get("/:id/download", requirePermission("files.view"), auditLog(AuditAction.DOWNLOAD, "files"), controller.download);
router.delete("/:id", requirePermission("files.delete"), auditLog(AuditAction.DELETE, "files"), controller.remove);

export default router;
