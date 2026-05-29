import mongoose from "mongoose";
import { Article } from "#models/articleModel.js";
import { ARTICLE_STATUS, STAGE_STATUS } from "#constants/articleStatus.js";
import * as quotaService from "#services/billing/quotaService.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Quota Reconciliation Sweeper — Requirement 16.5
 * ============================================================
 *
 *  Runs hourly. Finds any article whose quota slot was reserved at
 *  creation time but never refunded after a non-recoverable failure.
 *  Two failure modes feed into this:
 *
 *   A. Legacy pipeline (full one-shot) flips article.status → "failed"
 *      and tries `quotaService.refund(workspaceId)` once. If that call
 *      throws (Redis blip, transient Mongo write conflict on the
 *      subscription doc), the article keeps `quotaRefunded: false` and
 *      ends up here.
 *
 *   B. Wizard pipeline calls `refundQuotaWithBackoff` (5 attempts with
 *      exponential delay). On exhaustion it leaves `quotaRefunded: false`
 *      so this sweeper can finish the job later. We also catch wizard
 *      articles where ANY stage record has `status: "failed"` AND
 *      `recoverable: false` AND the article hasn't been refunded yet.
 *
 *  De-dup: every refund call clamps usage at zero, so re-running on an
 *  already-zero counter is a safe no-op. We still flip
 *  `quotaRefunded: true` to remove the article from the next scan.
 *
 *  Set `QUOTA_RECONCILIATION_INTERVAL_MIN` to override the cadence.
 */

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SCAN_LIMIT = 100;

let timerHandle = null;

/**
 * Match candidates in either failure mode (legacy + wizard).
 *
 * Mode A (legacy):
 *   { status: "failed", quotaIncrementApplied: true, quotaRefunded: false }
 *
 * Mode B (wizard):
 *   { wizardMode: true, quotaRefunded: false,
 *     stages: { $elemMatch: { status: "failed", recoverable: false } } }
 *
 * The OR query is indexed on `(status, deletedAt)` for mode A and on
 * `(wizardMode, deletedAt)` for mode B (existing indexes).
 */
const buildQuery = () => ({
  deletedAt: null,
  quotaIncrementApplied: true,
  quotaRefunded: false,
  $or: [
    { status: ARTICLE_STATUS.FAILED },
    {
      wizardMode: true,
      stages: {
        $elemMatch: {
          status: STAGE_STATUS.FAILED,
          recoverable: false,
        },
      },
    },
  ],
});

const sweepOnce = async () => {
  if (mongoose.connection.readyState !== 1) return;

  const candidates = await Article.find(buildQuery())
    .select("_id workspaceId status wizardMode")
    .limit(SCAN_LIMIT)
    .lean()
    .exec();

  if (candidates.length === 0) return;

  logger.info("[quota-reconciliation] reconciling unrefunded articles", {
    count: candidates.length,
  });

  for (const row of candidates) {
    try {
      await quotaService.refund(row.workspaceId);
      await Article.updateOne(
        { _id: row._id },
        { $set: { quotaRefunded: true } }
      ).exec();
      logger.info("[quota-reconciliation] refunded", {
        articleId: String(row._id),
        workspaceId: String(row.workspaceId),
        mode: row.wizardMode ? "wizard" : "legacy",
      });
    } catch (err) {
      logger.warn("[quota-reconciliation] refund failed; will retry next sweep", {
        articleId: String(row._id),
        message: err.message,
      });
    }
  }
};

const intervalMsFromEnv = () => {
  const raw = parseInt(process.env.QUOTA_RECONCILIATION_INTERVAL_MIN || "", 10);
  if (Number.isFinite(raw) && raw > 0) return raw * 60 * 1000;
  return DEFAULT_INTERVAL_MS;
};

export const startQuotaReconciliationSweeper = ({
  intervalMs = intervalMsFromEnv(),
} = {}) => {
  if (timerHandle) return timerHandle;

  // Fire once shortly after boot so we recover anything pending from the
  // previous deploy.
  setTimeout(() => {
    sweepOnce().catch((err) =>
      logger.error("[quota-reconciliation] initial sweep failed", {
        message: err.message,
      })
    );
  }, 30_000);

  timerHandle = setInterval(() => {
    sweepOnce().catch((err) =>
      logger.error("[quota-reconciliation] sweep failed", {
        message: err.message,
      })
    );
  }, intervalMs);

  if (timerHandle?.unref) timerHandle.unref();

  logger.info("[quota-reconciliation] started", { intervalMs });
  return timerHandle;
};

export const stopQuotaReconciliationSweeper = () => {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
};

/* Exported for use by the manual reconciliation script. */
export const __TESTING__ = { sweepOnce, buildQuery };
