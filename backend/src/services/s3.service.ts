import fs from "node:fs/promises";
import path from "node:path";
import {
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type ObjectIdentifier,
} from "@aws-sdk/client-s3";
import { s3Client } from "../config/aws.js";
import { env } from "../config/env.js";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function listFilesRecursive(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath, base)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Uploads every file under `localDir` to S3 under `s3Prefix`, preserving relative paths. */
export async function uploadDirectory(localDir: string, s3Prefix: string): Promise<number> {
  const files = await listFilesRecursive(localDir);

  await Promise.all(
    files.map(async (filePath) => {
      const relativeKey = path.relative(localDir, filePath).split(path.sep).join("/");
      const body = await fs.readFile(filePath);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: env.aws.s3Bucket,
          Key: `${s3Prefix}/${relativeKey}`,
          Body: body,
          ContentType: contentTypeFor(filePath),
        }),
      );
    }),
  );

  return files.length;
}

/** Deletes every object under `s3Prefix`. Used for both deployment teardown and scheduled cleanup. */
export async function deletePrefix(s3Prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const listing = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: env.aws.s3Bucket,
        Prefix: `${s3Prefix}/`,
        ContinuationToken: continuationToken,
      }),
    );

    const objects: ObjectIdentifier[] = (listing.Contents ?? [])
      .filter((obj): obj is { Key: string } => Boolean(obj.Key))
      .map((obj) => ({ Key: obj.Key }));

    if (objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: env.aws.s3Bucket,
          Delete: { Objects: objects },
        }),
      );
      deleted += objects.length;
    }

    continuationToken = listing.NextContinuationToken;
  } while (continuationToken);

  return deleted;
}
