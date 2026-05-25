import { logger } from "#utils/logger.js";

/**
 * Cron job registry — wire each job here so app.js boots them all at once.
 *
 * Example:
 *   import cron from "node-cron";
 *   import { runArticleScheduler } from "#jobs/articleScheduleJob.js";
 *
 *   cron.schedule("* /5 * * * *", runArticleScheduler);
 */
export const startBackgroundJobs = () => {
  logger.info("Background jobs registry — no jobs registered yet");
};
