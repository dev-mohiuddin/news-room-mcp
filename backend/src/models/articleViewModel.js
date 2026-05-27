import mongoose from "mongoose";

/**
 * ============================================================
 *  ArticleView Model — per-view event log
 * ============================================================
 *
 *  One document per accepted view tracking event. We keep this thin
 *  on purpose:
 *    - daily aggregation queries hit a small set of fields
 *    - per-view storage is bounded by anti-abuse on the write path
 *      (rate limit + same-day same-IP de-dupe)
 *
 *  TTL: keep raw events for 180 days. Aggregations roll up daily so the
 *  user-facing chart never queries old rows directly.
 */

const articleViewSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    /* Privacy-safe — we don't store full IP, just a hash */
    visitorHash: { type: String, required: true, index: true },
    referrer: {
      type: String,
      enum: [
        "organic_search",
        "direct",
        "social",
        "referral",
        "email",
        "unknown",
      ],
      default: "unknown",
      index: true,
    },
    country: { type: String, default: null, maxlength: 2 },
    userAgentBucket: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
      default: "unknown",
    },
    /* Day-bucketed ISO date (YYYY-MM-DD) so de-dupe queries are fast */
    dayKey: { type: String, required: true, index: true, maxlength: 10 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, versionKey: false }
);

/* ── Indexes ── */
articleViewSchema.index({ workspaceId: 1, createdAt: -1 });
articleViewSchema.index({ articleId: 1, createdAt: -1 });
// Anti-double-count: same visitor + same article + same day = unique row.
articleViewSchema.index(
  { articleId: 1, visitorHash: 1, dayKey: 1 },
  { unique: true, name: "view_dedupe" }
);

const retentionDays = Number(process.env.ARTICLE_VIEW_RETENTION_DAYS ?? 180);
if (retentionDays > 0) {
  articleViewSchema.index(
    { createdAt: 1 },
    {
      expireAfterSeconds: retentionDays * 24 * 60 * 60,
      name: "article_view_ttl",
    }
  );
}

export const ArticleView = mongoose.model("ArticleView", articleViewSchema);
export default ArticleView;
