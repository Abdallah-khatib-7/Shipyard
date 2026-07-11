import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { Queue, Worker, type Job } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { env } from "../config/env.js";
import { pool } from "../config/db.js";
import { runBuild } from "./buildRunner.service.js";
import { uploadDirectory } from "./s3.service.js";
import { registerDeploymentRoute } from "./dns.service.js";
import { createDeployment, generateSubdomain } from "../modules/deployments/deployment.service.js";
import { getRepoById } from "../modules/repos/repo.service.js";
import { getUserGithubToken } from "../modules/auth/auth.service.js";
import { emitBuildLog, emitBuildStatus } from "./socket.service.js";
import type { BuildRow, BuildStatus } from "../types/models.js";

const QUEUE_NAME = "builds";
const JOB_NAME = "run-build";
const LOG_FLUSH_INTERVAL_MS = 2000;
// Global cap on simultaneously-running build containers, independent of per-user quota.
const WORKER_CONCURRENCY = 3;

export interface BuildJobData {
  buildId: string;
}

export const buildQueue = new Queue<BuildJobData, void, typeof JOB_NAME>(QUEUE_NAME, {
  connection: redisConnectionOptions,
  prefix: env.redis.queuePrefix,
});

export async function enqueueBuild(buildId: string): Promise<void> {
  await buildQueue.add(
    JOB_NAME,
    { buildId },
    { removeOnComplete: { count: 500 }, removeOnFail: { count: 500 } },
  );
}

// Entrypoint script prefixes unrecoverable, user-facing errors (e.g. no
// package.json found) with this marker so we can surface the specific
// message instead of a generic "exited with code N".
function extractFatalError(log: string): string | null {
  const match = log.match(/^SHIPYARD_FATAL: (.+)$/m);
  return match ? match[1] : null;
}

async function getBuildById(buildId: string): Promise<BuildRow | null> {
  const [rows] = await pool.query<BuildRow[]>("SELECT * FROM builds WHERE id = ?", [buildId]);
  return rows[0] ?? null;
}

async function updateBuildStatus(
  buildId: string,
  status: BuildStatus,
  fields: { log?: string; errorMessage?: string; started?: boolean; finished?: boolean } = {},
): Promise<void> {
  const sets: string[] = ["status = ?"];
  const values: unknown[] = [status];

  if (fields.log !== undefined) {
    sets.push("log = ?");
    values.push(fields.log);
  }
  if (fields.errorMessage !== undefined) {
    sets.push("error_message = ?");
    values.push(fields.errorMessage);
  }
  if (fields.started) {
    sets.push("started_at = NOW()");
  }
  if (fields.finished) {
    sets.push("finished_at = NOW()");
  }

  values.push(buildId);
  await pool.query(`UPDATE builds SET ${sets.join(", ")} WHERE id = ?`, values);
  emitBuildStatus(buildId, status);
}

async function processBuildJob(job: Job<BuildJobData>): Promise<void> {
  const { buildId } = job.data;
  const build = await getBuildById(buildId);
  if (!build) {
    throw new Error(`Build ${buildId} not found`);
  }

  const repo = await getRepoById(build.repo_id);
  if (!repo) {
    await updateBuildStatus(buildId, "failed", { errorMessage: "Repo no longer exists", finished: true });
    return;
  }

  const githubToken = await getUserGithubToken(build.user_id);
  if (!githubToken) {
    await updateBuildStatus(buildId, "failed", { errorMessage: "No GitHub token for user", finished: true });
    return;
  }

  await updateBuildStatus(buildId, "running", { started: true });

  let accumulatedLog = "";
  const flushInterval = setInterval(() => {
    pool.query("UPDATE builds SET log = ? WHERE id = ?", [accumulatedLog, buildId]).catch((err) => {
      console.error(`Failed to flush log for build ${buildId}:`, (err as Error).message);
    });
  }, LOG_FLUSH_INTERVAL_MS);

  try {
    const result = await runBuild(
      {
        buildId,
        repoFullName: repo.full_name,
        commitSha: build.commit_sha,
        branch: build.branch,
        githubToken,
        installCommand: repo.install_command,
        buildCommand: repo.build_command,
        outputDir: repo.output_dir,
      },
      (chunk) => {
        accumulatedLog += chunk;
        emitBuildLog(buildId, chunk);
      },
    );

    if (result.timedOut) {
      await updateBuildStatus(buildId, "timeout", {
        log: accumulatedLog,
        errorMessage: `Build exceeded ${env.build.timeoutMs}ms timeout`,
        finished: true,
      });
      return;
    }

    if (result.exitCode !== 0 || !result.outputLocalDir) {
      const fatal = extractFatalError(accumulatedLog);
      await updateBuildStatus(buildId, "failed", {
        log: accumulatedLog,
        errorMessage: fatal ?? `Build exited with code ${result.exitCode}`,
        finished: true,
      });
      return;
    }

    const subdomain = generateSubdomain(repo.full_name);
    const s3Prefix = `deployments/${buildId}`;

    await uploadDirectory(result.outputLocalDir, s3Prefix);
    await registerDeploymentRoute(subdomain, s3Prefix);
    await createDeployment({
      id: randomUUID(),
      buildId,
      repoId: repo.id,
      subdomain,
      s3Prefix,
    });

    await fs.rm(result.outputLocalDir, { recursive: true, force: true });
    await updateBuildStatus(buildId, "success", { log: accumulatedLog, finished: true });
  } catch (err) {
    await updateBuildStatus(buildId, "failed", {
      log: accumulatedLog,
      errorMessage: (err as Error).message,
      finished: true,
    });
  } finally {
    clearInterval(flushInterval);
  }
}

export function startBuildWorker(): Worker<BuildJobData, void, typeof JOB_NAME> {
  const worker = new Worker<BuildJobData, void, typeof JOB_NAME>(QUEUE_NAME, processBuildJob, {
    connection: redisConnectionOptions,
    prefix: env.redis.queuePrefix,
    concurrency: WORKER_CONCURRENCY,
  });

  worker.on("failed", (job, err) => {
    console.error(`Build job ${job?.id} failed:`, err.message);
  });

  return worker;
}
