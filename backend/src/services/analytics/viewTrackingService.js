import crypto from "node:crypto";
import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { Article } from "#models/articleModel.js";
import {
  insertView,
  bumpArticleCounters,
} from "#repositories/articleViewRepository.js";

/**
 * ============================================================
 *  View Tracking Service
 * ============================================================
 *
 *  Public ingress:
 *    POST /api/v1/track/view  { articleId, slug, referrer? }
 *
 *  Anti-abuse:
 *    1. Validate article exists, is published, and is not soft-deleted
 *    2. Hash IP + UA into `visitorHash` (we don't store raw PII)
 *    3. Unique index on (articleId, visitorHash, dayKey) silently
 *       de-dupes repeated views from the same visitor on the same day
 *    4. Rate limiter mounted on the route handles burst protection
 *    5. Bot user-agents are bucketed but not counted toward viewsTotal
 *       so dashboards stay accurate
 */

const BOT_PATTERNS = [
  /bot/i,
  /spider/i,
  /crawler/i,
  /pingdom/i,
  /uptime/i,
  /facebookexternalhit/i,
  /headless/i,
  /phantomjs/i,
  /lighthouse/i,
];

const MOBILE_PATTERNS = [/Mobi|Android.*Mobile|iPhone/i];
const TABLET_PATTERNS = [/iPad|Android(?!.*Mobile)/i];

const classifyUserAgent = (ua = "") => {
  if (!ua) return "unknown";
  if (BOT_PATTERNS.some((re) => re.test(ua))) return "bot";
  if (TABLET_PATTERNS.some((re) => re.test(ua))) return "tablet";
  if (MOBILE_PATTERNS.some((re) => re.test(ua))) return "mobile";
  return "desktop";
};

const REFERRER_BUCKETS = [
  { kind: "organic_search", patterns: [/google\./i, /bing\./i, /duckduckgo\./i, /yahoo\./i, /yandex\./i] },
  { kind: "social", patterns: [/twitter\./i, /x\.com/i, /facebook\./i, /linkedin\./i, /instagram\./i, /reddit\./i, /t\.co/i] },
  { kind: "email", patterns: [/mail\./i, /outlook\./i, /gmail\./i, /substack\./i, /beehiiv\./i] },
];

const classifyReferrer = (referrer = "") => {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname || "";
    for (const bucket of REFERRER_BUCKETS) {
      if (bucket.patterns.some((re) => re.test(host))) return bucket.kind;
    }
    return "referral";
  } catch {
    return "unknown";
  }
};

const todayKey = (d = new Date()) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const hashVisitor = (ip = "", userAgent = "") => {
  const salt = process.env.VIEW_TRACKING_SALT || "newsroom-mcp-views";
  return crypto
    .createHash("sha256")
    .update(`${salt}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 24);
};

/**
 * Track one view. Returns `{ counted: boolean }` so the caller can
 * decide whether to emit a 200 (counted) vs 202 (deduped).
 */
export const trackView = async ({ articleId, ip, userAgent, referrer }) => {
  if (!articleId) throwError("articleId is required", 400);

  const article = await Article.findOne({
    _id: articleId,
    deletedAt: null,
  })
    .select("_id workspaceId status")
    .lean();
  if (!article) throwError("Article not found", 404);
  if (article.status !== "published") {
    throwError("View tracking is only allowed for published articles", 409);
  }

  const uaBucket = classifyUserAgent(userAgent);
  if (uaBucket === "bot") {
    return { counted: false, reason: "bot" };
  }

  const referrerKind = classifyReferrer(referrer);
  const dayKey = todayKey();
  const visitorHash = hashVisitor(ip, userAgent);

  const created = await insertView({
    articleId: article._id,
    workspaceId: article.workspaceId,
    visitorHash,
    referrer: referrerKind,
    userAgentBucket: uaBucket,
    dayKey,
  });

  if (!created) {
    // Duplicate — visitor already counted today
    return { counted: false, reason: "deduped" };
  }

  try {
    await bumpArticleCounters(article._id);
  } catch (err) {
    logger.warn("[views] counter bump failed", { message: err.message });
  }

  return { counted: true };
};
