import { Queue } from "bullmq";
import { createBullMqConnection, isRedisAvailable } from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Wizard Stage Queue — Requirement 9 (Stream_Events) +
 *  Requirement 13 (per-stage performance)
 * ============================================================
 *
 *  - Queue name: `wizard-stage`
 *  - Default concurrency: 5 (overridable via WIZARD_STAGE_WORKER_CONCURRENCY)
 *  - Retention: keep last 100 completed, last 200 failed
 *  - Retry: 1 attempt — wizard retries are user-driven via the
 *    `POST /articles/:id/stages/:stage/retry` endpoint, not by BullMQ.
 *
 *  Job data contract:
 *    {
 *      articleId: string (ObjectId),
 *      workspaceId: string (ObjectId),
 *      userId: string (ObjectId),
 *      stage: "research" | "outline" | "draft" | "seo",
 *      // Optional, additive (Requirement 2.4):
 *      outlineContext?: {
 *        extraAngles: string[],
 *        suggestedLinks: { url, anchorHint }[],
 *        contrastFacts: { factA, factB, sourceUrls }[],
 *        audienceHook: string,
 *        generatedAt: string (ISO date),
 *      }
 *    }
 */

export const WIZARD_STAGE_QUEUE_NAME = "wizard-stage";

const DEFAULT_JOB_OPTIONS = {
  attempts: 1,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

let queueSingleton = null;

export const getWizardStageQueue = () => {
  if (queueSingleton) return queueSingleton;
  if (!isRedisAvailable()) return null;

  const connection = createBullMqConnection();
  if (!connection) return null;

  queueSingleton = new Queue(WIZARD_STAGE_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  queueSingleton.on("error", (err) => {
    logger.error("BullMQ wizard queue error", {
      queue: WIZARD_STAGE_QUEUE_NAME,
      message: err.message,
    });
  });

  return queueSingleton;
};

/**
 * Enqueue a single-stage wizard job. Returns the BullMQ job ID.
 *
 * Optional `outlineContext` (Requirement 2.4) — when present and the
 * stage is `"outline"`, the worker forwards it into
 * `outlineService.runOutlineStage` so the existing prompt builder
 * appends a "Recharge context" block. Absent for first-time outline
 * runs and for every other stage.
 */
export const enqueueStageJob = async ({
  articleId,
  workspaceId,
  userId,
  stage,
  outlineContext,
}) => {
  if (!articleId || !workspaceId || !userId || !stage) {
    throw new Error(
      "enqueueStageJob requires articleId, workspaceId, userId, stage"
    );
  }
  const queue = getWizardStageQueue();
  if (!queue) {
    const err = new Error(
      "Wizard stage queue is unavailable. Start Redis or unset REDIS_DISABLED."
    );
    err.code = "QUEUE_UNAVAILABLE";
    err.statusCode = 503;
    throw err;
  }
  const jobData = {
    articleId: String(articleId),
    workspaceId: String(workspaceId),
    userId: String(userId),
    stage,
  };
  if (outlineContext && typeof outlineContext === "object") {
    jobData.outlineContext = outlineContext;
  }
  const job = await queue.add(`stage:${stage}`, jobData, DEFAULT_JOB_OPTIONS);
  return job.id;
};

export const closeWizardStageQueue = async () => {
  if (queueSingleton) await queueSingleton.close().catch(() => {});
  queueSingleton = null;
};
