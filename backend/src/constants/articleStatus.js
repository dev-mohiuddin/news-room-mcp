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
  // ── Wizard stage codes ──────────────────────────────────────
  STAGE_TIMEOUT: "STAGE_TIMEOUT",
  STAGE_NOT_AWAITING_APPROVAL: "STAGE_NOT_AWAITING_APPROVAL",
  STAGE_TRANSITION_INVALID: "STAGE_TRANSITION_INVALID",
  RETRY_LIMIT_EXCEEDED: "RETRY_LIMIT_EXCEEDED",
  MAX_SECTIONS_REACHED: "MAX_SECTIONS_REACHED",
  INVALID_SOURCE_URL: "INVALID_SOURCE_URL",
  RESEARCH_STAGE_ERROR: "RESEARCH_STAGE_ERROR",
  OUTLINE_STAGE_ERROR: "OUTLINE_STAGE_ERROR",
  DRAFT_STAGE_ERROR: "DRAFT_STAGE_ERROR",
  SEO_STAGE_ERROR: "SEO_STAGE_ERROR",
});

/* ──────────────────────────────────────────────────────────
 *  Wizard stage state machine — Requirement 7 (multi-step wizard)
 * ────────────────────────────────────────────────────────── */

export const STAGE_NAMES = Object.freeze([
  "research",
  "outline",
  "draft",
  "seo",
  "publish",
]);

export const STAGE_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  AWAITING_APPROVAL: "awaiting_approval",
  APPROVED: "approved",
  FAILED: "failed",
  SKIPPED: "skipped",
});

export const STAGE_STATUS_VALUES = Object.freeze(Object.values(STAGE_STATUS));

/**
 * Map<fromStageStatus, Set<toStageStatus>>.
 * Every transition not listed throws STAGE_TRANSITION_INVALID.
 */
export const ALLOWED_STAGE_TRANSITIONS = Object.freeze({
  [STAGE_STATUS.PENDING]: new Set([STAGE_STATUS.RUNNING, STAGE_STATUS.SKIPPED]),
  [STAGE_STATUS.RUNNING]: new Set([
    STAGE_STATUS.AWAITING_APPROVAL,
    STAGE_STATUS.FAILED,
  ]),
  [STAGE_STATUS.AWAITING_APPROVAL]: new Set([STAGE_STATUS.APPROVED]),
  [STAGE_STATUS.APPROVED]: new Set([STAGE_STATUS.RUNNING]),
  [STAGE_STATUS.FAILED]: new Set([STAGE_STATUS.RUNNING]),
  [STAGE_STATUS.SKIPPED]: new Set([STAGE_STATUS.RUNNING]),
});

export const isValidStageTransition = (from, to) => {
  const allowed = ALLOWED_STAGE_TRANSITIONS[from];
  return allowed instanceof Set && allowed.has(to);
};

export const STAGE_RETRY_LIMIT = 3;

/**
 * Per-stage wall-clock timeout budgets in milliseconds — Requirement 13.5.
 */
export const STAGE_TIMEOUT_MS = Object.freeze({
  research: 240_000,
  outline: 60_000,
  draft: 480_000,
  seo: 90_000,
});
