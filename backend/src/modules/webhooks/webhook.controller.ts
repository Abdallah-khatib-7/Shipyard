import type { Request, Response } from "express";
import { verifySignature, handlePushEvent, BuildQuotaExceededError } from "./webhook.service.js";

export async function receiveGithubWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.header("x-hub-signature-256");
  if (!req.rawBody || !verifySignature(req.rawBody, signature)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.header("x-github-event");
  if (event !== "push") {
    res.status(202).json({ message: `Ignored event type: ${event}` });
    return;
  }

  try {
    const result = await handlePushEvent(req.body);
    if (!result) {
      res.status(202).json({ message: "No build triggered" });
      return;
    }
    res.status(202).json({ message: "Build enqueued", buildId: result.buildId });
  } catch (err) {
    if (err instanceof BuildQuotaExceededError) {
      res.status(429).json({ error: err.message });
      return;
    }
    throw err;
  }
}
