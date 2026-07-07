import type { Request, Response } from "express";
import { triggerManualBuild, getBuildForUser, listBuildsForRepo } from "./build.service.js";
import { getRepoForUser } from "../repos/repo.service.js";

export async function trigger(req: Request, res: Response): Promise<void> {
  const { repoId, branch } = req.body as { repoId: number; branch?: string };
  try {
    const buildId = await triggerManualBuild(req.userId!, repoId, branch);
    res.status(202).json({ buildId });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  const build = await getBuildForUser(String(req.params.id), req.userId!);
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }
  res.json({
    build: {
      id: build.id,
      repoId: build.repo_id,
      commitSha: build.commit_sha,
      branch: build.branch,
      status: build.status,
      errorMessage: build.error_message,
      startedAt: build.started_at,
      finishedAt: build.finished_at,
      createdAt: build.created_at,
    },
  });
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  const build = await getBuildForUser(String(req.params.id), req.userId!);
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }
  res.json({ log: build.log ?? "" });
}

export async function listForRepo(req: Request, res: Response): Promise<void> {
  const repoId = Number(req.params.repoId);
  const repo = await getRepoForUser(repoId, req.userId!);
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }
  const builds = await listBuildsForRepo(repoId);
  res.json({ builds });
}
