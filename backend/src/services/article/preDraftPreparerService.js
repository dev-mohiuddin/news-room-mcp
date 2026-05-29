import { canonicalUrl } from "#utils/textUtil.js";

/**
 * ============================================================
 *  Pre-Draft Preparer — Requirement 3
 * ============================================================
 *
 *  Pure, deterministic translator that turns the approved outline
 *  plus the enriched research brief into a per-section formatting
 *  blueprint the article-drafter persona can use to produce
 *  beautifully rendered HTML by default.
 *
 *  Contract (Requirement 3.1, 3.2, 3.3, 3.6, 3.7):
 *   - Pure function: no I/O, no Article-document writes, no LLM calls.
 *   - Input:  { outline, brief }
 *       outline — array of approved sections (the shape produced by
 *                 outlineService.runOutlineStage).
 *       brief   — the ResearchBrief whose persisted source set bounds
 *                 every emitted anchor candidate URL.
 *   - Output: array of per-section blueprint objects, one per outline
 *             section, each shaped:
 *       {
 *         headingLevel:          "<h2>" | "<h3>",
 *         expectedParagraphCount:integer in [1, 8],
 *         anchorDensity:         integer in [0, 3],
 *         listVsProse:           "prose" | "list" | "mixed",
 *         blockquote:            "none" | "opening" | "middle" | "closing",
 *         anchorCandidates:      [{ url, anchorTextHint }] (0–3 entries)
 *       }
 *
 *   On any internal exception, returns null so the caller
 *   (draftService.runDraftStage) can fall through to the legacy
 *   prompt path without crashing the stage (Requirement 3.7).
 *
 *  Non-goals:
 *   - Does NOT modify DRAFT_TOOL_INPUT_SCHEMA, validateAndShape, the
 *     persona's submit_draft tool schema, paragraph tagging rules, or
 *     citation density numeric bounds (Requirement 3.5 / Property 13).
 *   - Does NOT write to the persona Markdown file or the Article
 *     document (Requirement 3.6).
 */

/* ── Heuristic constants (kept module-local, not exported, not configurable) ── */

// Average words per paragraph used to translate estimatedWordCount → expectedParagraphCount.
// Targets a comfortable 90–150 word band; midpoint chosen to keep most sections in [3, 6].
const WORDS_PER_PARAGRAPH = 120;

// Words per anchor used to translate estimatedWordCount → anchorDensity.
// 250 words/anchor maps a 500-word section to 2 anchors and a 1000-word section to 3 (capped).
const WORDS_PER_ANCHOR = 250;

// Bounds enforced on every emitted blueprint field (Requirement 3.1, 3.2).
const PARAGRAPH_COUNT_MIN = 1;
const PARAGRAPH_COUNT_MAX = 8;
const ANCHOR_DENSITY_MIN = 0;
const ANCHOR_DENSITY_MAX = 3;
const ANCHOR_TEXT_HINT_MAX_CHARS = 60;
const ANCHOR_CANDIDATES_PER_SECTION_MAX = 3;

// Heading words that strongly suggest the section reads better as a list.
// Matched against the lowercased first token / leading phrase of the heading.
const LIST_LIKE_HEADING_TOKENS = new Set([
  "top",
  "best",
  "steps",
  "step",
  "list",
  "checklist",
  "ways",
  "tips",
  "reasons",
  "examples",
  "tools",
  "options",
  "features",
]);

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.trunc(value);
};

/**
 * Heading level — Requirement 3.1.
 *
 * Outline sections produced by outlineService.runOutlineStage today are flat,
 * so every section maps to "<h2>". We additionally honour future-friendly
 * depth signals: a section is treated as a sub-section ("<h3>") when any of
 * the following are present and indicate nesting:
 *   - section.depth      → integer ≥ 1
 *   - section.level      → integer ≥ 3 (semantic heading level: 2 ≡ h2, 3 ≡ h3)
 *   - section.headingLevel → already-set string ("<h3>" or "h3")
 *   - section.parentHeading / section.parentId → presence implies nesting
 *
 * Only "<h2>" and "<h3>" are emitted; deeper levels collapse to "<h3>".
 */
const deriveHeadingLevel = (section) => {
  if (!section || typeof section !== "object") return "<h2>";

  if (typeof section.headingLevel === "string") {
    const v = section.headingLevel.toLowerCase().replace(/[<>]/g, "");
    if (v === "h3") return "<h3>";
    if (v === "h2") return "<h2>";
  }
  if (Number.isInteger(section.level)) {
    return section.level >= 3 ? "<h3>" : "<h2>";
  }
  if (Number.isInteger(section.depth)) {
    return section.depth >= 1 ? "<h3>" : "<h2>";
  }
  if (section.parentHeading || section.parentId) {
    return "<h3>";
  }
  return "<h2>";
};

/**
 * Expected paragraph count — Requirement 3.1 (∈ [1, 8]).
 *
 * Derived from the section's estimatedWordCount (canonical signal from the
 * approved outline). Falls back to a sensible default of 3 when the field
 * is missing or non-numeric. Never returns a value outside [1, 8].
 */
const deriveParagraphCount = (section) => {
  const words = Number(section?.estimatedWordCount);
  if (!Number.isFinite(words) || words <= 0) return 3;
  const raw = Math.round(words / WORDS_PER_PARAGRAPH);
  return clamp(raw, PARAGRAPH_COUNT_MIN, PARAGRAPH_COUNT_MAX);
};

/**
 * Anchor density — Requirement 3.1 (∈ [0, 3]).
 *
 * Derived from estimatedWordCount: longer sections support more anchors
 * without crowding. A section with no estimated word count gets 1 anchor.
 */
const deriveAnchorDensity = (section) => {
  const words = Number(section?.estimatedWordCount);
  if (!Number.isFinite(words) || words <= 0) return 1;
  const raw = Math.floor(words / WORDS_PER_ANCHOR);
  return clamp(raw, ANCHOR_DENSITY_MIN, ANCHOR_DENSITY_MAX);
};

/**
 * List vs. prose preference — Requirement 3.1 (∈ {"prose","list","mixed"}).
 *
 * Determinstic rule based on the section's position and heading wording:
 *  - First or last section → "prose" (intros and closers read better as prose).
 *  - Heading starts with a list-like token (Top / Best / Steps …) → "list".
 *  - Otherwise → "mixed".
 */
const deriveListVsProse = (section, index, total) => {
  if (total >= 2 && (index === 0 || index === total - 1)) return "prose";

  const heading = String(section?.heading || "").trim().toLowerCase();
  if (heading) {
    const firstToken = heading.split(/\s+/u)[0] || "";
    if (LIST_LIKE_HEADING_TOKENS.has(firstToken)) return "list";
  }
  return "mixed";
};

/**
 * Blockquote placement — Requirement 3.1 (∈ {"none","opening","middle","closing"}).
 *
 * Reserve the opening blockquote for the first section, the closing for the
 * last, and a single middle blockquote for the section closest to the middle
 * of the article. All other sections emit "none" so the rendered draft does
 * not feel quote-heavy.
 */
const deriveBlockquote = (index, total) => {
  if (total <= 0) return "none";
  if (total === 1) return "opening";
  if (index === 0) return "opening";
  if (index === total - 1) return "closing";
  const middleIdx = Math.floor((total - 1) / 2);
  if (index === middleIdx) return "middle";
  return "none";
};

/**
 * Anchor candidate text hint — bounded to ANCHOR_TEXT_HINT_MAX_CHARS
 * (Requirement 3.2). Prefers the source's title and falls back to its URL
 * when the title is empty.
 */
const buildAnchorTextHint = (source) => {
  const raw = String(source?.title || source?.url || "").trim();
  if (!raw) return "";
  if (raw.length <= ANCHOR_TEXT_HINT_MAX_CHARS) return raw;
  return raw.slice(0, ANCHOR_TEXT_HINT_MAX_CHARS).trimEnd();
};

/**
 * Build the canonical-URL allowlist for anchor candidates — Requirement 3.2.
 *
 * Mirrors draftService.buildSourceLookup so blueprint candidates are bounded
 * by the same source set the drafter's validateAndShape will accept later.
 */
const buildEligibleSources = (brief) => {
  const seen = new Set();
  const eligible = [];
  for (const source of brief?.sources || []) {
    if (!source || source.skipReason) continue;
    if (!source.url) continue;
    const c = canonicalUrl(source.url);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    eligible.push({
      canonical: c,
      title: source.title || "",
      url: source.url,
    });
  }
  return eligible;
};

/**
 * Pick up to `density` anchor candidates from the eligible source set for a
 * given section — Requirement 3.2, 3.3.
 *
 * Selection is deterministic and per-section index-rotated so different
 * sections see different candidates first when the brief has many sources,
 * while still respecting the "0–3 per section" cap and the "URLs restricted
 * to brief sources by canonicalUrl equality" constraint. When the eligible
 * set is empty, an empty array is returned and the caller continues building
 * the rest of the blueprint (Requirement 3.3).
 */
const pickAnchorCandidates = ({ density, eligibleSources, sectionIndex }) => {
  if (!Array.isArray(eligibleSources) || eligibleSources.length === 0) return [];
  const cap = clamp(density, 0, ANCHOR_CANDIDATES_PER_SECTION_MAX);
  if (cap === 0) return [];

  const total = eligibleSources.length;
  const take = Math.min(cap, total);
  const out = [];
  for (let i = 0; i < take; i++) {
    const source = eligibleSources[(sectionIndex + i) % total];
    out.push({
      url: source.canonical,
      anchorTextHint: buildAnchorTextHint(source),
    });
  }
  return out;
};

const buildSectionBlueprint = ({
  section,
  index,
  total,
  eligibleSources,
}) => {
  const headingLevel = deriveHeadingLevel(section);
  const expectedParagraphCount = deriveParagraphCount(section);
  const anchorDensity = deriveAnchorDensity(section);
  const listVsProse = deriveListVsProse(section, index, total);
  const blockquote = deriveBlockquote(index, total);
  const anchorCandidates = pickAnchorCandidates({
    density: anchorDensity,
    eligibleSources,
    sectionIndex: index,
  });

  return {
    headingLevel,
    expectedParagraphCount,
    anchorDensity,
    listVsProse,
    blockquote,
    anchorCandidates,
  };
};

/**
 * buildDraftBlueprint — Requirement 3.1, 3.2, 3.3, 3.6, 3.7.
 *
 * Pure function. Returns an array of per-section blueprint objects, one per
 * outline section. Returns null on any internal exception so the caller can
 * fall through to the legacy prompt path (Requirement 3.7).
 */
export const buildDraftBlueprint = ({ outline, brief } = {}) => {
  try {
    if (!Array.isArray(outline) || outline.length === 0) return [];

    const eligibleSources = buildEligibleSources(brief);
    const total = outline.length;

    const blueprint = new Array(total);
    for (let i = 0; i < total; i++) {
      blueprint[i] = buildSectionBlueprint({
        section: outline[i],
        index: i,
        total,
        eligibleSources,
      });
    }
    return blueprint;
  } catch {
    return null;
  }
};

/* ============================================================
 *  composeDraftConstraintsBlock — Requirement 3.4, 7.6
 * ============================================================
 *
 *  Pure, in-memory translator from the per-section blueprint to an
 *  array of plain constraint strings ready to drop into
 *  `composeSystemPrompt(ARTICLE_DRAFTER_PERSONA, [...constraints])`.
 *
 *  Contract:
 *   - Pure function: no I/O, no fs writes, no LLM calls, no Article
 *     document writes, and crucially no mutation of the persona Markdown
 *     file on disk (Requirement 7.6). Constraints are appended at runtime
 *     by composeSystemPrompt only.
 *   - Input: the per-section blueprint array returned by
 *     `buildDraftBlueprint({ outline, brief })`.
 *   - Output: an array of strings, each either a section header line
 *     (e.g., "LAYOUT BLUEPRINT (per outline section):") or a directive
 *     describing one section's formatting expectations. Strings are safe
 *     to pass through `composeSystemPrompt`'s `lines.filter(Boolean).join("\n")`
 *     pipeline — no nested arrays, no objects.
 *   - Defensive: a null / non-array / empty blueprint returns an empty
 *     array so the caller can `[...legacyConstraints, ...block]` without
 *     breaking the legacy prompt path (Requirement 3.7 alignment).
 *
 *  Non-goals:
 *   - Does NOT touch the persona Markdown file (Requirement 7.6).
 *   - Does NOT modify DRAFT_TOOL_INPUT_SCHEMA, validateAndShape, the
 *     persona's submit_draft tool schema, paragraph tagging rules, or
 *     citation density numeric bounds (Property 13).
 *   - Does NOT call the LLM, the database, or the filesystem.
 */

const formatHeadingLevel = (headingLevel) => {
  // The blueprint uses "<h2>" / "<h3>"; surface the bare tag name so the
  // directive reads naturally inside the persona prompt.
  const raw = String(headingLevel || "").toLowerCase().replace(/[<>]/g, "");
  if (raw === "h3") return "h3";
  return "h2";
};

const formatBlockquoteDirective = (blockquote) => {
  switch (blockquote) {
    case "opening":
      return "blockquote: opening";
    case "middle":
      return "blockquote: middle";
    case "closing":
      return "blockquote: closing";
    case "none":
    default:
      return "no blockquote";
  }
};

const formatAnchorCandidatesDirective = (anchorCandidates) => {
  if (!Array.isArray(anchorCandidates) || anchorCandidates.length === 0) {
    return "no anchors available";
  }
  const parts = anchorCandidates
    .map((c) => {
      const url = String(c?.url || "").trim();
      if (!url) return "";
      const hint = String(c?.anchorTextHint || "").trim();
      return hint
        ? `${url} with hint '${hint.replace(/'/g, "\u2019")}'`
        : url;
    })
    .filter(Boolean);
  if (parts.length === 0) return "no anchors available";
  return `suggested anchors: ${parts.join("; ")}`;
};

const formatSectionLine = (section, index) => {
  const number = index + 1;
  const headingLevel = formatHeadingLevel(section?.headingLevel);
  const paragraphs = Number.isInteger(section?.expectedParagraphCount)
    ? section.expectedParagraphCount
    : 3;
  const listVsProse =
    section?.listVsProse === "list" || section?.listVsProse === "mixed"
      ? section.listVsProse
      : "prose";
  const listLabel =
    listVsProse === "list"
      ? "list-led"
      : listVsProse === "mixed"
      ? "mixed list/prose"
      : "prose-first";
  const blockquote = formatBlockquoteDirective(section?.blockquote);
  const anchorsPart = formatAnchorCandidatesDirective(section?.anchorCandidates);

  return (
    `Section ${number} (HEADING_LEVEL=${headingLevel}): ` +
    `write ${paragraphs} paragraphs, ${listLabel}, ${blockquote}, ${anchorsPart}`
  );
};

/**
 * composeDraftConstraintsBlock — Requirement 3.4, 7.6.
 *
 * Pure function. Returns an array of constraint strings.
 *
 * Example output:
 *   [
 *     "LAYOUT BLUEPRINT (per outline section):",
 *     "Section 1 (HEADING_LEVEL=h2): write 3 paragraphs, prose-first, blockquote: opening, suggested anchors: https://… with hint 'Source title'",
 *     "Section 2 (HEADING_LEVEL=h3): write 5 paragraphs, mixed list/prose, no blockquote, no anchors available",
 *     "Follow these layout cues; submit the draft through submit_draft only.",
 *   ]
 */
export const composeDraftConstraintsBlock = (blueprint) => {
  if (!Array.isArray(blueprint) || blueprint.length === 0) return [];

  const lines = ["LAYOUT BLUEPRINT (per outline section):"];
  for (let i = 0; i < blueprint.length; i++) {
    const section = blueprint[i];
    if (!section || typeof section !== "object") continue;
    lines.push(formatSectionLine(section, i));
  }

  // If the blueprint had entries but every entry was unusable, return [] so
  // the caller cleanly falls through to the legacy prompt path.
  if (lines.length === 1) return [];

  lines.push(
    "Follow these layout cues; submit the draft through submit_draft only."
  );
  return lines;
};

export default { buildDraftBlueprint, composeDraftConstraintsBlock };
