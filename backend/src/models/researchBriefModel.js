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

/**
 * Per-source enrichment sub-document (additive, optional).
 * Populated by the Source Enrichment Service (Requirement 1) when a source
 * is selected by the user; absence on a persisted document is the canonical
 * "un-enriched" state and is a valid state for backward compatibility
 * (Requirements 6.4, 6.5).
 */
const sourceEnrichmentKeyFactSchema = new mongoose.Schema(
  {
    text: { type: String },
    citationUrl: { type: String },
  },
  { _id: false }
);

const sourceEnrichmentSchema = new mongoose.Schema(
  {
    summary: { type: String },                              // 2–3 sentences
    keyFacts: { type: [sourceEnrichmentKeyFactSchema], default: undefined },
    illustrativeSnippet: { type: String },                  // ≤ 25 words, verbatim
    suggestedAngle: { type: String },                       // 1 sentence
    enrichedAt: { type: Date },
    modelUsed: { type: String },
  },
  { _id: false }
);

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

    /* Optional, additive — populated by Source Enrichment Service (Requirement 1).
     * default: undefined ensures absence is the canonical un-enriched state. */
    enrichment: { type: sourceEnrichmentSchema, default: undefined },
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

/**
 * Brief-level aggregate enrichment sub-document (additive, optional).
 * Populated by the Source Enrichment Service after per-source enrichment
 * completes; absence is the canonical "un-enriched" state (Requirements
 * 6.4, 6.5 — no document migration needed).
 */
const briefEnrichmentSchema = new mongoose.Schema(
  {
    crossSourceContrasts: { type: [String], default: undefined },     // 0–3
    sharedThemes: { type: [String], default: undefined },             // 0–5
    coverageGaps: { type: [String], default: undefined },             // 0–3
    enrichedAt: { type: Date },
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

    /* Optional, additive — populated by Source Enrichment Service (Requirement 1).
     * default: undefined ensures absence is the canonical un-enriched state. */
    briefEnrichment: { type: briefEnrichmentSchema, default: undefined },

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
