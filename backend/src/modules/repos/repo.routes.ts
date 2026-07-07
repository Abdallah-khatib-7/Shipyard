import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listAvailable, listConnected, connect, disconnect } from "./repo.controller.js";

const connectSchema = z.object({
  fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/, "must be in owner/repo format"),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "must be numeric"),
});

export const repoRouter = Router();

repoRouter.use(requireAuth);

repoRouter.get("/github", listAvailable);
repoRouter.get("/", listConnected);
repoRouter.post("/", validate(connectSchema), connect);
repoRouter.delete("/:id", validate(idParamSchema, "params"), disconnect);
