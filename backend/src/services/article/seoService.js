import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { findExistingSlug } from "#repositories/articleRepository.js";
import {
  SEO_SPECIALIST_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  SEO stage — Requirement 5
 * ============================================================
 *
 *   - 3 meta titles (30–60 chars), keyword in ≥ 1
 *   - 1 meta description (1–160 chars), keyword exactly once (case-insensitive)
 *   - URL slug: lowercased, alnum + hyphens, ≤ 75 chars; uniquify with -2, -3 …
 *   - FAQ ≥ 3 pairs (q 50–120, a 100–300, ≥ 1 source URL each)
 *   - 3–10 lowercase tags (alnum + hyphens)
 *   - OG title/description/image placeholder
 *   - 2 retries before SEO_VALIDATION_FAILED
 */

const SEO_TOOL_SCHEMA = {
  type: "object",
  properties: {
    metaTitleOptions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", minLength: 30, maxLength: 60 },
    },
    metaDescription: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: "string", minLength: 1, maxLength: 75 },
    faq: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          question: { type: "string", minLength: 50, maxLength: 120 },
          answer: { type: "string", minLength: 100, maxLength: 300 },
          citationUrls: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
        required: ["question", "answer", "citationUrls"],
      },
    },
    tags: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: { type: "string", minLength: 2, maxLength: 40 },
    },
    ogTitle: { type: "string", minLength: 5, maxLength: 90 },
    ogDescription: { type: "string", minLength: 30, maxLength: 200 },
  },
  required: [
    "metaTitleOptions",
    "metaDescription",
    "slug",
    "faq",
    "tags",
    "ogTitle",
    "ogDescription",
  ],
};

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 75);

const containsKeyword = (str, keyword) =>
  String(str).toLowerCase().includes(String(keyword).toLowerCase());

const countOccurrences = (str, keyword) => {
  const k = String(keyword).toLowerCase();
  if (!k) return 0;
  const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return ((String(str).toLowerCase()).match(re) || []).length;
};

const normalizeTag = (tag = "") =>
  String(tag)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const validateSeo = ({ payload, targetKeyword, briefUrls }) => {
  const errors = [];
  if (!payload.metaTitleOptions || payload.metaTitleOptions.length !== 3) {
    errors.push("metaTitleOptions must have exactly 3 entries");
  } else {
    const lengthsOk = payload.metaTitleOptions.every(
      (t) => typeof t === "string" && t.length >= 30 && t.length <= 60
    );
    if (!lengthsOk) errors.push("metaTitleOptions length out of range");
    const hasKeyword = payload.metaTitleOptions.some((t) =>
      containsKeyword(t, targetKeyword)
    );
    if (!hasKeyword) errors.push("no meta title contains target keyword");
  }
  if (
    !payload.metaDescription ||
    payload.metaDescription.length < 1 ||
    payload.metaDescription.length > 160
  ) {
    errors.push("metaDescription length out of range");
  } else if (countOccurrences(payload.metaDescription, targetKeyword) !== 1) {
    errors.push("metaDescription must contain target keyword exactly once");
  }
  if (!payload.slug || payload.slug.length > 75) {
    errors.push("slug missing or too long");
  }
  if (!Array.isArray(payload.faq) || payload.faq.length < 3) {
    errors.push("FAQ must have at least 3 pairs");
  } else {
    for (const f of payload.faq) {
      if (!f.question || f.question.length < 50 || f.question.length > 120) {
        errors.push("FAQ question length out of range");
      }
      if (!f.answer || f.answer.length < 100 || f.answer.length > 300) {
        errors.push("FAQ answer length out of range");
      }
      if (
        !Array.isArray(f.citationUrls) ||
        f.citationUrls.length < 1 ||
        !f.citationUrls.every((u) => briefUrls.has(u))
      ) {
        errors.push("FAQ pair missing valid citation URL");
      }
    }
  }
  if (!Array.isArray(payload.tags) || payload.tags.length < 3) {
    errors.push("tags must have at least 3 entries");
  }
  return { ok: errors.length === 0, errors };
};

const ensureUniqueSlug = async ({ workspaceId, baseSlug }) => {
  let candidate = baseSlug.slice(0, 75);
  let suffix = 2;
  // Cap at a handful of attempts; further collisions are vanishingly rare.
  for (let i = 0; i < 50; i++) {
    const existing = await findExistingSlug(workspaceId, candidate);
    if (!existing) return candidate;
    const suffixStr = `-${suffix++}`;
    const trimmed = baseSlug.slice(0, 75 - suffixStr.length);
    candidate = `${trimmed}${suffixStr}`;
  }
  // Last resort — append timestamp
  return `${baseSlug.slice(0, 60)}-${Date.now()}`.slice(0, 75);
};

export const runSeoStage = async ({
  workspaceId,
  topic,
  targetKeyword,
  contentMarkdown,
  brief,
}) => {
  const briefUrls = new Set(
    (brief?.sources || []).filter((s) => !s.skipReason).map((s) => s.url)
  );
  const briefUrlsList = Array.from(briefUrls);

  const buildPrompt = (retryHint) =>
    [
      `Topic: ${topic}`,
      `Target keyword: ${targetKeyword}`,
      "",
      "Article (markdown, truncated):",
      String(contentMarkdown || "").slice(0, 6000),
      "",
      "Allowed citation URLs for FAQ:",
      briefUrlsList.join("\n") || "(none)",
      "",
      "Produce SEO assets via the submit_seo tool:",
      "- 3 meta titles, each 30-60 chars; at least one must contain the target keyword.",
      "- 1 meta description, 1-160 chars, containing the target keyword EXACTLY ONCE (case-insensitive).",
      "- A URL slug derived from the target keyword: lowercase, alphanumeric + hyphens only, ≤ 75 chars.",
      "- FAQ array with 3-8 pairs. Each question 50-120 chars, each answer 100-300 chars, at least one citation URL drawn from the list above.",
      "- 3-10 lowercase tags (alphanumeric + hyphens only).",
      "- ogTitle, ogDescription. Do NOT generate ogImage; we'll fill it server-side.",
      retryHint ? `\nRetry hint: ${retryHint}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  let lastErrors = null;
  let aggregateUsd = 0;
  let aggregateLatency = 0;
  let lastModel = HAIKU_MODEL;
  let lastUsage = { promptTokens: 0, completionTokens: 0 };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await useTool({
        model: HAIKU_MODEL,
        system: composeSystemPrompt(SEO_SPECIALIST_PERSONA, [
          "RUNTIME CONSTRAINTS:",
          `- Target keyword: "${targetKeyword}"`,
          "- Submit one bundle via submit_seo. Do not include ogImage.",
          "- All FAQ citationUrls MUST come from the supplied source list.",
        ]),
        prompt: buildPrompt(lastErrors ? lastErrors.join("; ") : null),
        toolName: "submit_seo",
        toolDescription:
          "Submit the SEO assets bundle for the article (titles, description, slug, FAQ, tags, OG fields).",
        toolInputSchema: SEO_TOOL_SCHEMA,
        maxTokens: 1500,
        temperature: 0.4,
      });
      lastModel = result.model;
      lastUsage = result.usage || lastUsage;
      aggregateUsd += result.cost?.usdCost || 0;
      aggregateLatency += result.latencyMs || 0;

      const payload = result.input;
      // Normalize slug + tags before validation
      payload.slug = slugify(payload.slug || targetKeyword);
      payload.tags = (payload.tags || [])
        .map(normalizeTag)
        .filter((t) => t && t.length >= 2);

      const validation = validateSeo({
        payload,
        targetKeyword,
        briefUrls,
      });

      if (validation.ok) {
        const uniqueSlug = await ensureUniqueSlug({
          workspaceId,
          baseSlug: payload.slug,
        });
        return {
          seo: {
            metaTitleOptions: payload.metaTitleOptions,
            metaTitle: payload.metaTitleOptions[0],
            metaDescription: payload.metaDescription,
            slug: uniqueSlug,
            faq: payload.faq,
            tags: payload.tags,
            ogTitle: payload.ogTitle,
            ogDescription: payload.ogDescription,
            ogImage: null,
          },
          cost: {
            stageName: "seo",
            providerName: "anthropic",
            model: lastModel,
            promptTokens: lastUsage.promptTokens || 0,
            completionTokens: lastUsage.completionTokens || 0,
            unitsConsumed:
              (lastUsage.promptTokens || 0) + (lastUsage.completionTokens || 0),
            usdCost: result.cost?.usdCost || 0,
            costFlagged: result.cost?.flagged || false,
            latencyMs: result.latencyMs || 0,
            ts: new Date(),
          },
        };
      }
      lastErrors = validation.errors;
      logger.warn("[seo] validation failed; retrying", {
        errors: validation.errors,
      });
    } catch (err) {
      lastErrors = [err.message];
      logger.warn("[seo] tool-use failed; retrying", { message: err.message });
    }
  }

  const err = new Error("SEO generation failed after retries");
  err.code = "SEO_VALIDATION_FAILED";
  err.details = { errors: lastErrors };
  err.totalUsd = aggregateUsd;
  err.totalLatency = aggregateLatency;
  throw err;
};
