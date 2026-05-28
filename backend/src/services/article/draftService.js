import { randomUUID } from "node:crypto";
import { useTool, SONNET_MODEL } from "#services/external/anthropicClient.js";
import { sanitizeArticleHtml } from "#utils/htmlSanitizer.js";
import { canonicalUrl, htmlToPlain, wordCount } from "#utils/textUtil.js";
import {
  ARTICLE_DRAFTER_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { findActiveProfile } from "#repositories/brandVoiceRepository.js";
import { buildVoiceBlock } from "#services/article/brandVoiceService.js";
import {
  suggestInternalLinks,
  buildInternalLinksBlock,
} from "#services/article/internalLinkService.js";
import {
  classifyReaderPersona,
  buildAudienceBlock,
} from "#services/article/readerPersonaService.js";
import { logger } from "#utils/logger.js";

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
      (s, i) =>
        `[${i + 1}] ${s.title || s.url}\n${s.url}\nExcerpt:\n${(s.cleanedMarkdown || "").slice(0, 2500)}`
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

  const lower = targetWordCount * 0.85;
  const upper = targetWordCount * 1.15;
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
    const activeVoice = workspaceId
      ? await findActiveProfile(workspaceId)
      : null;
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
                ? `Adjust draft length to ~${targetWordCount} words (±15%). Last attempt was ${lastValidation.totalWords}.`
                : "Re-emit the structured draft following the rules.";

      const result = await useTool({
        model: SONNET_MODEL,
        system: composeSystemPrompt(
          ARTICLE_DRAFTER_PERSONA,
          [
            "RUNTIME CONSTRAINTS:",
            `- Tone: ${tone}.`,
            `- Target total word count: ${targetWordCount} (±15% tolerance).`,
            "- Submit one structured draft through the submit_draft tool only.",
            voiceBlock ? `\n${voiceBlock}` : "",
            audienceBlock ? `\n${audienceBlock}` : "",
            linksBlock ? `\n${linksBlock}` : "",
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
        temperature: 0.5,
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
        const contentHtml = validation.paragraphs.map((p) => p.html).join("\n");
        const contentMarkdown = validation.paragraphs
          .map((p) => p.markdown || htmlToPlain(p.html))
          .join("\n\n");
        return {
          paragraphs: validation.paragraphs,
          sourcesIndex: validation.sourcesIndex,
          contentHtml,
          contentMarkdown,
          wordCount: validation.totalWords,
          readingTimeMinutes: Math.max(1, Math.round(validation.totalWords / 220)),
          promptVersion: DRAFT_PROMPT_VERSION,
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
