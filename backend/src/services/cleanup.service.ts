import cron from "node-cron";
import Docker from "dockerode";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { destroyDeployment } from "../modules/deployments/deployment.service.js";
import { BUILD_LABEL_KEY } from "./buildRunner.service.js";
import type { DeploymentRow } from "../types/models.js";

const docker = new Docker();

// Grace period on top of the hard build timeout before we consider a still-present
// shipyard.build container orphaned (crash during teardown, host restart mid-build, etc).
const ORPHAN_CONTAINER_GRACE_MS = 5 * 60 * 1000;

export interface CleanupSummary {
  deploymentsRemoved: number;
  buildRowsRemoved: number;
  orphanedContainersRemoved: number;
}

export async function cleanupExpiredDeployments(): Promise<number> {
  const [rows] = await pool.query<DeploymentRow[]>(
    `SELECT * FROM deployments
     WHERE is_current = FALSE AND created_at < (NOW() - INTERVAL ? DAY)`,
    [env.build.retentionDays],
  );

  for (const deployment of rows) {
    await destroyDeployment(deployment);
  }
  return rows.length;
}

export async function cleanupOldBuildRows(): Promise<number> {
  // Only builds with no deployment still referencing them are safe to delete -
  // deployments.build_id has ON DELETE CASCADE, so removing a build that still
  // backs a live deployment would silently take the deployment down with it.
  const [result] = await pool.query(
    `DELETE b FROM builds b
     LEFT JOIN deployments d ON d.build_id = b.id
     WHERE d.id IS NULL AND b.created_at < (NOW() - INTERVAL ? DAY)`,
    [env.build.retentionDays],
  );
  return (result as { affectedRows: number }).affectedRows;
}

export async function cleanupOrphanedContainers(): Promise<number> {
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`${BUILD_LABEL_KEY}=true`] }),
  });

  const cutoffSeconds = (Date.now() - env.build.timeoutMs - ORPHAN_CONTAINER_GRACE_MS) / 1000;
  let removed = 0;

  for (const info of containers) {
    if (info.Created < cutoffSeconds) {
      await docker
        .getContainer(info.Id)
        .remove({ force: true })
        .then(() => removed++)
        .catch((err) => console.error(`Failed to remove orphaned container ${info.Id}:`, (err as Error).message));
    }
  }

  return removed;
}

export async function runCleanup(): Promise<CleanupSummary> {
  const [deploymentsRemoved, buildRowsRemoved, orphanedContainersRemoved] = await Promise.all([
    cleanupExpiredDeployments(),
    cleanupOldBuildRows(),
    cleanupOrphanedContainers(),
  ]);

  return { deploymentsRemoved, buildRowsRemoved, orphanedContainersRemoved };
}

export function scheduleCleanup(): void {
  // Hourly: orphaned containers are a live cost leak, so this shouldn't wait a full day.
  cron.schedule("0 * * * *", () => {
    runCleanup()
      .then((summary) => console.log("Scheduled cleanup:", summary))
      .catch((err) => console.error("Scheduled cleanup failed:", (err as Error).message));
  });
}
