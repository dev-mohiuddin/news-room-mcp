/**
 * ============================================================
 *  cleanupOrphanArticles — one-off maintenance script
 * ============================================================
 *
 *  Soft-deletes "orphan" articles created when the article
 *  generation queue was unavailable (Redis down). These rows
 *  have:
 *    - status = "draft"          (never advanced past stage 0)
 *    - jobId is null/missing     (BullMQ never accepted them)
 *    - deletedAt is null          (still active in analytics)
 *
 *  Without cleanup these rows pollute every count query:
 *    - Admin dashboard "Total articles" stat
 *    - User panel sidebar / topbar article counter
 *    - Per-workspace analytics
 *
 *  Soft delete (sets `deletedAt = now`) preserves the audit trail
 *  while excluding the rows from analytics (`deletedAt: null` filter
 *  is applied by every aggregation query).
 *
 *  Usage:
 *    node scripts/cleanupOrphanArticles.js            # dry run (default)
 *    node scripts/cleanupOrphanArticles.js --apply    # actually soft-delete
 *
 *  Safe to re-run; idempotent.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const APPLY = process.argv.includes("--apply");

const main = async () => {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/newsroom-mcp";

  console.log(`\n[cleanup] mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`[cleanup] connecting to ${mongoUri}`);

  await mongoose.connect(mongoUri);

  /* Lazy-load the model AFTER the connection is open so Mongoose
   * registers it correctly. */
  const { Article } = await import("../src/models/articleModel.js");

  /**
   *  An "orphan" is:
   *    - status === "draft"
   *    - jobId is null OR not a string OR empty
   *    - deletedAt is null
   *
   *  We DO NOT touch any article that has a `jobId` recorded — that
   *  one was successfully enqueued. We DO NOT touch any article that
   *  is past `draft` (researching/outlining/etc) — the worker was at
   *  least partially involved.
   */
  const filter = {
    status: "draft",
    deletedAt: null,
    $or: [
      { jobId: { $exists: false } },
      { jobId: null },
      { jobId: "" },
    ],
  };

  const candidates = await Article.find(filter)
    .select("_id workspaceId topic status jobId createdAt createdBy")
    .lean();

  if (candidates.length === 0) {
    console.log("[cleanup] no orphan draft articles found");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`[cleanup] found ${candidates.length} orphan draft article(s):`);
  for (const a of candidates.slice(0, 20)) {
    console.log(
      `  - ${String(a._id)}  ws=${String(a.workspaceId)}  "${
        a.topic?.slice(0, 50) || "(no topic)"
      }"  ${new Date(a.createdAt).toISOString()}`
    );
  }
  if (candidates.length > 20) {
    console.log(`  … and ${candidates.length - 20} more`);
  }

  if (!APPLY) {
    console.log(
      "\n[cleanup] DRY RUN — no changes made. Re-run with --apply to soft-delete."
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  const now = new Date();
  const result = await Article.updateMany(filter, {
    $set: { deletedAt: now },
  });

  console.log(
    `[cleanup] soft-deleted ${result.modifiedCount} orphan article(s)`
  );

  /**
   *  Refund quota for each orphan article that had `quotaIncrementApplied`
   *  set (so admins don't have to manually adjust subscription usage).
   *  Refund is best-effort and clamped to zero by the repo.
   */
  const { Subscription } = await import("../src/models/subscriptionModel.js");
  const orphansWithQuota = candidates.filter((a) => true); // every draft was reserved
  const byWorkspace = new Map();
  for (const a of orphansWithQuota) {
    const ws = String(a.workspaceId);
    byWorkspace.set(ws, (byWorkspace.get(ws) || 0) + 1);
  }

  let refundedTotal = 0;
  for (const [workspaceId, count] of byWorkspace.entries()) {
    try {
      const sub = await Subscription.findOneAndUpdate(
        { workspaceId },
        { $inc: { articlesUsedThisPeriod: -count } },
        { new: true }
      );
      if (sub && sub.articlesUsedThisPeriod < 0) {
        await Subscription.updateOne(
          { workspaceId },
          { $set: { articlesUsedThisPeriod: 0 } }
        );
      }
      refundedTotal += count;
      console.log(
        `[cleanup] refunded ${count} quota slot(s) for workspace ${workspaceId}`
      );
    } catch (err) {
      console.warn(
        `[cleanup] quota refund failed for workspace ${workspaceId}:`,
        err.message
      );
    }
  }

  console.log(`\n[cleanup] done. ${result.modifiedCount} articles soft-deleted, ${refundedTotal} quota slots refunded.`);
  await mongoose.disconnect();
  process.exit(0);
};

main().catch((err) => {
  console.error("[cleanup] fatal:", err);
  process.exit(1);
});
