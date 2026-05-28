import { Worker } from "bullmq";
import { EMAIL_QUEUE_NAME } from "#queues/emailQueue.js";
import { createBullMqConnection } from "#config/redisConfig.js";
import { sendEmailNow } from "#utils/emailUtil.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Email worker — processes the `email-delivery` queue
 * ============================================================
 *
 *  Concurrency: default 3 (override via EMAIL_WORKER_CONCURRENCY).
 *
 *  Retry semantics are encoded on the JOB (see emailQueue.js):
 *    5 attempts, exponential backoff 2s → 32s with jitter.
 *
 *  Anything still failing after 5 attempts becomes a "dead-letter":
 *    - Persisted in BullMQ's `failed` set (retention 500)
 *    - Logged at ERROR level with full payload meta
 *    - Audit-logged as `email.dead_letter` (best effort)
 *
 *  This module is started by `worker.js`. The API process never
 *  imports it — emails enqueue from anywhere, worker process drains.
 */

const concurrency =
  parseInt(process.env.EMAIL_WORKER_CONCURRENCY || "3", 10) || 3;

const maybeAuditDeadLetter = async (job, err) => {
  /* Lazy-import to avoid pulling Mongoose into the worker boot path
   * if audit logging isn't critical to email delivery. */
  try {
    const { logAudit } = await import("#utils/auditLogger.js");
    await logAudit({
      actorEmail: "system",
      actorRole: "system",
      category: "system",
      action: "email.dead_letter",
      entityType: "email",
      status: "error",
      after: {
        to: job?.data?.to,
        subject: job?.data?.subject,
        template: job?.data?.meta?.template || null,
        attempts: job?.attemptsMade,
        message: err?.message,
      },
    });
  } catch (auditErr) {
    logger.warn("[email-worker] dead-letter audit log failed", {
      message: auditErr.message,
    });
  }
};

export const startEmailWorker = () => {
  const worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      const { to, subject, html, text } = job.data || {};
      if (!to || !subject) {
        throw new Error("email job missing to/subject");
      }
      logger.debug("[email-worker] processing", {
        jobId: job.id,
        to,
        subject,
        attempt: job.attemptsMade + 1,
      });
      const info = await sendEmailNow({ to, subject, html, text });
      return { messageId: info?.messageId };
    },
    {
      connection: createBullMqConnection(),
      concurrency,
    }
  );

  worker.on("ready", () => {
    logger.info("[email-worker] ready", {
      queue: EMAIL_QUEUE_NAME,
      concurrency,
    });
  });

  worker.on("completed", (job, result) => {
    logger.info("[email-worker] sent", {
      jobId: job.id,
      to: job.data?.to,
      subject: job.data?.subject,
      messageId: result?.messageId,
      template: job.data?.meta?.template || null,
    });
  });

  worker.on("failed", async (job, err) => {
    const exhausted = job?.attemptsMade >= (job?.opts?.attempts || 5);
    logger.warn("[email-worker] attempt failed", {
      jobId: job?.id,
      attempt: job?.attemptsMade,
      maxAttempts: job?.opts?.attempts,
      to: job?.data?.to,
      message: err?.message,
    });
    if (exhausted) {
      logger.error("[email-worker] DEAD LETTER", {
        jobId: job?.id,
        to: job?.data?.to,
        subject: job?.data?.subject,
        template: job?.data?.meta?.template || null,
        attempts: job?.attemptsMade,
        message: err?.message,
      });
      await maybeAuditDeadLetter(job, err);
    }
  });

  worker.on("error", (err) => {
    logger.error("[email-worker] error", { message: err.message });
  });

  return worker;
};
