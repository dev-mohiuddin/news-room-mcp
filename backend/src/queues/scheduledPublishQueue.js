import { Queue, QueueEvents } from "bullmq";
import { createBullMqConnection, isRedisAvailable } from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Scheduled Publish Queue — auto-publish at scheduledAt
 * ============================================================
 *
 *  Distinct from `article-generation`:
 *   - Different concurrency (publish is I/O bound on WP, lower throughput)
 *   - Different retention
 *   - Cleaner separation of concerns
 *
 *  Job data contract:
 *    {
 *      articleId: string,
 *      workspaceId: string,
 *      cmsConnectionId: string,
 *      runAt: ISO string (informational only — BullMQ owns the timing)
 *    }
 *
 *  Reuse: `enqueueScheduledPublish({ articleId, workspaceId, cmsConnectionId, runAt })`
 *  Cancel: `cancelScheduledPublish({ jobId, articleId })`
 */

export const SCHEDULED_PUBLISH_QUEUE_NAME = "scheduled-publish";

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 30_000, // 30s, 60s, 120s
  },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 200 },
};

let queueSingleton = null;
let eventsSingleton = null;

export const getScheduledPublishQueue = () => {
  if (queueSingleton) return queueSingleton;
  if (!isRedisAvailable()) return null;
  const connection = createBullMqConnection();
  if (!connection) return null;
  queueSingleton = new Queue(SCHEDULED_PUBLISH_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  queueSingleton.on("error", (err) => {
    logger.error("[scheduled-publish] queue error", {
      queue: SCHEDULED_PUBLISH_QUEUE_NAME,
      message: err.message,
    });
  });
  return queueSingleton;
};

export const getScheduledPublishQueueEvents = () => {
  if (eventsSingleton) return eventsSingleton;
  if (!isRedisAvailable()) return null;
  const connection = createBullMqConnection();
  if (!connection) return null;
  eventsSingleton = new QueueEvents(SCHEDULED_PUBLISH_QUEUE_NAME, { connection });
  return eventsSingleton;
};

/**
 * Enqueue a delayed publish job. Returns the BullMQ job ID.
 * BullMQ accepts negative or zero delays (fires immediately) — we still
 * pass it through so the sweeper can re-enqueue overdue scheduled rows.
 */
export const enqueueScheduledPublish = async ({
  articleId,
  workspaceId,
  cmsConnectionId,
  runAt,
}) => {
  if (!articleId || !workspaceId || !cmsConnectionId) {
    throw new Error(
      "enqueueScheduledPublish requires articleId, workspaceId, cmsConnectionId"
    );
  }

  const target = new Date(runAt).getTime();
  if (Number.isNaN(target)) {
    throw new Error("enqueueScheduledPublish: invalid runAt");
  }
  const delay = Math.max(0, target - Date.now());

  const queue = getScheduledPublishQueue();
  if (!queue) {
    const err = new Error(
      "Scheduled-publish queue is unavailable. Start Redis or unset REDIS_DISABLED."
    );
    err.code = "QUEUE_UNAVAILABLE";
    err.statusCode = 503;
    throw err;
  }
  const job = await queue.add(
    "publish",
    {
      articleId: String(articleId),
      workspaceId: String(workspaceId),
      cmsConnectionId: String(cmsConnectionId),
      runAt: new Date(target).toISOString(),
    },
    { ...DEFAULT_JOB_OPTIONS, delay }
  );
  return job.id;
};

/**
 * Best-effort remove of a previously-enqueued publish job. Returns true
 * if a matching job was found and removed.
 */
export const cancelScheduledPublish = async ({ jobId, articleId }) => {
  const queue = getScheduledPublishQueue();
  if (!queue) return false;
  let job = null;
  if (jobId) job = await queue.getJob(String(jobId));
  if (!job && articleId) {
    const candidates = await queue.getJobs(
      ["waiting", "delayed", "active", "paused", "prioritized"],
      0,
      500,
      false
    );
    job = candidates.find((j) => String(j.data?.articleId) === String(articleId)) || null;
  }
  if (!job) return false;
  try {
    await job.remove();
  } catch (err) {
    logger.warn("[scheduled-publish] cancel: remove failed", {
      jobId: job.id,
      message: err.message,
    });
    return false;
  }
  return true;
};

export const closeScheduledPublishQueue = async () => {
  const promises = [];
  if (queueSingleton) promises.push(queueSingleton.close());
  if (eventsSingleton) promises.push(eventsSingleton.close());
  await Promise.allSettled(promises);
  queueSingleton = null;
  eventsSingleton = null;
};
