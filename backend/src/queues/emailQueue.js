import { Queue } from "bullmq";
import { createBullMqConnection, isRedisAvailable } from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Email Delivery Queue
 * ============================================================
 *
 *  - Queue name: `email-delivery`
 *  - Retention: keep last 200 completed, last 500 failed (dead-letter)
 *  - Retry: 5 attempts, exponential backoff 2s → 32s with jitter
 *
 *  Job data contract:
 *    {
 *      to: string,
 *      subject: string,
 *      html?: string,
 *      text?: string,
 *      meta?: { template, ... }   // optional, just for logging
 *    }
 *
 *  Use `enqueueEmail()` from emailUtil.js — it falls back to a
 *  direct send when Redis is not reachable, so single-process dev
 *  still works without a worker running.
 */

export const EMAIL_QUEUE_NAME = "email-delivery";

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2_000, // 2s, 4s, 8s, 16s, 32s — BullMQ adds jitter
  },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 }, // long retention so we can inspect dead-lettered jobs
};

let queueSingleton = null;

export const getEmailQueue = () => {
  if (queueSingleton) return queueSingleton;
  if (!isRedisAvailable()) return null;
  const connection = createBullMqConnection();
  if (!connection) return null;
  queueSingleton = new Queue(EMAIL_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  queueSingleton.on("error", (err) => {
    logger.error("[email-queue] error", { message: err.message });
  });
  return queueSingleton;
};

/**
 * Adds an email job. Throws on Redis errors so the caller can fall
 * back to a direct send (see emailUtil.enqueueEmail).
 */
export const addEmailJob = async (payload) => {
  const queue = getEmailQueue();
  if (!queue) {
    const err = new Error("Email queue unavailable (Redis not connected)");
    err.code = "QUEUE_UNAVAILABLE";
    throw err;
  }
  const job = await queue.add("send", payload, DEFAULT_JOB_OPTIONS);
  return job.id;
};

export const closeEmailQueue = async () => {
  if (!queueSingleton) return;
  try {
    await queueSingleton.close();
  } finally {
    queueSingleton = null;
  }
};
