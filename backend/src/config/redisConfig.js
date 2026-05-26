import IORedis from "ioredis";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Shared Redis connection factory — Requirement 13.1, 13.10
 * ============================================================
 *
 *  BullMQ requires `maxRetriesPerRequest: null` and
 *  `enableReadyCheck: false` on the underlying ioredis client.
 *  These options ARE NOT compatible with normal app usage,
 *  so we expose two separate factories:
 *
 *   - createBullMqConnection() — for BullMQ queues + workers
 *   - createSharedRedis()      — for caches, rate limiters, etc.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let bullConnectionSingleton = null;

export const createBullMqConnection = () => {
  if (bullConnectionSingleton) return bullConnectionSingleton;

  const conn = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });

  conn.on("error", (err) => {
    logger.error("BullMQ Redis error", { message: err.message });
  });
  conn.on("connect", () => {
    logger.info("BullMQ Redis connected", { url: redactUrl(REDIS_URL) });
  });

  bullConnectionSingleton = conn;
  return conn;
};

export const createSharedRedis = () => {
  const conn = new IORedis(REDIS_URL, {
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  conn.on("error", (err) => {
    logger.error("Shared Redis error", { message: err.message });
  });
  return conn;
};

const redactUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url;
  }
};

export const getRedisUrl = () => redactUrl(REDIS_URL);
