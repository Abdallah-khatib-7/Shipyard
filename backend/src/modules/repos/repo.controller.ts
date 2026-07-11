import type { Request, Response } from "express";
import {
  listAvailableGithubRepos,
  listConnectedRepos,
  connectRepo,
  disconnectRepo,
  getRepoForUser,
  updateRepoSettings,
} from "./repo.service.js";

export async function listAvailable(req: Request, res: Response): Promise<void> {
  const repos = await listAvailableGithubRepos(req.userId!);
  res.json({ repos });
}

export async function listConnected(req: Request, res: Response): Promise<void> {
  const repos = await listConnectedRepos(req.userId!);
  res.json({ repos });
}

export async function connect(req: Request, res: Response): Promise<void> {
  const { fullName } = req.body as { fullName: string };
  try {
    const repo = await connectRepo(req.userId!, fullName);
    res.status(201).json({ repo });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const repoId = Number(req.params.id);
  const repo = await getRepoForUser(repoId, req.userId!);
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const { installCommand, buildCommand, outputDir } = req.body as {
    installCommand?: string | null;
    buildCommand?: string | null;
    outputDir?: string | null;
  };

  const updated = await updateRepoSettings(repoId, { installCommand, buildCommand, outputDir });
  res.json({ repo: updated });
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  const repoId = Number(req.params.id);
  const repo = await getRepoForUser(repoId, req.userId!);
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }
  await disconnectRepo(repoId, req.userId!);
  res.status(204).send();
}
