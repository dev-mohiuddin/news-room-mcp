import { Worker } from "bullmq";
import { WIZARD_STAGE_QUEUE_NAME } from "#queues/wizardStageQueue.js";
import { createBullMqConnection } from "#config/redisConfig.js";
import { runStageJob } from "#services/article/wizardOrchestrator.js";
import { logger } from "#utils/logger.js";
import { FAILURE_REASONS, STAGE_NAMES } from "#constants/articleStatus.js";

/**
 * ============================================================
 *  Wizard Stage Worker — consumes `wizard-stage` queue
 * ============================================================
 *
 *  Started by `worker.js` alongside `startArticleWorker()`. Each job
 *  runs exactly one wizard stage (research / outline / draft / seo)
 *  via `runStageJob()`. Per-stage timeouts and approval transitions
 *  are owned by the orchestrator.
 *
 *  Concurrency defaults to 5; override via env
 *  `WIZARD_STAGE_WORKER_CONCURRENCY`.
 */

const concurrency =
  parseInt(process.env.WIZARD_STAGE_WORKER_CONCURRENCY || "5", 10) || 5;

export const startWizardStageWorker = () => {
  const worker = new Worker(
    WIZARD_STAGE_QUEUE_NAME,
    async (job) => {
      const { articleId, workspaceId, userId, stage, outlineContext } = job.data || {};
      if (!workspaceId) {
        const err = new Error(FAILURE_REASONS.MISSING_WORKSPACE_ID);
        err.code = FAILURE_REASONS.MISSING_WORKSPACE_ID;
        throw err;
      }
      if (!articleId || !userId || !stage) {
        const err = new Error("Job data is missing articleId, userId, or stage");
        err.code = "INVALID_JOB_DATA";
        throw err;
      }
      if (!STAGE_NAMES.includes(stage)) {
        const err = new Error(`Unknown stage '${stage}'`);
        err.code = FAILURE_REASONS.STAGE_TRANSITION_INVALID;
        throw err;
      }

      logger.info("[wizard-worker] processing stage", {
        jobId: job.id,
        articleId,
        workspaceId,
        stage,
      });

      const result = await runStageJob({
        articleId, workspaceId, userId, stage, outlineContext,
      });
      return result;
    },
    {
      connection: createBullMqConnection(),
      concurrency,
    }
  );

  worker.on("ready", () => {
    logger.info("[wizard-worker] ready", {
      queue: WIZARD_STAGE_QUEUE_NAME,
      concurrency,
    });
  });

  worker.on("completed", (job, result) => {
    logger.info("[wizard-worker] completed", { jobId: job.id, result });
  });

  worker.on("failed", (job, err) => {
    logger.error("[wizard-worker] failed", {
      jobId: job?.id,
      stage: job?.data?.stage,
      message: err?.message,
      code: err?.code,
    });
  });

  worker.on("error", (err) => {
    logger.error("[wizard-worker] error", { message: err.message });
  });

  return worker;
};
