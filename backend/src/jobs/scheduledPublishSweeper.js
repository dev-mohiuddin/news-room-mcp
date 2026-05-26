import mongoose from "mongoose";
import { Article } from "#models/articleModel.js";
import { ARTICLE_STATUS } from "#constants/articleStatus.js";
import { enqueueScheduledPublish } from "#queues/scheduledPublishQueue.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Scheduled-publish safety sweeper
 * ============================================================
 *
 *  Belt-and-braces companion to the BullMQ delayed jobs. Every N minutes:
 *
 *   1. Find every Article with status == `scheduled` AND scheduledAt <= now
 *   2. Re-enqueue a publish job (delay = 0 so it fires immediately)
 *
 *  Why the sweeper exists:
 *   - Redis can be wiped (dev) or briefly unavailable; delayed jobs vanish
 *   - A worker boot before the redis-stored job rebooted from disk
 *   - Operator manually backdates `scheduledAt`
 *
 *  De-dup: re-enqueueing creates a new BullMQ job, but the worker checks
 *  `article.status === SCHEDULED` before doing real work, so multiple jobs
 *  for the same article are safe — only the first wins the CAS.
 */

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SCAN_LIMIT = 50;

let timerHandle = null;

const sweepOnce = async () => {
  // Only run when DB is connected (avoid noise during boot)
  if (mongoose.connection.readyState !== 1) return;

  const now = new Date();
  const overdue = await Article.find({
    status: ARTICLE_STATUS.SCHEDULED,
    scheduledAt: { $lte: now },
    deletedAt: null,
  })
    .select("_id workspaceId cmsConnectionId scheduledAt")
    .limit(SCAN_LIMIT)
    .lean()
    .exec();

  if (overdue.length === 0) return;

  logger.info("[scheduler-sweeper] re-enqueueing overdue scheduled publishes", {
    count: overdue.length,
  });

  for (const row of overdue) {
    if (!row.cmsConnectionId) {
      logger.warn(
        "[scheduler-sweeper] scheduled article missing cmsConnectionId; skipping",
        { articleId: String(row._id) }
      );
      continue;
    }
    try {
      await enqueueScheduledPublish({
        articleId: row._id,
        workspaceId: row.workspaceId,
        cmsConnectionId: row.cmsConnectionId,
        runAt: row.scheduledAt || now,
      });
    } catch (err) {
      logger.error("[scheduler-sweeper] re-enqueue failed", {
        articleId: String(row._id),
        message: err.message,
      });
    }
  }
};

export const startScheduledPublishSweeper = ({
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) => {
  if (timerHandle) return timerHandle;

  // Fire once on boot so we recover any overdue rows immediately.
  setTimeout(() => {
    sweepOnce().catch((err) =>
      logger.error("[scheduler-sweeper] initial sweep failed", {
        message: err.message,
      })
    );
  }, 5_000);

  timerHandle = setInterval(() => {
    sweepOnce().catch((err) =>
      logger.error("[scheduler-sweeper] sweep failed", {
        message: err.message,
      })
    );
  }, intervalMs);

  // Don't keep the process alive solely for the sweeper.
  if (timerHandle?.unref) timerHandle.unref();

  logger.info("[scheduler-sweeper] started", { intervalMs });
  return timerHandle;
};

export const stopScheduledPublishSweeper = () => {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
};
