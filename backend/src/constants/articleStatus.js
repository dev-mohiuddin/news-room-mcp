/**
 * ============================================================
 *  Article State Machine — Requirement 14
 * ============================================================
 *
 *  draft ──────► researching ───┬──► outlining ──┬──► drafting ──┬──► seo_optimizing ──► originality_checking ──┬──► draft_ready
 *                               │                │               │                                              │
 *                               ├──► failed      ├──► failed     ├──► failed                                    ├──► failed
 *                               └──► needs_revision               └──► needs_revision                            └──► needs_revision
 *
 *  draft_ready ──► scheduled / publishing
 *  scheduled  ──► publishing / draft_ready
 *  publishing ──► published / failed
 *  needs_revision ──► researching | outlining | drafting   (manual re-entry)
 *
 * `published` and `failed` are terminal.
 */

export const ARTICLE_STATUS = Object.freeze({
  DRAFT: "draft",
  RESEARCHING: "researching",
  OUTLINING: "outlining",
  DRAFTING: "drafting",
  SEO_OPTIMIZING: "seo_optimizing",
  ORIGINALITY_CHECKING: "originality_checking",
  DRAFT_READY: "draft_ready",
  SCHEDULED: "scheduled",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  FAILED: "failed",
  NEEDS_REVISION: "needs_revision",
});

export const ARTICLE_STATUS_VALUES = Object.freeze(Object.values(ARTICLE_STATUS));

export const TERMINAL_STATUSES = Object.freeze([
  ARTICLE_STATUS.PUBLISHED,
  ARTICLE_STATUS.FAILED,
]);

/**
 * Directed transition table — Requirement 14 criterion 2.
 * Map<fromStatus, Set<toStatus>>
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [ARTICLE_STATUS.DRAFT]: new Set([ARTICLE_STATUS.RESEARCHING]),
  [ARTICLE_STATUS.RESEARCHING]: new Set([
    ARTICLE_STATUS.OUTLINING,
    ARTICLE_STATUS.FAILED,
    ARTICLE_STATUS.NEEDS_REVISION,
  ]),
  [ARTICLE_STATUS.OUTLINING]: new Set([
    ARTICLE_STATUS.DRAFTING,
    ARTICLE_STATUS.FAILED,
  ]),
  [ARTICLE_STATUS.DRAFTING]: new Set([
    ARTICLE_STATUS.SEO_OPTIMIZING,
    ARTICLE_STATUS.FAILED,
    ARTICLE_STATUS.NEEDS_REVISION,
  ]),
  [ARTICLE_STATUS.SEO_OPTIMIZING]: new Set([
    ARTICLE_STATUS.ORIGINALITY_CHECKING,
    ARTICLE_STATUS.FAILED,
  ]),
  [ARTICLE_STATUS.ORIGINALITY_CHECKING]: new Set([
    ARTICLE_STATUS.DRAFT_READY,
    ARTICLE_STATUS.FAILED,
    ARTICLE_STATUS.NEEDS_REVISION,
  ]),
  [ARTICLE_STATUS.DRAFT_READY]: new Set([
    ARTICLE_STATUS.SCHEDULED,
    ARTICLE_STATUS.PUBLISHING,
  ]),
  [ARTICLE_STATUS.SCHEDULED]: new Set([
    ARTICLE_STATUS.PUBLISHING,
    ARTICLE_STATUS.DRAFT_READY,
  ]),
  [ARTICLE_STATUS.PUBLISHING]: new Set([
    ARTICLE_STATUS.PUBLISHED,
    ARTICLE_STATUS.FAILED,
  ]),
  [ARTICLE_STATUS.NEEDS_REVISION]: new Set([
    ARTICLE_STATUS.DRAFT,
    ARTICLE_STATUS.RESEARCHING,
    ARTICLE_STATUS.OUTLINING,
    ARTICLE_STATUS.DRAFTING,
  ]),
  // Terminal statuses
  [ARTICLE_STATUS.PUBLISHED]: new Set(),
  [ARTICLE_STATUS.FAILED]: new Set(),
});

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

export const isValidTransition = (from, to) => {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed instanceof Set && allowed.has(to);
};

/**
 * Stage → progress percentage for Socket.io `article:progress` events.
 * Per Requirement 13.3.
 */
export const STAGE_PROGRESS = Object.freeze({
  research: 20,
  outline: 35,
  draft: 65,
  seo: 80,
  originality: 95,
});

/**
 * Failure reason taxonomy — used to populate `Article.failureReason`.
 * Keep this list closed so the frontend can render localized strings.
 */
export const FAILURE_REASONS = Object.freeze({
  INSUFFICIENT_SOURCES: "INSUFFICIENT_SOURCES",
  OUTLINE_PARSE_FAILED: "OUTLINE_PARSE_FAILED",
  UNRESOLVED_CITATION: "UNRESOLVED_CITATION",
  INSUFFICIENT_CITATION_DENSITY: "INSUFFICIENT_CITATION_DENSITY",
  DRAFT_WORD_COUNT_VIOLATION: "DRAFT_WORD_COUNT_VIOLATION",
  NO_CITATIONS: "NO_CITATIONS",
  SEO_VALIDATION_FAILED: "SEO_VALIDATION_FAILED",
  ORIGINALITY_THRESHOLD_EXCEEDED: "ORIGINALITY_THRESHOLD_EXCEEDED",
  MISSING_CITATIONS: "MISSING_CITATIONS",
  VERBATIM_COPY_DETECTED: "VERBATIM_COPY_DETECTED",
  ORIGINALITY_RETRIES_EXHAUSTED: "ORIGINALITY_RETRIES_EXHAUSTED",
  ORIGINALITY_PROVIDER_ERROR: "ORIGINALITY_PROVIDER_ERROR",
  CMS_PUBLISH_FAILED: "CMS_PUBLISH_FAILED",
  MISSING_WORKSPACE_ID: "MISSING_WORKSPACE_ID",
  FACT_CHECK_BLOCKED: "FACT_CHECK_BLOCKED",
});
