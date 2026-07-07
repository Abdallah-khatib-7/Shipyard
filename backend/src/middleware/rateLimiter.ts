import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import type { RowDataPacket } from "mysql2";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// GitHub webhook deliveries come from a known set of IPs but can burst on force-pushes /
// bulk merges; this just guards against a runaway loop hammering the endpoint.
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

interface CountRow extends RowDataPacket {
  count: number;
}

/**
 * Cost protection: caps how many builds a single user can have in flight or
 * trigger per hour, since every build spends real Fargate compute minutes.
 * Shared between the authenticated manual-trigger route and the GitHub
 * webhook path (a user could otherwise bypass the quota by just pushing
 * rapidly instead of calling the API).
 */
export async function getBuildQuotaViolation(userId: number): Promise<string | null> {
  const [[activeRow]] = await pool.query<CountRow[]>(
    "SELECT COUNT(*) AS count FROM builds WHERE user_id = ? AND status IN ('queued', 'running')",
    [userId],
  );
  if (activeRow.count >= env.build.maxConcurrentPerUser) {
    return `Build quota exceeded: max ${env.build.maxConcurrentPerUser} concurrent builds per user`;
  }

  const [[hourlyRow]] = await pool.query<CountRow[]>(
    "SELECT COUNT(*) AS count FROM builds WHERE user_id = ? AND created_at > (NOW() - INTERVAL 1 HOUR)",
    [userId],
  );
  if (hourlyRow.count >= env.build.maxPerHourPerUser) {
    return `Build quota exceeded: max ${env.build.maxPerHourPerUser} builds per hour per user`;
  }

  return null;
}

/** Must run after requireAuth (needs req.userId) and before a build is enqueued. */
export async function enforceBuildQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const violation = await getBuildQuotaViolation(userId);
  if (violation) {
    res.status(429).json({ error: violation });
    return;
  }

  next();
}
