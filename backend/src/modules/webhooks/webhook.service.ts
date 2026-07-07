import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { enqueueBuild } from "../../services/buildQueue.service.js";
import { getBuildQuotaViolation } from "../../middleware/rateLimiter.js";
import type { RepoRow } from "../../types/models.js";

export function verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }
  const expected = crypto.createHmac("sha256", env.github.webhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`);
  const actualBuf = Buffer.from(signatureHeader);
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}

interface GithubPushPayload {
  ref: string;
  after: string;
  deleted: boolean;
  repository: { id: number };
}

export class BuildQuotaExceededError extends Error {}

export async function handlePushEvent(payload: GithubPushPayload): Promise<{ buildId: string } | null> {
  if (payload.deleted) {
    return null; // branch deletion push, nothing to build
  }

  const [rows] = await pool.query<RepoRow[]>("SELECT * FROM repos WHERE github_repo_id = ?", [
    payload.repository.id,
  ]);
  const repo = rows[0];
  if (!repo) {
    return null; // webhook for a repo we no longer track
  }

  const quotaViolation = await getBuildQuotaViolation(repo.user_id);
  if (quotaViolation) {
    throw new BuildQuotaExceededError(quotaViolation);
  }

  const branch = payload.ref.replace("refs/heads/", "");
  const buildId = randomUUID();

  await pool.query(
    `INSERT INTO builds (id, repo_id, user_id, commit_sha, branch, status)
     VALUES (?, ?, ?, ?, ?, 'queued')`,
    [buildId, repo.id, repo.user_id, payload.after, branch],
  );

  await enqueueBuild(buildId);
  return { buildId };
}
