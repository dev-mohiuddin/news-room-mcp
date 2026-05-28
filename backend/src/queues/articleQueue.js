import { Queue, QueueEvents } from "bullmq";
import { createBullMqConnection, isRedisAvailable } from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Article Generation Queue — Requirement 13
 * ============================================================
 *
 *  - Queue name: `article-generation`
 *  - Default concurrency: 5 (worker.js applies it on Worker())
 *  - Retention: keep last 100 completed, last 200 failed
 *  - Retry: 2 attempts, exponential backoff 5s → 25s
 *
 *  Job data contract:
 *    {
 *      articleId: string (ObjectId),
 *      workspaceId: string (ObjectId),  ← required (Requirement 15.7)
 *      userId: string (ObjectId),
 *      jobId: string (Mongo-side reference)
 *    }
 */

export const ARTICLE_QUEUE_NAME = "article-generation";

const DEFAULT_JOB_OPTIONS = {
  attempts: 2,
  backoff: {
    type: "exponential",
    delay: 5_000, // BullMQ caps the exponential at this base × 2^(attempt-1) ⇒ 5s, 10s … with jitter
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

let queueSingleton = null;
let eventsSingleton = null;

export const getArticleQueue = () => {
  if (queueSingleton) return queueSingleton;
  if (!isRedisAvailable()) return null;

  const connection = createBullMqConnection();
  if (!connection) return null;

  queueSingleton = new Queue(ARTICLE_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  queueSingleton.on("error", (err) => {
    logger.error("BullMQ queue error", {
      queue: ARTICLE_QUEUE_NAME,
      message: err.message,
    });
  });

  return queueSingleton;
};

export const getArticleQueueEvents = () => {
  if (eventsSingleton) return eventsSingleton;
  if (!isRedisAvailable()) return null;
  const connection = createBullMqConnection();
  if (!connection) return null;
  eventsSingleton = new QueueEvents(ARTICLE_QUEUE_NAME, { connection });
  return eventsSingleton;
};

/**
 * Enqueue a generation job. Returns the BullMQ job ID.
 */
export const enqueueArticleGeneration = async ({
  articleId,
  workspaceId,
  userId,
}) => {
  if (!articleId || !workspaceId || !userId) {
    throw new Error(
      "enqueueArticleGeneration requires articleId, workspaceId, userId"
    );
  }
  const queue = getArticleQueue();
  if (!queue) {
    /* Redis offline — surface a structured error so the controller
     * can return 503 with a stable code instead of crashing. */
    const err = new Error(
      "Article generation queue is unavailable. Start Redis or unset REDIS_DISABLED."
    );
    err.code = "QUEUE_UNAVAILABLE";
    err.statusCode = 503;
    throw err;
  }
  const job = await queue.add(
    "generate",
    { articleId: String(articleId), workspaceId: String(workspaceId), userId: String(userId) },
    DEFAULT_JOB_OPTIONS
  );
  return job.id;
};

export const closeArticleQueue = async () => {
  const promises = [];
  if (queueSingleton) promises.push(queueSingleton.close());
  if (eventsSingleton) promises.push(eventsSingleton.close());
  await Promise.allSettled(promises);
  queueSingleton = null;
  eventsSingleton = null;
};

/**
 * Best-effort cancel of an in-flight article generation job.
 * Returns true if a job was found and removed (or attempted), false otherwise.
 *
 * Strategy:
 *   1. If a BullMQ job id is provided, target that directly.
 *   2. Otherwise scan recent active/waiting/delayed jobs and match by articleId.
 */
export const cancelArticleGeneration = async ({ jobId, articleId }) => {
  const queue = getArticleQueue();
  if (!queue) return false;
  let job = null;

  if (jobId) {
    job = await queue.getJob(String(jobId));
  }

  if (!job && articleId) {
    const candidates = await queue.getJobs(
      ["waiting", "delayed", "active", "paused", "prioritized"],
      0,
      200,
      false
    );
    job = candidates.find((j) => String(j.data?.articleId) === String(articleId)) || null;
  }

  if (!job) return false;

  try {
    // Tries to abort an active job by removing it. BullMQ will raise the
    // worker's processing call to throw on next yield. Stages should
    // tolerate the resulting error — pipeline transitions will write `failed`.
    await job.remove();
  } catch (err) {
    logger.warn("[queue] cancelArticleGeneration: remove failed", {
      jobId: job.id,
      message: err.message,
    });
    return false;
  }
  return true;
};
