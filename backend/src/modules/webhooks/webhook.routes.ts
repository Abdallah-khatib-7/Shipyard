import { Router } from "express";
import { webhookLimiter } from "../../middleware/rateLimiter.js";
import { receiveGithubWebhook } from "./webhook.controller.js";

export const webhookRouter = Router();

webhookRouter.post("/github", webhookLimiter, receiveGithubWebhook);
