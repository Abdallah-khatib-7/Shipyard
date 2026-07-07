import { randomUUID } from "node:crypto";
import { pool } from "../../config/db.js";
import { enqueueBuild } from "../../services/buildQueue.service.js";
import { getRepoForUser, getLatestCommitSha } from "../repos/repo.service.js";
import type { BuildRow } from "../../types/models.js";

export async function triggerManualBuild(userId: number, repoId: number, branchOverride?: string): Promise<string> {
  const repo = await getRepoForUser(repoId, userId);
  if (!repo) {
    throw new Error("Repo not found");
  }

  const branch = branchOverride ?? repo.default_branch;
  const commitSha = await getLatestCommitSha(userId, repo.full_name, branch);
  const buildId = randomUUID();

  await pool.query(
    `INSERT INTO builds (id, repo_id, user_id, commit_sha, branch, status) VALUES (?, ?, ?, ?, ?, 'queued')`,
    [buildId, repo.id, userId, commitSha, branch],
  );

  await enqueueBuild(buildId);
  return buildId;
}

export async function getBuildForUser(buildId: string, userId: number): Promise<BuildRow | null> {
  const [rows] = await pool.query<BuildRow[]>("SELECT * FROM builds WHERE id = ? AND user_id = ?", [
    buildId,
    userId,
  ]);
  return rows[0] ?? null;
}

export async function listBuildsForRepo(repoId: number): Promise<BuildRow[]> {
  const [rows] = await pool.query<BuildRow[]>(
    "SELECT * FROM builds WHERE repo_id = ? ORDER BY created_at DESC LIMIT 50",
    [repoId],
  );
  return rows;
}
