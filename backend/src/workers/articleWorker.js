import { Worker } from "bullmq";
import { ARTICLE_QUEUE_NAME } from "#queues/articleQueue.js";
import { createBullMqConnection } from "#config/redisConfig.js";
import { runArticlePipeline } from "#services/article/articlePipeline.js";
import { logger } from "#utils/logger.js";
import { FAILURE_REASONS } from "#constants/articleStatus.js";

/**
 * ============================================================
 *  BullMQ worker for article generation — Requirement 13
 * ============================================================
 *
 *  Started by `worker.js` in a SEPARATE Node process from the API.
 *  Sharing the MongoDB connection with the API but not the HTTP server.
 *
 *  Concurrency defaults to 5; override via env `ARTICLE_WORKER_CONCURRENCY`.
 *
 *  Per Req 15.7: refuse jobs whose data lacks workspaceId (immediate fail).
 */

const concurrency =
  parseInt(process.env.ARTICLE_WORKER_CONCURRENCY || "5", 10) || 5;

export const startArticleWorker = () => {
  const worker = new Worker(
    ARTICLE_QUEUE_NAME,
    async (job) => {
      const { articleId, workspaceId, userId } = job.data || {};
      if (!workspaceId) {
        logger.error("[worker] missing workspaceId; failing job", {
          jobId: job.id,
        });
        const err = new Error(FAILURE_REASONS.MISSING_WORKSPACE_ID);
        err.code = FAILURE_REASONS.MISSING_WORKSPACE_ID;
        throw err;
      }
      if (!articleId || !userId) {
        const err = new Error("Job data is missing articleId or userId");
        err.code = "INVALID_JOB_DATA";
        throw err;
      }

      logger.info("[worker] processing job", {
        jobId: job.id,
        articleId,
        workspaceId,
      });

      const result = await runArticlePipeline({
        articleId,
        workspaceId,
        userId,
      });
      return result;
    },
    {
      connection: createBullMqConnection(),
      concurrency,
    }
  );

  worker.on("ready", () => {
    logger.info("[worker] ready", { queue: ARTICLE_QUEUE_NAME, concurrency });
  });

  worker.on("active", (job) => {
    logger.debug("[worker] active", { jobId: job.id });
  });

  worker.on("completed", (job, result) => {
    logger.info("[worker] completed", { jobId: job.id, result });
  });

  worker.on("failed", (job, err) => {
    logger.error("[worker] failed", {
      jobId: job?.id,
      message: err?.message,
      code: err?.code,
    });
  });

  worker.on("error", (err) => {
    logger.error("[worker] error", { message: err.message });
  });

  return worker;
};
