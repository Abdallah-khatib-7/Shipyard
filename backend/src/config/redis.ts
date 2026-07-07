import Redis from "ioredis";
import { env } from "./env.js";

/**
 * Shared Redis Cloud instance is also used by other unrelated projects.
 * BullMQ isolates its keys under `env.redis.queuePrefix` — every Queue/Worker
 * in this project MUST pass `prefix: env.redis.queuePrefix` so nothing here
 * collides with another project's keys on the same instance.
 *
 * A plain options object (not a live ioredis instance) is what's shared with
 * BullMQ: bullmq vendors its own nested ioredis version, so handing it a Redis
 * instance built from our top-level ioredis fails structural type-checking.
 */
export const redisConnectionOptions = {
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null,
};

export function createRedisConnection(): Redis {
  return new Redis(redisConnectionOptions);
}
