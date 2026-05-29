#!/usr/bin/env node
/**
 * ============================================================
 *  backfillArticleStages.js — Requirement 1.4 (lazy migration)
 * ============================================================
 *
 *  Walks every non-deleted Article whose `stages[]` field is empty
 *  and populates it from the legacy `status` + presence of stage
 *  outputs (paragraphs, outline, researchBriefId). Uses the same
 *  inference table as `wizardStageRepository.ensureStagesArray`,
 *  so re-running this script is safe — already-migrated articles
 *  are skipped at the query layer.
 *
 *  Usage:
 *    node backend/scripts/backfillArticleStages.js          # dry run
 *    node backend/scripts/backfillArticleStages.js --apply  # commit
 *
 *  Flags:
 *    --apply           Persist changes (default is dry-run).
 *    --workspace=<id>  Limit to one workspace.
 *    --batch=<n>       Process in batches of N (default 200).
 *    --max=<n>         Stop after migrating N articles (default ∞).
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "#config/dbConnect.js";
import { Article } from "#models/articleModel.js";
import {
  ensureStagesArray,
} from "#repositories/wizardStageRepository.js";
import { logger } from "#utils/logger.js";

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const workspaceArg = argv.find((a) => a.startsWith("--workspace="));
const batchArg = argv.find((a) => a.startsWith("--batch="));
const maxArg = argv.find((a) => a.startsWith("--max="));

const workspaceFilter = workspaceArg ? workspaceArg.split("=")[1] : null;
const BATCH_SIZE = batchArg ? parseInt(batchArg.split("=")[1], 10) || 200 : 200;
const MAX = maxArg ? parseInt(maxArg.split("=")[1], 10) : Infinity;

const main = async () => {
  console.log(`[backfill] mode: ${apply ? "APPLY" : "DRY RUN"}`);
  if (workspaceFilter) console.log(`[backfill] workspace filter: ${workspaceFilter}`);

  await connectDatabase();

  const baseQuery = {
    deletedAt: null,
    $or: [{ stages: { $exists: false } }, { stages: { $size: 0 } }],
  };
  if (workspaceFilter) {
    baseQuery.workspaceId = new mongoose.Types.ObjectId(workspaceFilter);
  }

  const total = await Article.countDocuments(baseQuery);
  console.log(`[backfill] candidates: ${total}`);
  if (total === 0) {
    await mongoose.connection.close();
    process.exit(0);
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  /* Cursor batch loop — avoids loading every article into memory. */
  const cursor = Article.find(baseQuery).sort({ createdAt: 1 }).cursor();

  for await (const article of cursor) {
    if (migrated + skipped >= MAX) break;
    try {
      if (apply) {
        const before = article.stages?.length || 0;
        await ensureStagesArray(article.workspaceId, article);
        const after = article.stages?.length || 0;
        if (after === 5 && before !== 5) {
          migrated++;
          if (migrated % BATCH_SIZE === 0) {
            console.log(`[backfill]   migrated ${migrated}/${total}…`);
          }
        } else {
          skipped++;
        }
      } else {
        // Dry-run: show what would happen without persisting
        const ws = article.workspaceId;
        const id = article._id;
        const status = article.status;
        const hasParagraphs = (article.paragraphs?.length || 0) > 0;
        const hasOutline = (article.outline?.length || 0) > 0;
        const hasBrief = Boolean(article.researchBriefId);
        console.log(
          `  WOULD MIGRATE  workspace=${ws} article=${id} status=${status} brief=${hasBrief} outline=${hasOutline} paragraphs=${hasParagraphs}`
        );
        migrated++;
      }
    } catch (err) {
      errors++;
      logger.warn("[backfill] article migration failed", {
        articleId: String(article._id),
        message: err.message,
      });
    }
  }

  console.log(`[backfill] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors}`);
  console.log(
    apply
      ? "[backfill] done (changes persisted)"
      : "[backfill] dry-run complete — re-run with --apply to commit"
  );

  await mongoose.connection.close();
  process.exit(errors > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
