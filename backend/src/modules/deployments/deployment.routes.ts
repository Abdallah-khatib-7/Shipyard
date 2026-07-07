import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { listForRepo, getOne } from "./deployment.controller.js";

export const deploymentRouter = Router();

deploymentRouter.use(requireAuth);

deploymentRouter.get("/repo/:repoId", listForRepo);
deploymentRouter.get("/:id", getOne);
