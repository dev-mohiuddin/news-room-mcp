import mongoose from "mongoose";

/**
 * ============================================================
 *  ResearchBrief Model — Requirement 2
 * ============================================================
 *
 *  Linked 1:1 to an Article via Article.researchBriefId.
 *  Holds the canonical list of scraped sources used to ground the draft
 *  and the originality / citation validators.
 *
 *  Indexed by canonical URL + content hash for dedup checks.
 */

export const SCRAPER_PROVIDERS = ["firecrawl", "jina"];
export const SKIP_REASONS = [
  "paywall",
  "robots_disallowed",
  "non_english",
  "scrape_failed",
  "duplicate_url",
  "duplicate_content",
];

const sourceSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },                  // canonical
    originalUrl: { type: String, default: null },           // pre-canonical (for debugging)
    title: { type: String, default: "" },
    snippet: { type: String, default: "" },
    cleanedMarkdown: { type: String, default: "" },         // ≤ 20,000 chars
    contentHash: { type: String, required: true },          // SHA-256 of full content
    retrievedAt: { type: Date, default: () => new Date() },
    scraperProvider: { type: String, enum: SCRAPER_PROVIDERS, default: "firecrawl" },
    relevanceScore: { type: Number, default: 0 },
    skipReason: {
      type: String,
      enum: [null, ...SKIP_REASONS],
      default: null,
    },
  },
  { _id: false }
);

const briefSummaryEntrySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    citationUrls: { type: [String], default: [] },
  },
  { _id: false }
);

const researchBriefSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true,
      unique: true,
    },

    topic: { type: String, required: true },
    targetKeyword: { type: String, required: true },

    sources: { type: [sourceSchema], default: [] },
    keptSourceCount: { type: Number, default: 0 },
    skippedSourceCount: { type: Number, default: 0 },

    /* AI-generated summary brief used by outline + draft prompts */
    summaryBullets: { type: [briefSummaryEntrySchema], default: [] },

    /* Diagnostics */
    searchProvider: {
      type: String,
      enum: ["brave", "exa"],
      default: "brave",
    },
    searchDurationMs: { type: Number, default: 0 },
    scrapeDurationMs: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

researchBriefSchema.index({ workspaceId: 1, createdAt: -1 });

export const ResearchBrief = mongoose.model("ResearchBrief", researchBriefSchema);
export default ResearchBrief;
