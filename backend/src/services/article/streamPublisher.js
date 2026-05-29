import { emitToWorkspace } from "#socket/server.js";
import {
  createSharedRedis,
  isRedisAvailable,
} from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Stream Publisher — Requirement 9 (Stream_Events)
 * ============================================================
 *
 *  Wraps each wizard stage with:
 *    1. `started()`            — emits `article:stage_started`
 *    2. `chunk({type, data})`  — emits `article:stage_chunk` and
 *                                  pushes onto the Redis replay buffer
 *    3. `completed({output})`  — emits `article:stage_completed`
 *    4. `failed({reason, recoverable})` — emits `article:stage_failed`
 *
 *  Why two emits + Redis push? Sockets are best-effort. If a browser
 *  reconnects mid-stream, it asks the API to replay any chunks it
 *  missed via `GET /articles/:id/stages/:stage/chunks?since=<n>`.
 *  The replay endpoint reads the same Redis list this publisher
 *  populates.
 *
 *  Buffer key:    `wizard:chunks:<articleId>:<stage>`
 *  TTL:           60 minutes (refreshed on every push)
 *  Cap:           500 most recent chunks (LTRIM)
 *  Index meaning: the LIST index IS the `chunkIndex` — chunk 0 is at
 *                 list index 0, chunk N is at list index N. We do NOT
 *                 LPOP from the front, we LTRIM the head when the cap
 *                 is exceeded. Replay queries clamp `since` to the
 *                 oldest available index and report `expired: true`
 *                 when the requested range was trimmed away.
 */

export const REDIS_TTL_S = 60 * 60;
export const REDIS_MAX_CHUNKS = 500;

const buildBufferKey = (articleId, stage) =>
  `wizard:chunks:${articleId}:${stage}`;

let lazyRedis = null;
const getRedisClient = () => {
  if (!isRedisAvailable()) return null;
  if (lazyRedis) return lazyRedis;
  try {
    lazyRedis = createSharedRedis();
    return lazyRedis;
  } catch (err) {
    logger.warn("[stream] redis client unavailable", { message: err.message });
    return null;
  }
};

/**
 * Factory — returns a per-(articleId, stage) publisher with a closed
 * `chunkIndex` counter. Re-using the same publisher across stage runs
 * is forbidden (each stage run gets its own factory call) so the
 * counter starts at 0 and the caller never has to reset it.
 */
export const createStreamPublisher = ({ articleId, stage, workspaceId }) => {
  if (!articleId || !stage || !workspaceId) {
    throw new Error("createStreamPublisher: articleId, stage, workspaceId required");
  }
  let chunkIndex = 0;
  const key = buildBufferKey(articleId, stage);

  const persistChunk = async (payload) => {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      const pipe = redis.pipeline();
      pipe.rpush(key, JSON.stringify(payload));
      pipe.ltrim(key, -REDIS_MAX_CHUNKS, -1);
      pipe.expire(key, REDIS_TTL_S);
      await pipe.exec();
    } catch (err) {
      logger.warn("[stream] chunk persist failed (continuing)", {
        articleId, stage, message: err.message,
      });
    }
  };

  const emit = (event, payload) => {
    try {
      emitToWorkspace(workspaceId, event, payload);
    } catch (err) {
      logger.warn("[stream] socket emit failed (continuing)", {
        event, message: err.message,
      });
    }
  };

  return {
    started: async ({ retryCount = 0 } = {}) => {
      const payload = {
        articleId: String(articleId),
        stage,
        retryCount,
        startedAt: new Date().toISOString(),
      };
      emit("article:stage_started", payload);
    },

    chunk: async ({ chunkType, data }) => {
      const payload = {
        articleId: String(articleId),
        stage,
        chunkIndex: chunkIndex++,
        chunkType,
        data,
        timestamp: new Date().toISOString(),
      };
      await persistChunk(payload);
      emit("article:stage_chunk", payload);
    },

    completed: async ({ output } = {}) => {
      const payload = {
        articleId: String(articleId),
        stage,
        completedAt: new Date().toISOString(),
        totalChunks: chunkIndex,
        output: output || null,
      };
      emit("article:stage_completed", payload);
    },

    failed: async ({ failureReason, recoverable, retryCount = 0 } = {}) => {
      const payload = {
        articleId: String(articleId),
        stage,
        failureReason: failureReason || "UNKNOWN",
        recoverable: Boolean(recoverable),
        retryCount,
        failedAt: new Date().toISOString(),
      };
      emit("article:stage_failed", payload);
    },

    getChunkCount: () => chunkIndex,
  };
};

/**
 * No-op publisher used by the legacy full-pipeline path so existing
 * stage services don't have to branch internally on whether they're
 * being streamed.
 */
export const noopPublisher = Object.freeze({
  started: async () => {},
  chunk: async () => {},
  completed: async () => {},
  failed: async () => {},
  getChunkCount: () => 0,
});

/**
 * Read replay chunks from Redis. Returns `{ chunks, expired }` where
 * `expired: true` means the requested `since` is older than the
 * trimmed buffer head and the client should re-fetch the article
 * snapshot via `GET /articles/:id`.
 *
 * `since` is the highest `chunkIndex` the client has already received;
 * we return chunks at indices `since + 1 .. last`.
 */
export const readChunksSince = async (articleId, stage, since) => {
  const redis = getRedisClient();
  if (!redis) return { chunks: [], expired: false };
  const key = buildBufferKey(articleId, stage);

  try {
    const len = await redis.llen(key);
    if (len === 0) return { chunks: [], expired: false };

    // LRANGE is 0-indexed against current list contents. After LTRIM,
    // the list always contains the most recent N chunks where N <= cap.
    // Each entry's `chunkIndex` field is the absolute index assigned at
    // push time, so the right way to determine "expired" is to read the
    // first entry, parse its chunkIndex, and check whether `since + 1`
    // is older than that.
    const headRaw = await redis.lindex(key, 0);
    if (!headRaw) return { chunks: [], expired: false };
    const head = safeParse(headRaw);
    const oldestIndex = head?.chunkIndex ?? 0;

    if (since + 1 < oldestIndex) {
      return { chunks: [], expired: true };
    }

    const startListIdx = (since + 1) - oldestIndex;
    if (startListIdx < 0) {
      // Shouldn't reach here given the check above, but be defensive.
      return { chunks: [], expired: true };
    }
    if (startListIdx >= len) {
      return { chunks: [], expired: false };
    }

    const raw = await redis.lrange(key, startListIdx, -1);
    const chunks = raw
      .map(safeParse)
      .filter(Boolean)
      .filter((c) => Number.isInteger(c.chunkIndex) && c.chunkIndex > since);
    return { chunks, expired: false };
  } catch (err) {
    logger.warn("[stream] readChunksSince failed", {
      articleId, stage, message: err.message,
    });
    return { chunks: [], expired: false };
  }
};

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const __TESTING__ = { buildBufferKey };
