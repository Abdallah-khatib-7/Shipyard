import { env } from "../config/env.js";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}

async function parseCloudflareResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as CloudflareResponse<T>;
  if (!res.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare API error: ${message}`);
  }
  return body.result;
}

async function cloudflareKvRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.cloudflare.kvApiToken}`,
      ...init?.headers,
    },
  });
  return parseCloudflareResponse<T>(res);
}

function kvValueUrl(subdomain: string): string {
  return `/accounts/${env.cloudflare.accountId}/storage/kv/namespaces/${env.cloudflare.kvNamespaceId}/values/${subdomain}`;
}

/**
 * Subdomain routing is handled at the edge by the shipyard-router Cloudflare Worker
 * (bound to this same KV namespace), not by per-deployment DNS records - a wildcard
 * CNAME already routes all `*.shpit.uk` traffic to the Worker, so all we need to do
 * here is keep the subdomain -> S3 prefix mapping in KV up to date.
 */
export async function registerDeploymentRoute(subdomain: string, s3Prefix: string): Promise<void> {
  await cloudflareKvRequest<unknown>(kvValueUrl(subdomain), {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: s3Prefix,
  });
}

export async function removeDeploymentRoute(subdomain: string): Promise<void> {
  await cloudflareKvRequest<unknown>(kvValueUrl(subdomain), {
    method: "DELETE",
  });
}
