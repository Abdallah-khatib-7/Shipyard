import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { getUserGithubToken } from "../auth/auth.service.js";
import { teardownDeploymentsForRepo } from "../deployments/deployment.service.js";
import type { RepoRow } from "../../types/models.js";
import type { ResultSetHeader } from "mysql2";

// @octokit/rest ships ESM-only; this project compiles to CommonJS, so it's
// loaded via dynamic import rather than a static require.
async function octokitFor(userId: number) {
  const token = await getUserGithubToken(userId);
  if (!token) {
    throw new Error("User has no stored GitHub access token");
  }
  const { Octokit } = await import("@octokit/rest");
  return new Octokit({ auth: token });
}

export interface GithubRepoSummary {
  githubRepoId: number;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  connected: boolean;
}

export async function listAvailableGithubRepos(userId: number): Promise<GithubRepoSummary[]> {
  const octokit = await octokitFor(userId);
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    affiliation: "owner,collaborator",
  });

  const [connectedRows] = await pool.query<RepoRow[]>("SELECT github_repo_id FROM repos WHERE user_id = ?", [
    userId,
  ]);
  const connectedIds = new Set(connectedRows.map((r) => r.github_repo_id));

  return repos.map((repo) => ({
    githubRepoId: repo.id,
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
    isPrivate: repo.private,
    connected: connectedIds.has(String(repo.id)),
  }));
}

export async function listConnectedRepos(userId: number): Promise<RepoRow[]> {
  const [rows] = await pool.query<RepoRow[]>(
    "SELECT * FROM repos WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  return rows;
}

export async function getRepoForUser(repoId: number, userId: number): Promise<RepoRow | null> {
  const [rows] = await pool.query<RepoRow[]>("SELECT * FROM repos WHERE id = ? AND user_id = ?", [
    repoId,
    userId,
  ]);
  return rows[0] ?? null;
}

export async function getRepoById(repoId: number): Promise<RepoRow | null> {
  const [rows] = await pool.query<RepoRow[]>("SELECT * FROM repos WHERE id = ?", [repoId]);
  return rows[0] ?? null;
}

export async function getLatestCommitSha(userId: number, fullName: string, branch: string): Promise<string> {
  const [owner, repoName] = fullName.split("/");
  const octokit = await octokitFor(userId);
  const { data } = await octokit.repos.getBranch({ owner, repo: repoName, branch });
  return data.commit.sha;
}

export async function connectRepo(userId: number, fullName: string): Promise<RepoRow> {
  const [owner, repoName] = fullName.split("/");
  if (!owner || !repoName) {
    throw new Error(`Invalid repo full name: ${fullName}`);
  }

  const octokit = await octokitFor(userId);
  const { data: repo } = await octokit.repos.get({ owner, repo: repoName });

  const webhookUrl = new URL("/webhooks/github", env.github.callbackUrl).toString();
  const { data: hook } = await octokit.repos.createWebhook({
    owner,
    repo: repoName,
    config: {
      url: webhookUrl,
      content_type: "json",
      secret: env.github.webhookSecret,
    },
    events: ["push"],
  });

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO repos (user_id, github_repo_id, full_name, default_branch, is_private, webhook_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, repo.id, repo.full_name, repo.default_branch, repo.private, hook.id],
  );

  const created = await getRepoForUser(result.insertId, userId);
  if (!created) {
    throw new Error("Failed to load repo after connecting");
  }
  return created;
}

export interface RepoSettingsUpdate {
  installCommand?: string | null;
  buildCommand?: string | null;
  outputDir?: string | null;
}

export async function updateRepoSettings(repoId: number, updates: RepoSettingsUpdate): Promise<RepoRow> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.installCommand !== undefined) {
    sets.push("install_command = ?");
    values.push(updates.installCommand);
  }
  if (updates.buildCommand !== undefined) {
    sets.push("build_command = ?");
    values.push(updates.buildCommand);
  }
  if (updates.outputDir !== undefined) {
    sets.push("output_dir = ?");
    values.push(updates.outputDir);
  }

  if (sets.length > 0) {
    values.push(repoId);
    await pool.query(`UPDATE repos SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  const updated = await getRepoById(repoId);
  if (!updated) {
    throw new Error("Repo not found after update");
  }
  return updated;
}

export async function disconnectRepo(repoId: number, userId: number): Promise<void> {
  const repo = await getRepoForUser(repoId, userId);
  if (!repo) {
    throw new Error("Repo not found");
  }

  await teardownDeploymentsForRepo(repo.id);

  if (repo.webhook_id) {
    const [owner, repoName] = repo.full_name.split("/");
    try {
      const octokit = await octokitFor(userId);
      await octokit.repos.deleteWebhook({ owner, repo: repoName, hook_id: Number(repo.webhook_id) });
    } catch (err) {
      // Webhook may already be gone (repo deleted/renamed upstream) - don't block disconnect on it.
      console.warn(`Failed to remove GitHub webhook for ${repo.full_name}:`, (err as Error).message);
    }
  }

  await pool.query("DELETE FROM repos WHERE id = ?", [repoId]);
}
