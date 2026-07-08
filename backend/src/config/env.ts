import dotenv from "dotenv";

dotenv.config({ quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  frontendUrl: optional("FRONTEND_URL", "http://localhost:5173"),
  apexDomain: optional("APEX_DOMAIN", "shpit.uk"),

  db: {
    host: required("DB_HOST"),
    port: Number(optional("DB_PORT", "3306")),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
  },

  redis: {
    host: required("REDIS_HOST"),
    port: Number(required("REDIS_PORT")),
    password: required("REDIS_PASSWORD"),
    queuePrefix: required("REDIS_QUEUE_PREFIX"),
  },

  github: {
    clientId: required("GITHUB_CLIENT_ID"),
    clientSecret: required("GITHUB_CLIENT_SECRET"),
    callbackUrl: required("GITHUB_CALLBACK_URL"),
    webhookSecret: required("GITHUB_WEBHOOK_SECRET"),
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    accessTtl: optional("JWT_ACCESS_TOKEN_TTL", "15m"),
    refreshTtlDays: Number(optional("JWT_REFRESH_TOKEN_TTL_DAYS", "30")),
  },

  aws: {
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    region: required("AWS_REGION"),
    s3Bucket: required("S3_BUCKET_NAME"),
  },

  cloudflare: {
    apiToken: required("CLOUDFLARE_API_TOKEN"),
    zoneId: required("CLOUDFLARE_ZONE_ID"),
    accountId: required("CLOUDFLARE_ACCOUNT_ID"),
    kvNamespaceId: required("CLOUDFLARE_KV_NAMESPACE_ID"),
    kvApiToken: required("CLOUDFLARE_KV_API_TOKEN"),
  },

  build: {
    timeoutMs: Number(optional("BUILD_TIMEOUT_MS", "300000")),
    memoryMb: Number(optional("BUILD_MEMORY_MB", "512")),
    cpuCount: Number(optional("BUILD_CPU_COUNT", "1")),
    maxConcurrentPerUser: Number(optional("MAX_CONCURRENT_BUILDS_PER_USER", "2")),
    maxPerHourPerUser: Number(optional("MAX_BUILDS_PER_HOUR_PER_USER", "10")),
    retentionDays: Number(optional("BUILD_RETENTION_DAYS", "14")),
    dockerNetwork: optional("DOCKER_BUILD_NETWORK", "shipyard-build-net"),
    dockerImage: optional("DOCKER_BUILD_IMAGE", "shipyard-build-runner:latest"),
  },
} as const;
