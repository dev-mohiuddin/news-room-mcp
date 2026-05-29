import { randomUUID } from "node:crypto";
import { useTool, SONNET_MODEL } from "#services/external/anthropicClient.js";
import { sanitizeArticleHtml } from "#utils/htmlSanitizer.js";
import { canonicalUrl, htmlToPlain, wordCount } from "#utils/textUtil.js";
import {
  ARTICLE_DRAFTER_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { findActiveProfile, findProfileById } from "#repositories/brandVoiceRepository.js";
import { buildVoiceBlock } from "#services/article/brandVoiceService.js";
import {
  suggestInternalLinks,
  buildInternalLinksBlock,
} from "#services/article/internalLinkService.js";
import {
  classifyReaderPersona,
  buildAudienceBlock,
} from "#services/article/readerPersonaService.js";
import {
  buildDraftBlueprint,
  composeDraftConstraintsBlock,
} from "#services/article/preDraftPreparerService.js";
import {
  formatDraftHtml,
  DRAFT_FORMAT_VERSION,
} from "#services/article/draftFormatterService.js";
import {
  isFlagEnabled,
  HUMAN_LIKE_PIPELINE_ENABLED,
  HLP_DRAFT_FORMAT_ENABLED,
  HLP_TONE_ADAPTIVE_TEMPERATURE,
  HLP_BURSTINESS_VALIDATION_ENABLED,
  HLP_PARAGRAPH_VARIATION_ENABLED,
  HLP_ANTICLICHE_SCANNER_ENABLED,
  HLP_OPENING_DIVERSITY_ENABLED,
  HLP_DEEP_SOURCE_READ_ENABLED,
} from "#utils/featureFlags.js";
import { validateBurstiness } from "#services/article/burstinessValidator.js";
import { validateParagraphVariation } from "#services/article/paragraphVariationValidator.js";
import { scanForCliches } from "#services/article/anticlicheScanner.js";
import { validateOpeningDiversity } from "#services/article/openingPatternValidator.js";
import { logger } from "#utils/logger.js";

/**
 * Tone-adaptive sampling parameters — gated by HLP_TONE_ADAPTIVE_TEMPERATURE.
 * When the flag is OFF (default), the legacy temperature: 0.5 is used verbatim.
 */
const TONE_SAMPLING = Object.freeze({
  Professional: { temperature: 0.45 },
  Casual:       { temperature: 0.75 },
  Journalistic: { temperature: 0.65 },
  Academic:     { temperature: 0.35 },
});

const resolveSamplingParams = (tone) => {
  if (!isFlagEnabled(HLP_TONE_ADAPTIVE_TEMPERATURE)) {
    return { temperature: 0.5 };
  }
  return TONE_SAMPLING[tone] ?? { temperature: 0.5 };
};

/**
 * ============================================================
 *  Draft stage — Requirement 4
 * ============================================================
 *
 *  - Tool-use call to Sonnet returns { paragraphs: [...] }
 *  - Each paragraph: { id?, html, markdown?, tag, citations[] }
 *  - Citations must resolve to a Source.url in the brief (after canonicalization)
 *  - Sanitize HTML against allowlist; force rel="nofollow noopener" on <a>
 *  - Citation density ≥ 1 per 300 words for `factual` paragraphs
 *  - Total word count within ±15% of target
 *  - Up to 2 retries; map failure to UNRESOLVED_CITATION /
 *    INSUFFICIENT_CITATION_DENSITY / DRAFT_WORD_COUNT_VIOLATION / NO_CITATIONS
 */

export const DRAFT_PROMPT_VERSION = "v1";

const DRAFT_TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    paragraphs: {
      type: "array",
      minItems: 6,
      maxItems: 100,
      items: {
        type: "object",
        properties: {
          html: { type: "string", minLength: 1 },
          markdown: { type: "string" },
          tag: {
            type: "string",
            enum: ["factual", "intro", "transition", "opinion"],
          },
          citations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                bracketedNumeral: { type: "integer", minimum: 1 },
              },
              required: ["url"],
            },
            default: [],
          },
        },
        required: ["html", "tag"],
      },
    },
  },
  required: ["paragraphs"],
};

const buildPrompt = ({ topic, targetKeyword, tone, targetWordCount, outline, brief, retryHint }) => {
  const sources = (brief?.sources || [])
    .filter((s) => !s.skipReason)
    .map(
      (s, i) => {
        const deepReadEnabled = isFlagEnabled(HLP_DEEP_SOURCE_READ_ENABLED);
        const excerptLimit = (deepReadEnabled && i < 3) ? 5000 : 2500;
        return `[${i + 1}] ${s.title || s.url}\n${s.url}\nExcerpt:\n${(s.cleanedMarkdown || "").slice(0, excerptLimit)}`;
      }
    )
    .join("\n\n");

  const outlineBlock = outline
    .map(
      (sec, i) =>
        `${i + 1}. ${sec.heading} (~${sec.estimatedWordCount} words)\n` +
        sec.subPoints.map((p) => `   - ${p}`).join("\n")
    )
    .join("\n\n");

  return [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    `Writing tone: ${tone}`,
    `Target word count: ${targetWordCount}`,
    "",
    "Outline:",
    outlineBlock,
    "",
    "Available sources (cite ONLY these by URL):",
    sources,
    "",
    "Write the article as an ordered paragraph array.",
    "Rules:",
    "- Output ONLY through the submit_draft tool.",
    "- Every factual claim must be supported by an inline citation. Each `paragraph.citations[]` entry must contain a `url` whose value is exactly one of the source URLs above (copy the URL line, not the bracket number).",
    "- Each `factual` paragraph MUST include at least one entry in its `citations` array. Empty `citations` arrays on factual paragraphs will be rejected.",
    "- For each paragraph, set `tag` to one of: 'intro', 'transition', 'opinion', 'factual'. Use 'factual' whenever you cite or state factual claims.",
    "- Citation density: at least 1 citation per ~300 words within `factual` paragraphs. A 600-word factual paragraph needs at least 2 citations.",
    "- Use only `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<strong>`, `<em>`, `<a>`, `<code>` tags.",
    "- DO NOT copy more than 11 consecutive words verbatim from any source — paraphrase.",
    retryHint ? `\nRetry hint from validator: ${retryHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildSourceLookup = (brief) => {
  const map = new Map();
  for (const s of brief?.sources || []) {
    if (s.skipReason) continue;
    map.set(canonicalUrl(s.url), s);
  }
  return map;
};

const validateAndShape = ({ paragraphs, sourceLookup, targetWordCount }) => {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return { ok: false, reason: "empty_paragraphs" };
  }

  const sourcesIndex = []; // [{ url, numeral }]
  const numeralOf = (url) => {
    const c = canonicalUrl(url);
    const found = sourcesIndex.find((entry) => entry.url === c);
    if (found) return found.numeral;
    const numeral = sourcesIndex.length + 1;
    sourcesIndex.push({ url: c, numeral });
    return numeral;
  };

  const shaped = [];
  let totalWords = 0;
  let totalCitations = 0;

  for (const p of paragraphs) {
    if (!p?.html || !p?.tag) {
      return { ok: false, reason: "missing_required_paragraph_fields" };
    }
    const cleanHtml = sanitizeArticleHtml(p.html);
    const plain = htmlToPlain(cleanHtml);
    const w = wordCount(plain);
    totalWords += w;

    // Resolve citations: must match a brief source URL.
    const validatedCitations = [];
    for (const c of p.citations || []) {
      if (!c?.url) continue;
      const c_url = canonicalUrl(c.url);
      if (!sourceLookup.has(c_url)) {
        return { ok: false, reason: "unresolved_citation", url: c.url };
      }
      validatedCitations.push({
        url: c_url,
        bracketedNumeral: numeralOf(c_url),
      });
    }
    totalCitations += validatedCitations.length;

    // Citation density check for factual paragraphs.
    if (p.tag === "factual") {
      // ≥ 1 per 300 words
      const requiredCount = Math.max(1, Math.ceil(w / 300));
      if (validatedCitations.length < requiredCount && w >= 30) {
        return {
          ok: false,
          reason: "citation_density",
          paragraphWords: w,
          requiredCount,
          provided: validatedCitations.length,
        };
      }
    }

    shaped.push({
      id: p.id || randomUUID(),
      html: cleanHtml,
      markdown: p.markdown || "",
      tag: p.tag,
      citations: validatedCitations,
      wordCount: w,
    });
  }

  if (totalCitations === 0) {
    return { ok: false, reason: "no_citations" };
  }

  const lower = targetWordCount * 0.80;
  const upper = targetWordCount * 1.20;
  if (totalWords < lower || totalWords > upper) {
    return {
      ok: false,
      reason: "word_count_drift",
      totalWords,
      lower,
      upper,
    };
  }

  return {
    ok: true,
    paragraphs: shaped,
    sourcesIndex,
    totalWords,
  };
};

const validatorReasonToErrorCode = (reason) => {
  switch (reason) {
    case "no_citations":
      return "NO_CITATIONS";
    case "unresolved_citation":
      return "UNRESOLVED_CITATION";
    case "citation_density":
      return "INSUFFICIENT_CITATION_DENSITY";
    case "word_count_drift":
      return "DRAFT_WORD_COUNT_VIOLATION";
    default:
      return "DRAFT_WORD_COUNT_VIOLATION";
  }
};

export const runDraftStage = async ({
  workspaceId,
  articleId,
  topic,
  targetKeyword,
  tone,
  targetWordCount,
  additionalKeywords = [],
  outline,
  brief,
}) => {
  const sourceLookup = buildSourceLookup(brief);
  let lastValidation = null;
  let aggregateUsd = 0;
  let aggregateLatency = 0;
  let lastModel = SONNET_MODEL;

  /* ── Pre-draft enrichment signals (Phase B: Brand Voice + Internal Links + Reader Persona) ── */
  const enrichmentCosts = [];
  let voiceBlock = "";
  let linksBlock = "";
  let audienceBlock = "";

  try {
    /**
     * Per-article brand voice opt-in (Fix 6). When the article carries
     * a `brandVoiceProfileId` we honour that explicitly. Otherwise we
     * fall back to whatever profile is `isActive: true` on the workspace.
     * Both paths gracefully no-op when no profile is found.
     */
    let activeVoice = null;
    if (workspaceId) {
      const articleDoc = await import("#repositories/articleRepository.js").then(
        (m) => m.findActiveArticleById(workspaceId, articleId).catch(() => null)
      );
      const explicitId = articleDoc?.brandVoiceProfileId;
      if (explicitId) {
        activeVoice = await findProfileById(workspaceId, explicitId).catch(
          () => null
        );
      }
      if (!activeVoice) {
        activeVoice = await findActiveProfile(workspaceId);
      }
    }
    voiceBlock = buildVoiceBlock(activeVoice);
  } catch (err) {
    logger.debug("[draft] voice profile lookup failed", { message: err.message });
  }

  try {
    const links = workspaceId
      ? await suggestInternalLinks({
          workspaceId,
          topic,
          targetKeyword,
          additionalKeywords,
          excludeArticleId: articleId,
          limit: 5,
        })
      : [];
    linksBlock = buildInternalLinksBlock(links);
  } catch (err) {
    logger.debug("[draft] internal-link suggestion failed", {
      message: err.message,
    });
  }

  try {
    const audience = await classifyReaderPersona({
      topic,
      targetKeyword,
      tone,
      additionalKeywords,
    });
    if (audience) {
      audienceBlock = buildAudienceBlock(audience);
      if (audience.cost) {
        enrichmentCosts.push({
          stageName: "draft",
          providerName: "anthropic",
          model: audience.model,
          promptTokens: audience.usage?.promptTokens || 0,
          completionTokens: audience.usage?.completionTokens || 0,
          unitsConsumed:
            (audience.usage?.promptTokens || 0) +
            (audience.usage?.completionTokens || 0),
          usdCost: audience.cost?.usdCost || 0,
          costFlagged: audience.cost?.flagged || false,
          latencyMs: audience.latencyMs || 0,
          ts: new Date(),
        });
      }
    }
  } catch (err) {
    logger.debug("[draft] reader persona classification failed", {
      message: err.message,
    });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const retryHint =
        attempt === 0
          ? null
          : lastValidation?.reason === "unresolved_citation"
            ? `Citation URL "${lastValidation.url}" is not in the source list. Use only the URLs provided.`
            : lastValidation?.reason === "citation_density"
              ? "Add more inline citations to factual paragraphs (≥ 1 per 300 words)."
              : lastValidation?.reason === "word_count_drift"
                ? `Adjust draft length to ~${targetWordCount} words (±20%). Last attempt was ${lastValidation.totalWords}.`
                : lastValidation?.reason === "burstiness"
                  ? lastValidation.retryHint || "Vary sentence length: mix short (3–7 word), medium (8–15 word), and long (16–30 word) sentences."
                  : lastValidation?.reason === "paragraph_variation"
                    ? lastValidation.retryHint || "Vary paragraph length: include short (40–80 words), medium (80–180), and long (180–250 word) paragraphs."
                    : lastValidation?.reason === "cliches"
                      ? lastValidation.retryHint || "Replace AI-cliché phrases with direct, specific language. Avoid 'delve into', 'tapestry', 'navigate the landscape', 'in conclusion'."
                      : lastValidation?.reason === "opening_pattern"
                        ? lastValidation.retryHint || "Vary the opening paragraph structure. Avoid starting with question-answer pairs, definition patterns, or 'In today's world' clichés."
                        : "Re-emit the structured draft following the rules.";

      /* ── Optional pre-draft layout blueprint (Requirement 3.4, 3.5, 3.7, 3.8) ──
       * Gated by HUMAN_LIKE_PIPELINE_ENABLED. The blueprint is appended as
       * additional constraint lines to composeSystemPrompt; the persona
       * Markdown file and DRAFT_TOOL_INPUT_SCHEMA / validateAndShape are
       * left untouched (Requirements 7.1, 7.2, 7.3 / Property 13). When
       * the flag is off, or buildDraftBlueprint returns null/empty, the
       * legacy constraints array is used verbatim and the prompt is
       * byte-identical to today's output.
       */
      let blueprintConstraints = [];
      if (isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED)) {
        try {
          const blueprint = buildDraftBlueprint({ outline, brief });
          if (Array.isArray(blueprint) && blueprint.length > 0) {
            const block = composeDraftConstraintsBlock(blueprint);
            if (Array.isArray(block) && block.length > 0) {
              blueprintConstraints = block;
            }
          }
        } catch (err) {
          logger.debug("[draft] blueprint construction failed; using legacy prompt", {
            message: err.message,
          });
        }
      }

      const { temperature: draftTemp } = resolveSamplingParams(tone);

      const result = await useTool({
        model: SONNET_MODEL,
        system: composeSystemPrompt(
          ARTICLE_DRAFTER_PERSONA,
          [
            "RUNTIME CONSTRAINTS:",
            `- Tone: ${tone}.`,
            `- Target total word count: ${targetWordCount} (±20% tolerance).`,
            "- Submit one structured draft through the submit_draft tool only.",
            voiceBlock ? `\n${voiceBlock}` : "",
            audienceBlock ? `\n${audienceBlock}` : "",
            linksBlock ? `\n${linksBlock}` : "",
            ...blueprintConstraints,
          ].filter(Boolean)
        ),
        prompt: buildPrompt({
          topic,
          targetKeyword,
          tone,
          targetWordCount,
          outline,
          brief,
          retryHint,
        }),
        toolName: "submit_draft",
        toolDescription:
          "Submit the full article body as a paragraphs array. Each paragraph must have html, tag, and citations[].",
        toolInputSchema: DRAFT_TOOL_INPUT_SCHEMA,
        maxTokens: 8000,
        temperature: draftTemp,
      });
      lastModel = result.model;
      aggregateUsd += result.cost?.usdCost || 0;
      aggregateLatency += result.latencyMs || 0;

      const validation = validateAndShape({
        paragraphs: result.input?.paragraphs,
        sourceLookup,
        targetWordCount,
      });

      if (validation.ok) {
        /* ── Optional burstiness validation (Requirement 8) ──
         * Gated by HLP_BURSTINESS_VALIDATION_ENABLED. Analyzes sentence-length
         * variance across the draft. Low burstiness (uniform sentence lengths)
         * is the #1 AI-detector signal. When the flag is OFF, this check is
         * skipped entirely and the legacy flow continues verbatim.
         */
         if (isFlagEnabled(HLP_BURSTINESS_VALIDATION_ENABLED)) {
           const burstiness = validateBurstiness({
             paragraphs: validation.paragraphs,
           });
           if (!burstiness.ok) {
             lastValidation = { reason: "burstiness", ...burstiness };
             logger.warn("[draft] burstiness validation failed; retrying", {
               reason: burstiness.reason,
               details: burstiness.details,
             });
             continue; // re-enter the retry loop with the burstiness hint
           }
         }

        /* ── Optional paragraph variation validation (Requirement 10) ──
         * Gated by HLP_PARAGRAPH_VARIATION_ENABLED. Analyzes paragraph-length
         * diversity across the draft. Uniform paragraph lengths (~120-180 words
         * each) are a strong AI signal. When the flag is OFF, this check is
         * skipped entirely and the legacy flow continues verbatim.
         */
         if (isFlagEnabled(HLP_PARAGRAPH_VARIATION_ENABLED)) {
           const paragraphVariation = validateParagraphVariation({
             paragraphs: validation.paragraphs,
           });
           if (!paragraphVariation.ok) {
             lastValidation = { reason: "paragraph_variation", ...paragraphVariation };
             logger.warn("[draft] paragraph variation failed; retrying", {
               reason: paragraphVariation.reason,
               details: paragraphVariation.details,
             });
             continue; // re-enter the retry loop
           }
         }

        /* ── Optional anti-cliché scan (Requirement 11) ──
         * Gated by HLP_ANTICLICHE_SCANNER_ENABLED. Scans generated text for
         * AI-cliché phrases ("delve into", "tapestry", "navigate the landscape"…)
         * that are strong synthetic signals. When the flag is OFF, this check
         * is skipped entirely and the legacy flow continues verbatim.
         */
         if (isFlagEnabled(HLP_ANTICLICHE_SCANNER_ENABLED)) {
           const cliches = scanForCliches({ paragraphs: validation.paragraphs });
           if (!cliches.ok) {
             lastValidation = { reason: "cliches", ...cliches };
             logger.warn("[draft] cliché scan failed; retrying", {
               count: cliches.details.totalCount,
               phrases: cliches.details.phrases,
             });
             continue; // re-enter the retry loop
           }
         }

        /* ── Optional opening pattern diversity validation (Requirement 12) ──
         * Gated by HLP_OPENING_DIVERSITY_ENABLED. Analyzes the first 3 paragraphs
         * for shape dominance and repetitive first-word patterns that signal AI
         * generation. When the flag is OFF, this check is skipped entirely and
         * the legacy flow continues verbatim.
         */
        if (isFlagEnabled(HLP_OPENING_DIVERSITY_ENABLED)) {
          const openingPattern = validateOpeningDiversity({ paragraphs: validation.paragraphs });
          if (!openingPattern.ok) {
            lastValidation = { reason: "opening_pattern", ...openingPattern };
            logger.warn("[draft] opening pattern validation failed; retrying", {
              reason: openingPattern.reason,
              details: openingPattern.details,
            });
            continue; // re-enter the retry loop
          }
        }

        let finalParagraphs = validation.paragraphs;
        let contentHtml = validation.paragraphs.map((p) => p.html).join("\n");
        const contentMarkdown = validation.paragraphs
          .map((p) => p.markdown || htmlToPlain(p.html))
          .join("\n\n");

        /* ── Optional Draft Formatter pass (Requirement 4.1, 4.2, 4.3, 4.6) ──
         * Gated by HLP_DRAFT_FORMAT_ENABLED. The formatter is internally
         * exception-safe (it returns a sanitized fallback shape on its own
         * internal throw — see draftFormatterService.formatDraftHtml), but
         * we additionally wrap the call in a defensive try/catch so any
         * unexpected throw from the wiring layer falls back to the legacy
         * unformatted-but-sanitized paragraphs/contentHtml without ever
         * breaking the draft stage. When the flag is OFF, the legacy
         * paragraphs/contentHtml shape is returned verbatim — preserving
         * byte-identical pre-feature behavior (Property 12).
         */
        let draftFormatting;
        if (isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED)) {
          try {
            const formatted = formatDraftHtml({
              paragraphs: validation.paragraphs,
            });
            if (
              formatted &&
              Array.isArray(formatted.paragraphs) &&
              typeof formatted.contentHtml === "string"
            ) {
              finalParagraphs = formatted.paragraphs;
              contentHtml = formatted.contentHtml;
              draftFormatting = {
                formatVersion: DRAFT_FORMAT_VERSION,
                paragraphs: formatted.paragraphs,
              };
            }
          } catch (err) {
            logger.warn(
              "[draft] formatter threw; persisting unformatted-but-sanitized output",
              { message: err?.message }
            );
            // Leave finalParagraphs / contentHtml at their legacy values.
          }
        }

        return {
          paragraphs: finalParagraphs,
          sourcesIndex: validation.sourcesIndex,
          contentHtml,
          contentMarkdown,
          wordCount: validation.totalWords,
          readingTimeMinutes: Math.max(1, Math.round(validation.totalWords / 220)),
          promptVersion: DRAFT_PROMPT_VERSION,
          ...(draftFormatting ? { draftFormatting } : {}),
          cost: {
            stageName: "draft",
            providerName: "anthropic",
            model: lastModel,
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            unitsConsumed:
              (result.usage?.promptTokens || 0) + (result.usage?.completionTokens || 0),
            usdCost: result.cost?.usdCost || 0,
            costFlagged: result.cost?.flagged || false,
            latencyMs: result.latencyMs || 0,
            ts: new Date(),
          },
          enrichmentCosts,
        };
      }
      lastValidation = validation;
      logger.warn("[draft] validation failed; retrying", validation);
    } catch (err) {
      lastValidation = { reason: "exception", message: err.message };
      logger.warn("[draft] tool-use call failed; retrying", {
        message: err.message,
      });
    }
  }

  const err = new Error("Draft generation failed after retries");
  err.code = validatorReasonToErrorCode(lastValidation?.reason);
  err.details = lastValidation;
  err.totalUsd = aggregateUsd;
  err.totalLatency = aggregateLatency;
  throw err;
};
