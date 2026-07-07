import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { enforceBuildQuota } from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import { trigger, getStatus, getLogs, listForRepo } from "./build.controller.js";

const triggerSchema = z.object({
  repoId: z.number().int().positive(),
  branch: z.string().min(1).optional(),
});

export const buildRouter = Router();

buildRouter.use(requireAuth);

buildRouter.post("/", validate(triggerSchema), enforceBuildQuota, trigger);
buildRouter.get("/repo/:repoId", listForRepo);
buildRouter.get("/:id", getStatus);
buildRouter.get("/:id/logs", getLogs);
