import type { Request, Response } from "express";
import { getRepoForUser } from "../repos/repo.service.js";
import { listDeploymentsForRepo, getDeploymentById } from "./deployment.service.js";
import { env } from "../../config/env.js";

export async function listForRepo(req: Request, res: Response): Promise<void> {
  const repoId = Number(req.params.repoId);
  const repo = await getRepoForUser(repoId, req.userId!);
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const deployments = await listDeploymentsForRepo(repoId);
  res.json({
    deployments: deployments.map((d) => ({
      id: d.id,
      buildId: d.build_id,
      subdomain: d.subdomain,
      url: `https://${d.subdomain}.${env.apexDomain}`,
      isCurrent: Boolean(d.is_current),
      createdAt: d.created_at,
    })),
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const deployment = await getDeploymentById(String(req.params.id));
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const repo = await getRepoForUser(deployment.repo_id, req.userId!);
  if (!repo) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  res.json({
    deployment: {
      id: deployment.id,
      buildId: deployment.build_id,
      subdomain: deployment.subdomain,
      url: `https://${deployment.subdomain}.${env.apexDomain}`,
      isCurrent: Boolean(deployment.is_current),
      createdAt: deployment.created_at,
    },
  });
}
