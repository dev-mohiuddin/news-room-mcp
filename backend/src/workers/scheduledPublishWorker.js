import { Worker } from "bullmq";
import {
  SCHEDULED_PUBLISH_QUEUE_NAME,
} from "#queues/scheduledPublishQueue.js";
import { createBullMqConnection } from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";
import { ARTICLE_STATUS } from "#constants/articleStatus.js";
import {
  findActiveArticleById,
  transitionStatus,
} from "#repositories/articleRepository.js";
import { publishArticle } from "#services/article/publishService.js";

/**
 * ============================================================
 *  Scheduled-publish worker — fires delayed publish jobs
 * ============================================================
 *
 *  Per job:
 *   1. Re-fetch the article. If status != `scheduled`, swallow as no-op
 *      (user might have unscheduled it via cancel/edit).
 *   2. CAS transition `scheduled` → `draft_ready` so publishService can
 *      claim it cleanly (its CAS guard requires draft_ready).
 *   3. Call publishArticle in `confirmAutoPublish` mode.
 *
 *  Concurrency stays low (1) to avoid hammering CMS endpoints.
 */

const concurrency = parseInt(
  process.env.SCHEDULED_PUBLISH_WORKER_CONCURRENCY || "2",
  10
);

const ACTOR_SYSTEM = {
  id: null,
  email: "system@scheduler",
  role: "system",
  permissions: ["*"], // bypass approval permission gate
};

export const startScheduledPublishWorker = () => {
  const worker = new Worker(
    SCHEDULED_PUBLISH_QUEUE_NAME,
    async (job) => {
      const { articleId, workspaceId, cmsConnectionId } = job.data || {};
      if (!articleId || !workspaceId || !cmsConnectionId) {
        const err = new Error("Job data missing fields");
        err.code = "INVALID_JOB_DATA";
        throw err;
      }

      const article = await findActiveArticleById(workspaceId, articleId);
      if (!article) {
        logger.info("[scheduled-publish] article missing — abort", {
          jobId: job.id,
          articleId,
        });
        return { skipped: true, reason: "article_missing" };
      }

      // The user may have cancelled/edited — only proceed when status is scheduled.
      if (article.status !== ARTICLE_STATUS.SCHEDULED) {
        logger.info("[scheduled-publish] article no longer scheduled", {
          jobId: job.id,
          articleId,
          status: article.status,
        });
        return { skipped: true, reason: "not_scheduled" };
      }

      // CAS hop scheduled → draft_ready so publishService can claim it.
      try {
        await transitionStatus({
          workspaceId,
          articleId,
          from: ARTICLE_STATUS.SCHEDULED,
          to: ARTICLE_STATUS.DRAFT_READY,
          reason: "scheduler:fire",
        });
      } catch (err) {
        // Race: another worker beat us to it. Drop gracefully.
        logger.warn("[scheduled-publish] CAS lost — likely racy run", {
          jobId: job.id,
          articleId,
          message: err.message,
        });
        return { skipped: true, reason: "cas_lost" };
      }

      const result = await publishArticle({
        workspaceId,
        actor: ACTOR_SYSTEM,
        articleId,
        cmsConnectionId,
        requestBody: { cmsConnectionId, confirmAutoPublish: true },
        permissions: ["*"],
        req: null,
      });

      logger.info("[scheduled-publish] published", {
        jobId: job.id,
        articleId,
        cmsPostId: result?.cmsPostId,
      });
      return result;
    },
    {
      connection: createBullMqConnection(),
      concurrency,
    }
  );

  worker.on("ready", () => {
    logger.info("[scheduled-publish] worker ready", {
      queue: SCHEDULED_PUBLISH_QUEUE_NAME,
      concurrency,
    });
  });

  worker.on("completed", (job, result) => {
    logger.info("[scheduled-publish] job completed", {
      jobId: job.id,
      result,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("[scheduled-publish] job failed", {
      jobId: job?.id,
      message: err?.message,
    });
  });

  worker.on("error", (err) => {
    logger.error("[scheduled-publish] worker error", { message: err.message });
  });

  return worker;
};
