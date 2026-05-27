/**
 * ============================================================
 *  worker.js — Standalone BullMQ worker process
 * ============================================================
 *
 *  Run with: `node worker.js` (or `npm run worker`)
 *
 *  Shares MongoDB with the API but does NOT host an HTTP server.
 *  Listens on Redis for `article-generation` jobs.
 */

import dotenv from "dotenv";
import { connectDatabase } from "#config/dbConnect.js";
import { logger } from "#utils/logger.js";
import { startArticleWorker } from "#workers/articleWorker.js";
import { startScheduledPublishWorker } from "#workers/scheduledPublishWorker.js";
import { startScheduledPublishSweeper, stopScheduledPublishSweeper } from "#jobs/scheduledPublishSweeper.js";
import { assertOriginalityConfig } from "#services/external/originalityProviders.js";
// Eagerly import the socket module so the Redis adapter attaches at boot.
// Without this, the worker only attaches on first emit — small jobs may
// finish before pub/sub is ready and emits silently drop.
import "#socket/server.js";

dotenv.config();

const start = async () => {
  await connectDatabase();
  try {
    assertOriginalityConfig();
  } catch (err) {
    logger.error("Originality config invalid", { message: err.message });
    process.exit(1);
  }
  const articleWorker = startArticleWorker();
  const scheduledWorker = startScheduledPublishWorker();
  startScheduledPublishSweeper();

  const shutdown = async (signal) => {
    logger.info(`Worker received ${signal}; closing…`);
    try {
      stopScheduledPublishSweeper();
      await Promise.allSettled([articleWorker.close(), scheduledWorker.close()]);
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (err) => {
    logger.error("Worker unhandled rejection", {
      message: err?.message,
      stack: err?.stack,
    });
  });
};

start().catch((err) => {
  logger.error("Worker boot failed", { message: err.message });
  process.exit(1);
});
