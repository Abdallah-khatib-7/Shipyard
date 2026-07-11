import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import Docker from "dockerode";
import * as tar from "tar-stream";
import { env } from "../config/env.js";
import { createLogSanitizer } from "../utils/logSanitizer.js";

const docker = new Docker();

export const BUILD_LABEL_KEY = "shipyard.build";
export const BUILD_ID_LABEL_KEY = "shipyard.buildId";

const CONTAINER_OUTPUT_PATH = "/workspace/output";

export interface BuildRunnerInput {
  buildId: string;
  repoFullName: string;
  commitSha: string;
  branch: string;
  githubToken: string;
  installCommand: string | null;
  buildCommand: string | null;
  outputDir: string | null;
}

export interface BuildRunnerResult {
  exitCode: number | null;
  timedOut: boolean;
  outputLocalDir: string | null;
}

export type LogHandler = (chunk: string) => void;

async function ensureBuildNetwork(): Promise<void> {
  const networks = await docker.listNetworks({ filters: JSON.stringify({ name: [env.build.dockerNetwork] }) });
  if (networks.some((n) => n.Name === env.build.dockerNetwork)) {
    return;
  }
  // Isolated bridge network: build containers get outbound internet (git clone, npm install)
  // but no route to any other container/service on this host (MySQL, the app itself, etc).
  await docker.createNetwork({
    Name: env.build.dockerNetwork,
    Driver: "bridge",
    Internal: false,
  });
}

async function extractTar(tarStream: NodeJS.ReadableStream, destDir: string): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });
  const extract = tar.extract();

  extract.on("entry", (header, stream, next) => {
    const entryPath = path.join(destDir, header.name);
    if (header.type === "directory") {
      fs.mkdir(entryPath, { recursive: true })
        .then(() => {
          stream.resume();
          next();
        })
        .catch(next);
      return;
    }

    fs.mkdir(path.dirname(entryPath), { recursive: true })
      .then(async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk as Buffer);
        }
        await fs.writeFile(entryPath, Buffer.concat(chunks));
        next();
      })
      .catch(next);
  });

  await pipeline(tarStream, extract);
}

/**
 * Runs one build in a fresh, disposable container and destroys it afterward -
 * regardless of success, failure, or timeout. One build per container, never reused.
 */
export async function runBuild(input: BuildRunnerInput, onLog: LogHandler): Promise<BuildRunnerResult> {
  await ensureBuildNetwork();

  const cloneUrl = `https://x-access-token:${input.githubToken}@github.com/${input.repoFullName}.git`;

  const container = await docker.createContainer({
    Image: env.build.dockerImage,
    Tty: true,
    Env: [
      `REPO_URL=${cloneUrl}`,
      `COMMIT_SHA=${input.commitSha}`,
      `INSTALL_COMMAND=${input.installCommand ?? ""}`,
      `BUILD_COMMAND=${input.buildCommand ?? ""}`,
      `OUTPUT_DIR=${input.outputDir ?? "dist"}`,
    ],
    Labels: {
      [BUILD_LABEL_KEY]: "true",
      [BUILD_ID_LABEL_KEY]: input.buildId,
    },
    HostConfig: {
      Memory: env.build.memoryMb * 1024 * 1024,
      MemorySwap: env.build.memoryMb * 1024 * 1024, // disable swap: hard cap at Memory
      NanoCpus: env.build.cpuCount * 1_000_000_000,
      PidsLimit: 256,
      NetworkMode: env.build.dockerNetwork,
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      AutoRemove: false,
    },
  });

  let timedOut = false;
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const logStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const sanitizer = createLogSanitizer();
    logStream.on("data", (chunk: Buffer) => {
      const cleaned = sanitizer.push(chunk.toString("utf-8"));
      if (cleaned) onLog(cleaned);
    });
    logStream.on("end", () => {
      const cleaned = sanitizer.flush();
      if (cleaned) onLog(cleaned);
    });

    await container.start();

    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutHandle = setTimeout(() => resolve("timeout"), env.build.timeoutMs);
    });

    const waitPromise = container.wait().then((result) => ({ exitCode: result.StatusCode as number }));

    const outcome = await Promise.race([waitPromise, timeoutPromise]);

    if (outcome === "timeout") {
      timedOut = true;
      onLog(`\n[shipyard] build exceeded ${env.build.timeoutMs}ms timeout, killing container\n`);
      await container.kill().catch(() => undefined);
      await container.wait().catch(() => undefined);
      return { exitCode: null, timedOut: true, outputLocalDir: null };
    }

    const { exitCode } = outcome as { exitCode: number };

    if (exitCode !== 0) {
      return { exitCode, timedOut: false, outputLocalDir: null };
    }

    const archiveStream = await container.getArchive({ path: CONTAINER_OUTPUT_PATH });
    const outputLocalDir = path.join(os.tmpdir(), "shipyard-builds", input.buildId);
    await extractTar(archiveStream as unknown as NodeJS.ReadableStream, outputLocalDir);

    // getArchive on a directory wraps the contents in a top-level "output/" folder
    const nestedOutput = path.join(outputLocalDir, "output");
    const finalDir = (await fs.stat(nestedOutput).catch(() => null))?.isDirectory() ? nestedOutput : outputLocalDir;

    return { exitCode, timedOut: false, outputLocalDir: finalDir };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await container.remove({ force: true }).catch((err) => {
      console.error(`Failed to remove build container for ${input.buildId}:`, (err as Error).message);
    });
  }
}
