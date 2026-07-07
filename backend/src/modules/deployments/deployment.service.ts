import crypto from "node:crypto";
import { pool } from "../../config/db.js";
import { deletePrefix } from "../../services/s3.service.js";
import { deleteSubdomainRecord } from "../../services/dns.service.js";
import type { DeploymentRow } from "../../types/models.js";

function slugify(repoFullName: string): string {
  return repoFullName
    .split("/")
    .pop()!
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSubdomain(repoFullName: string): string {
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${slugify(repoFullName)}-${suffix}`;
}

export interface CreateDeploymentInput {
  id: string;
  buildId: string;
  repoId: number;
  subdomain: string;
  s3Prefix: string;
  cloudflareRecordId: string;
}

export async function createDeployment(input: CreateDeploymentInput): Promise<void> {
  await pool.query("UPDATE deployments SET is_current = FALSE WHERE repo_id = ?", [input.repoId]);
  await pool.query(
    `INSERT INTO deployments (id, build_id, repo_id, subdomain, s3_prefix, cloudflare_record_id, is_current)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [input.id, input.buildId, input.repoId, input.subdomain, input.s3Prefix, input.cloudflareRecordId],
  );
}

export async function listDeploymentsForRepo(repoId: number): Promise<DeploymentRow[]> {
  const [rows] = await pool.query<DeploymentRow[]>(
    "SELECT * FROM deployments WHERE repo_id = ? ORDER BY created_at DESC",
    [repoId],
  );
  return rows;
}

export async function getDeploymentById(id: string): Promise<DeploymentRow | null> {
  const [rows] = await pool.query<DeploymentRow[]>("SELECT * FROM deployments WHERE id = ?", [id]);
  return rows[0] ?? null;
}

/** Tears down a deployment's external resources (S3 objects, DNS record) and its DB row. */
export async function destroyDeployment(deployment: DeploymentRow): Promise<void> {
  await deletePrefix(deployment.s3_prefix);
  if (deployment.cloudflare_record_id) {
    await deleteSubdomainRecord(deployment.cloudflare_record_id);
  }
  await pool.query("DELETE FROM deployments WHERE id = ?", [deployment.id]);
}

/** Used when a repo is disconnected: tears down every deployment that belongs to it. */
export async function teardownDeploymentsForRepo(repoId: number): Promise<void> {
  const deployments = await listDeploymentsForRepo(repoId);
  for (const deployment of deployments) {
    await destroyDeployment(deployment);
  }
}
