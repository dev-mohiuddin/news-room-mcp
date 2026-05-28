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
 *
 *  ─── Graceful degradation ───
 *  In dev environments where Redis isn't running, this module
 *  used to spam the logs forever and eventually crash the app
 *  with `MaxRetriesPerRequestError`. Now:
 *
 *   1. `REDIS_DISABLED=true` env flag — short-circuits everything.
 *      Callers must check `isRedisAvailable()` and degrade.
 *   2. Bounded retry: the retry strategy gives up after ~30 s
 *      and flips the global "down" flag instead of looping forever.
 *   3. `enableOfflineQueue: true` (ioredis default) — commands issued
 *      before the TCP connection is open are queued and flushed once
 *      the socket is writeable. This is REQUIRED for the Socket.io
 *      Redis adapter, which calls `psubscribe` synchronously on the
 *      connection immediately after construction.
 *
 *  ─── ESM import-order safety ───
 *  Env vars are read LAZILY (inside the factories) because this
 *  module is loaded by `socket/server.js`, which itself is imported
 *  before `dotenv.config()` runs in app.js / worker.js. Reading at
 *  module-evaluation time would always see `undefined`.
 */

const FAILURE_THRESHOLD = 8;          // retries before flipping the down flag
const MAX_BACKOFF_MS = 2_000;
const MAX_RETRIES = 30;               // ~30 s before BullMQ gives up

let bullConnectionSingleton = null;
let redisIsDown = false;
let envChecked = false;

const checkEnv = () => {
  if (envChecked) return;
  envChecked = true;
  if (process.env.REDIS_DISABLED === "true") {
    redisIsDown = true;
    logger.warn(
      "[redis] REDIS_DISABLED=true — Redis features disabled (sockets/queues run in single-process fallback)"
    );
  }
};

const getRedisUrlEnv = () =>
  process.env.REDIS_URL || "redis://127.0.0.1:6379";

const markDown = (reason) => {
  if (redisIsDown) return;
  redisIsDown = true;
  logger.warn("[redis] disabled — degrading gracefully", { reason });
};

const buildBaseOptions = () => ({
  /**
   * Cap reconnects so a chronically-broken Redis doesn't loop forever.
   * On the Nth failed attempt we flip the global "down" flag — which the
   * queue helpers / socket adapter check via `isRedisAvailable()`.
   */
  retryStrategy: (times) => {
    if (times >= MAX_RETRIES) return null;            // give up
    if (times === FAILURE_THRESHOLD) markDown("connection refused");
    return Math.min(times * 200, MAX_BACKOFF_MS);
  },
  /**
   * Avoid blocking the event loop on first command if Redis is slow
   * to accept the TCP handshake — connect lazily on first use.
   */
  lazyConnect: true,
  /**
   * IMPORTANT: keep ioredis's default `enableOfflineQueue: true`.
   * The Socket.io Redis adapter issues `psubscribe` synchronously the
   * moment we hand it the client; if the underlying socket isn't yet
   * writeable, ioredis must buffer the command until it is. Without
   * this the adapter throws "Stream isn't writeable and enableOfflineQueue
   * options is false" at boot and crashes the process.
   */
});

export const createBullMqConnection = () => {
  checkEnv();
  if (bullConnectionSingleton) return bullConnectionSingleton;
  if (redisIsDown) return null;

  const conn = new IORedis(getRedisUrlEnv(), {
    ...buildBaseOptions(),
    maxRetriesPerRequest: null,    // BullMQ requirement
    enableReadyCheck: false,       // BullMQ requirement
  });

  conn.on("error", (err) => {
    if (!redisIsDown) {
      logger.error("BullMQ Redis error", { message: err.message });
    }
  });
  conn.on("connect", () => {
    if (redisIsDown) {
      redisIsDown = false;
      logger.info("[redis] reconnected");
    }
    logger.info("BullMQ Redis connected", { url: redactUrl(getRedisUrlEnv()) });
  });

  conn.connect().catch((err) => {
    markDown(err.message);
  });

  bullConnectionSingleton = conn;
  return conn;
};

export const createSharedRedis = () => {
  checkEnv();
  if (redisIsDown) return null;

  const conn = new IORedis(getRedisUrlEnv(), buildBaseOptions());

  conn.on("error", (err) => {
    if (!redisIsDown) {
      logger.error("Shared Redis error", { message: err.message });
    }
  });

  conn.connect().catch((err) => {
    markDown(err.message);
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

export const getRedisUrl = () => redactUrl(getRedisUrlEnv());

/**
 * Public availability flag. Used by emailUtil + queue helpers to
 * skip Redis-bound paths in dev / Redis-down scenarios.
 */
export const isRedisAvailable = () => {
  checkEnv();
  return !redisIsDown;
};
