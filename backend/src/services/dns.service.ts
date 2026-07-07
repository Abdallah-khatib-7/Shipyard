import { env } from "../config/env.js";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}

async function cloudflareRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.cloudflare.apiToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json()) as CloudflareResponse<T>;
  if (!res.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare API error: ${message}`);
  }
  return body.result;
}

/**
 * S3 static website endpoint for the deployment bucket. Note: this points the
 * subdomain at the bucket root, not at a specific deployment prefix - the
 * Cloudflare API token here is scoped to DNS edits only, so per-prefix edge
 * routing (a CloudFront distribution or a Cloudflare Worker rewrite) is a
 * follow-up outside this token's scope, not implemented here.
 */
function s3WebsiteEndpoint(): string {
  return `${env.aws.s3Bucket}.s3-website-${env.aws.region}.amazonaws.com`;
}

export async function createSubdomainRecord(subdomain: string): Promise<string> {
  const result = await cloudflareRequest<{ id: string }>(`/zones/${env.cloudflare.zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name: `${subdomain}.${env.apexDomain}`,
      content: s3WebsiteEndpoint(),
      ttl: 1,
      proxied: true,
    }),
  });
  return result.id;
}

export async function deleteSubdomainRecord(recordId: string): Promise<void> {
  await cloudflareRequest<{ id: string }>(`/zones/${env.cloudflare.zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
  });
}
