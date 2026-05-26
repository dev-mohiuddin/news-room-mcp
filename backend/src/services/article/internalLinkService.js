import { Article } from "#models/articleModel.js";
import { ARTICLE_STATUS } from "#constants/articleStatus.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Internal Link Suggester
 * ============================================================
 *
 *  Given a draft's topic + target keyword, find published articles
 *  in the SAME workspace that are topically related and produce a
 *  short list of internal-link suggestions the Drafter agent can
 *  weave into the article via standard <a> tags.
 *
 *  Strategy (no LLM needed for matching — keep it cheap + deterministic):
 *   1. Tokenize topic + keyword + additional keywords
 *   2. Mongo text-style match against published articles' topic /
 *      keyword / tags / metaTitle
 *   3. Score by overlap; cap top N
 *   4. Return [{ title, url (cmsPostUrl preferred, else slug), anchor }]
 *
 *  The Drafter receives this as a hint block — it is free to skip
 *  any suggestion that does not fit naturally.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "of", "to", "in", "on", "at",
  "is", "are", "was", "were", "be", "been", "being", "with", "by", "as",
  "this", "that", "these", "those", "it", "its", "from", "up", "down", "out",
  "how", "what", "why", "when", "where", "best", "top", "guide",
]);

const tokenizeForMatch = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length >= 3 && !STOP_WORDS.has(t));

const scoreOverlap = (sourceTokens, candidateTokens) => {
  if (!sourceTokens.length || !candidateTokens.length) return 0;
  const set = new Set(candidateTokens);
  let hits = 0;
  for (const t of sourceTokens) if (set.has(t)) hits += 1;
  return hits / sourceTokens.length;
};

/**
 * Returns up to `limit` link suggestions from this workspace's published articles.
 *
 *  Output: [{ title, url, anchor, articleId, score }]
 */
export const suggestInternalLinks = async ({
  workspaceId,
  topic,
  targetKeyword,
  additionalKeywords = [],
  excludeArticleId = null,
  limit = 6,
}) => {
  if (!workspaceId) return [];

  const sourceTokens = tokenizeForMatch(
    [topic, targetKeyword, ...(additionalKeywords || [])].join(" ")
  );
  if (!sourceTokens.length) return [];

  // Fetch a window of recent published articles. We don't need a full text
  // index for MVP volumes (≤ a few hundred articles per workspace).
  const candidates = await Article.find({
    workspaceId,
    status: ARTICLE_STATUS.PUBLISHED,
    deletedAt: null,
    ...(excludeArticleId ? { _id: { $ne: excludeArticleId } } : {}),
  })
    .select("_id topic targetKeyword seo.metaTitle seo.tags seo.slug cmsPostUrl publishedAt")
    .sort({ publishedAt: -1 })
    .limit(200)
    .lean()
    .exec();

  const scored = [];
  for (const c of candidates) {
    const candidateText = [
      c.topic,
      c.targetKeyword,
      c.seo?.metaTitle,
      ...(c.seo?.tags || []),
    ]
      .filter(Boolean)
      .join(" ");
    const candidateTokens = tokenizeForMatch(candidateText);
    const score = scoreOverlap(sourceTokens, candidateTokens);
    if (score < 0.15) continue; // weak match
    scored.push({
      articleId: c._id.toString(),
      title: c.seo?.metaTitle || c.topic,
      url: c.cmsPostUrl || (c.seo?.slug ? `/${c.seo.slug}` : null),
      anchor: c.targetKeyword || c.seo?.metaTitle || c.topic,
      score: Number(score.toFixed(3)),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).filter((x) => x.url);
  logger.debug("[internal-links] suggestions", {
    workspaceId: String(workspaceId),
    count: top.length,
  });
  return top;
};

/**
 * Build a markdown block the Drafter prompt can include.
 */
export const buildInternalLinksBlock = (suggestions = []) => {
  if (!suggestions.length) return "";
  const lines = suggestions.map(
    (s, i) => `${i + 1}. "${s.title}" → ${s.url} (suggested anchor: "${s.anchor}")`
  );
  return [
    "# RELATED PUBLISHED ARTICLES (use 1-3 as natural <a> links inside the body)",
    "Pick the ones that genuinely fit the flow. Skip suggestions that don't.",
    "Each link must use rel-friendly anchor text — avoid generic 'click here'.",
    "",
    ...lines,
  ].join("\n");
};
