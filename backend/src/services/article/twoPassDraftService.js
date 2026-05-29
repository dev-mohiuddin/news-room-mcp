import { randomUUID } from "node:crypto";
import { useTool, SONNET_MODEL, HAIKU_MODEL } from "#services/external/anthropicClient.js";
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
  HLP_TWO_PASS_DRAFTING_ENABLED,
  HLP_BURSTINESS_VALIDATION_ENABLED,
  HLP_PARAGRAPH_VARIATION_ENABLED,
  HLP_ANTICLICHE_SCANNER_ENABLED,
  HLP_OPENING_DIVERSITY_ENABLED,
} from "#utils/featureFlags.js";
import { validateBurstiness } from "#services/article/burstinessValidator.js";
import { validateParagraphVariation } from "#services/article/paragraphVariationValidator.js";
import { scanForCliches } from "#services/article/anticlicheScanner.js";
import { validateOpeningDiversity } from "#services/article/openingPatternValidator.js";
import { logger } from "#utils/logger.js";

const TONE_SAMPLING = Object.freeze({
  Professional: { temperature: 0.45 },
  Casual:       { temperature: 0.75 },
  Journalistic: { temperature: 0.65 },
  Academic:     { temperature: 0.35 },
});

const resolveSamplingParams = (tone) => {
  return TONE_SAMPLING[tone] ?? { temperature: 0.5 };
};

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

const buildSourcesBlock = (brief) => {
  return (brief?.sources || [])
    .filter((s) => !s.skipReason)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title || s.url}\n${s.url}\nExcerpt:\n${(s.cleanedMarkdown || "").slice(0, 2500)}`
    )
    .join("\n\n");
};

const buildOutlineBlock = (outline) => {
  return outline
    .map(
      (sec, i) =>
        `${i + 1}. ${sec.heading} (~${sec.estimatedWordCount} words)\n` +
        sec.subPoints.map((p) => `   - ${p}`).join("\n")
    )
    .join("\n\n");
};

const buildRoughDraftPrompt = ({ topic, targetKeyword, tone, targetWordCount, outline, brief }) => {
  const sources = buildSourcesBlock(brief);
  const outlineBlk = buildOutlineBlock(outline);

  return [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    `Writing tone: ${tone}`,
    `Target word count: ${targetWordCount}`,
    "",
    "Outline:",
    outlineBlk,
    "",
    "Available sources (cite ONLY these by URL):",
    sources,
    "",
    "Write a ROUGH DRAFT covering all outline sections. Focus on structure and citations, not polish.",
    "CRITICAL: Every factual paragraph MUST have citations. Include at least 1 citation URL per 400 words.",
    "Rules:",
    "- Output ONLY through the submit_draft tool.",
    "- Every `factual` paragraph MUST have `citations[]` with at least 1 URL per 400 words. A 800-word factual paragraph needs 2+ citations.",
    "- Copy the exact source URLs into each paragraph's `citations[]` array.",
    "- Set `tag` to 'factual' whenever you cite or state factual claims.",
    "- Use only `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<strong>`, `<em>`, `<a>`, `<code>` tags.",
    "- This is a rough draft — focus on getting the structure and citations right. Polish will come later.",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildPolishDraftPrompt = ({ topic, targetKeyword, tone, targetWordCount, outline, brief, roughParagraphs, sourceLookup }) => {
  const sources = buildSourcesBlock(brief);
  const outlineBlk = buildOutlineBlock(outline);

  const roughText = roughParagraphs
    .map((p, i) => {
      const citeStr = (p.citations || []).map(c => `[cite: ${c.url}]`).join(' ');
      return `[${i + 1}] [${p.tag}] ${p.html} ${citeStr ? 'Citations: ' + citeStr : ''}`;
    })
    .join("\n\n");

  return [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    `Writing tone: ${tone}`,
    `Target word count: ${targetWordCount}`,
    "",
    "Outline:",
    outlineBlk,
    "",
    "Available sources (cite ONLY these by URL):",
    sources,
    "",
    "ROUGH DRAFT to polish:",
    roughText,
    "",
    "Your job is to POLISH and EXPAND this rough draft into a publishable article.",
    "CRITICAL: You MUST preserve ALL citations from the rough draft. Each paragraph's `citations[]` array must contain the URLs shown in the rough draft.",
    "Rules:",
    "- Output ONLY through the submit_draft tool.",
    "- Every `factual` paragraph MUST have `citations[]` with at least 1 URL per 400 words. A 800-word factual paragraph needs 2+ citations.",
    "- Copy the exact source URLs into each paragraph's `citations[]` array — do not omit them.",
    "- Vary sentence length: mix short (3-7 word), medium (8-15 word), and long (16-30 word) sentences.",
    "- Vary paragraph length: include short (40-80 words), medium (80-180), and long (180-250 word) paragraphs.",
    "- Set `tag` to 'factual' whenever you cite or state factual claims.",
    "- Use only `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<strong>`, `<em>`, `<a>`, `<code>` tags.",
    "- DO NOT copy more than 11 consecutive words verbatim from any source — paraphrase.",
    "- Avoid AI-cliché phrases: 'delve into', 'tapestry', 'navigate the landscape', 'in conclusion', 'testament to', 'crucial to understand'.",
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

const validateAndShape = ({ paragraphs, sourceLookup, targetWordCount, skipWordCount = false }) => {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return { ok: false, reason: "empty_paragraphs" };
  }

  const sourcesIndex = [];
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

    if (p.tag === "factual") {
      const requiredCount = Math.max(1, Math.ceil(w / 400));
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
  if (!skipWordCount && (totalWords < lower || totalWords > upper)) {
    return {
      ok: false,
      reason: "word_count_drift",
      totalWords,
      lower,
      upper,
    };
  }

  return { ok: true, paragraphs: shaped, sourcesIndex, totalWords };
};

const validatorReasonToErrorCode = (reason) => {
  switch (reason) {
    case "no_citations": return "NO_CITATIONS";
    case "unresolved_citation": return "UNRESOLVED_CITATION";
    case "citation_density": return "INSUFFICIENT_CITATION_DENSITY";
    case "word_count_drift": return "DRAFT_WORD_COUNT_VIOLATION";
    default: return "DRAFT_WORD_COUNT_VIOLATION";
  }
};

export const runTwoPassDraftStage = async ({
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
  let aggregateUsd = 0;
  let aggregateLatency = 0;
  let lastModel = SONNET_MODEL;

  const enrichmentCosts = [];
  let voiceBlock = "";
  let linksBlock = "";
  let audienceBlock = "";

  try {
    let activeVoice = null;
    if (workspaceId) {
      const articleDoc = await import("#repositories/articleRepository.js").then(
        (m) => m.findActiveArticleById(workspaceId, articleId).catch(() => null)
      );
      const explicitId = articleDoc?.brandVoiceProfileId;
      if (explicitId) {
        activeVoice = await findProfileById(workspaceId, explicitId).catch(() => null);
      }
      if (!activeVoice) {
        activeVoice = await findActiveProfile(workspaceId);
      }
    }
    voiceBlock = buildVoiceBlock(activeVoice);
  } catch (err) {
    logger.debug("[two-pass-draft] voice profile lookup failed", { message: err.message });
  }

  try {
    const links = workspaceId
      ? await suggestInternalLinks({
          workspaceId, topic, targetKeyword, additionalKeywords,
          excludeArticleId: articleId, limit: 5,
        })
      : [];
    linksBlock = buildInternalLinksBlock(links);
  } catch (err) {
    logger.debug("[two-pass-draft] internal-link suggestion failed", { message: err.message });
  }

  try {
    const audience = await classifyReaderPersona({ topic, targetKeyword, tone, additionalKeywords });
    if (audience) {
      audienceBlock = buildAudienceBlock(audience);
      if (audience.cost) {
        enrichmentCosts.push({
          stageName: "draft", providerName: "anthropic", model: audience.model,
          promptTokens: audience.usage?.promptTokens || 0,
          completionTokens: audience.usage?.completionTokens || 0,
          unitsConsumed: (audience.usage?.promptTokens || 0) + (audience.usage?.completionTokens || 0),
          usdCost: audience.cost?.usdCost || 0, costFlagged: audience.cost?.flagged || false,
          latencyMs: audience.latencyMs || 0, ts: new Date(),
        });
      }
    }
  } catch (err) {
    logger.debug("[two-pass-draft] reader persona classification failed", { message: err.message });
  }

  /* ── Pass 1: Haiku rough draft (structure + citations) ── */
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
      logger.debug("[two-pass-draft] blueprint construction failed", { message: err.message });
    }
  }

  const roughResult = await useTool({
    model: HAIKU_MODEL,
    system: composeSystemPrompt(
      ARTICLE_DRAFTER_PERSONA,
      [
        "RUNTIME CONSTRAINTS:",
        `- Tone: ${tone}.`,
        `- Target total word count: ${targetWordCount} (±20% tolerance).`,
        "- Submit one structured rough draft through the submit_draft tool only.",
        voiceBlock ? `\n${voiceBlock}` : "",
        audienceBlock ? `\n${audienceBlock}` : "",
        linksBlock ? `\n${linksBlock}` : "",
        ...blueprintConstraints,
      ].filter(Boolean)
    ),
    prompt: buildRoughDraftPrompt({ topic, targetKeyword, tone, targetWordCount, outline, brief }),
    toolName: "submit_draft",
    toolDescription: "Submit the rough draft as a paragraphs array. Each paragraph must have html, tag, and citations[].",
    toolInputSchema: DRAFT_TOOL_INPUT_SCHEMA,
    maxTokens: 8000,
    temperature: 0.6,
  });

  aggregateUsd += roughResult.cost?.usdCost || 0;
  aggregateLatency += roughResult.latencyMs || 0;

  const roughValidation = validateAndShape({
    paragraphs: roughResult.input?.paragraphs,
    sourceLookup,
    targetWordCount,
    skipWordCount: true,
  });

  if (!roughValidation.ok) {
    const err = new Error("Two-pass draft failed: rough draft validation failed");
    err.code = validatorReasonToErrorCode(roughValidation.reason);
    err.details = roughValidation;
    err.totalUsd = aggregateUsd;
    err.totalLatency = aggregateLatency;
    throw err;
  }

  /* ── Pass 2: Sonnet polish (prose quality + expansion) ── */
  const { temperature: polishTemp } = resolveSamplingParams(tone);

  const polishResult = await useTool({
    model: SONNET_MODEL,
    system: composeSystemPrompt(
      ARTICLE_DRAFTER_PERSONA,
      [
        "RUNTIME CONSTRAINTS:",
        `- Tone: ${tone}.`,
        `- Target total word count: ${targetWordCount} (±20% tolerance).`,
        "- Submit one polished draft through the submit_draft tool only.",
        voiceBlock ? `\n${voiceBlock}` : "",
        audienceBlock ? `\n${audienceBlock}` : "",
        linksBlock ? `\n${linksBlock}` : "",
        ...blueprintConstraints,
      ].filter(Boolean)
    ),
    prompt: buildPolishDraftPrompt({
      topic, targetKeyword, tone, targetWordCount, outline, brief,
      roughParagraphs: roughValidation.paragraphs, sourceLookup,
    }),
    toolName: "submit_draft",
    toolDescription: "Submit the polished draft as a paragraphs array. Each paragraph must have html, tag, and citations[].",
    toolInputSchema: DRAFT_TOOL_INPUT_SCHEMA,
    maxTokens: 8000,
    temperature: polishTemp,
  });

  lastModel = polishResult.model;
  aggregateUsd += polishResult.cost?.usdCost || 0;
  aggregateLatency += polishResult.latencyMs || 0;

  const finalValidation = validateAndShape({
    paragraphs: polishResult.input?.paragraphs,
    sourceLookup,
    targetWordCount,
  });

  if (!finalValidation.ok) {
    const err = new Error("Two-pass draft failed: polished draft validation failed");
    err.code = validatorReasonToErrorCode(finalValidation.reason);
    err.details = finalValidation;
    err.totalUsd = aggregateUsd;
    err.totalLatency = aggregateLatency;
    throw err;
  }

  /* ── Post-validation checks (burstiness, paragraph variation, anti-cliché, opening pattern) ── */
  let lastValidation = null;

  if (isFlagEnabled(HLP_BURSTINESS_VALIDATION_ENABLED)) {
    const burstiness = validateBurstiness({ paragraphs: finalValidation.paragraphs });
    if (!burstiness.ok) {
      lastValidation = { reason: "burstiness", ...burstiness };
      logger.warn("[two-pass-draft] burstiness validation failed", {
        reason: burstiness.reason, details: burstiness.details,
      });
    }
  }

  if (!lastValidation && isFlagEnabled(HLP_PARAGRAPH_VARIATION_ENABLED)) {
    const paragraphVariation = validateParagraphVariation({ paragraphs: finalValidation.paragraphs });
    if (!paragraphVariation.ok) {
      lastValidation = { reason: "paragraph_variation", ...paragraphVariation };
      logger.warn("[two-pass-draft] paragraph variation failed", {
        reason: paragraphVariation.reason, details: paragraphVariation.details,
      });
    }
  }

  if (!lastValidation && isFlagEnabled(HLP_ANTICLICHE_SCANNER_ENABLED)) {
    const cliches = scanForCliches({ paragraphs: finalValidation.paragraphs });
    if (!cliches.ok) {
      lastValidation = { reason: "cliches", ...cliches };
      logger.warn("[two-pass-draft] cliché scan failed", {
        count: cliches.details.totalCount, phrases: cliches.details.phrases,
      });
    }
  }

  if (!lastValidation && isFlagEnabled(HLP_OPENING_DIVERSITY_ENABLED)) {
    const openingPattern = validateOpeningDiversity({ paragraphs: finalValidation.paragraphs });
    if (!openingPattern.ok) {
      lastValidation = { reason: "opening_pattern", ...openingPattern };
      logger.warn("[two-pass-draft] opening pattern validation failed", {
        reason: openingPattern.reason, details: openingPattern.details,
      });
    }
  }

  if (lastValidation) {
    const err = new Error("Two-pass draft failed post-validation");
    err.code = validatorReasonToErrorCode(lastValidation.reason);
    err.details = lastValidation;
    err.totalUsd = aggregateUsd;
    err.totalLatency = aggregateLatency;
    throw err;
  }

  /* ── Formatting ── */
  let finalParagraphs = finalValidation.paragraphs;
  let contentHtml = finalValidation.paragraphs.map((p) => p.html).join("\n");
  const contentMarkdown = finalValidation.paragraphs
    .map((p) => p.markdown || htmlToPlain(p.html))
    .join("\n\n");

  let draftFormatting;
  if (isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED)) {
    try {
      const formatted = formatDraftHtml({ paragraphs: finalValidation.paragraphs });
      if (formatted && Array.isArray(formatted.paragraphs) && typeof formatted.contentHtml === "string") {
        finalParagraphs = formatted.paragraphs;
        contentHtml = formatted.contentHtml;
        draftFormatting = {
          formatVersion: DRAFT_FORMAT_VERSION,
          paragraphs: formatted.paragraphs,
        };
      }
    } catch (err) {
      logger.warn("[two-pass-draft] formatter threw; persisting unformatted", { message: err?.message });
    }
  }

  return {
    paragraphs: finalParagraphs,
    sourcesIndex: finalValidation.sourcesIndex,
    contentHtml,
    contentMarkdown,
    wordCount: finalValidation.totalWords,
    readingTimeMinutes: Math.max(1, Math.round(finalValidation.totalWords / 220)),
    promptVersion: "v1-two-pass",
    ...(draftFormatting ? { draftFormatting } : {}),
    cost: {
      stageName: "draft",
      providerName: "anthropic",
      model: lastModel,
      promptTokens: polishResult.usage?.promptTokens || 0,
      completionTokens: polishResult.usage?.completionTokens || 0,
      unitsConsumed: (polishResult.usage?.promptTokens || 0) + (polishResult.usage?.completionTokens || 0),
      usdCost: aggregateUsd,
      costFlagged: polishResult.cost?.flagged || false,
      latencyMs: aggregateLatency,
      ts: new Date(),
    },
    enrichmentCosts,
    pass1Cost: {
      stageName: "draft-pass-1",
      providerName: "anthropic",
      model: HAIKU_MODEL,
      promptTokens: roughResult.usage?.promptTokens || 0,
      completionTokens: roughResult.usage?.completionTokens || 0,
      unitsConsumed: (roughResult.usage?.promptTokens || 0) + (roughResult.usage?.completionTokens || 0),
      usdCost: roughResult.cost?.usdCost || 0,
      costFlagged: roughResult.cost?.flagged || false,
      latencyMs: roughResult.latencyMs || 0,
      ts: new Date(),
    },
  };
};
