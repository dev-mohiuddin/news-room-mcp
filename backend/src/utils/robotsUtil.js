import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Robots.txt allow check — Requirement 2.2 criterion (c)
 * ============================================================
 *
 *  Lightweight in-memory cache (per process) so we don't re-fetch
 *  robots.txt for every URL on the same host.
 *
 *  - 5-second fetch timeout; on timeout we return "allow" per spec.
 *  - Honors `Disallow:` for the user-agent block matching ours OR `*`.
 *  - Doesn't implement crawl-delay; we self-throttle elsewhere.
 */

const USER_AGENT = "NewsroomMcpBot";
const FETCH_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const cache = new Map(); // host → { rules, expiresAt }

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
};

const parseRobots = (txt) => {
  // Returns { star: { disallow: [], allow: [] }, ours: { ... } }
  const groups = { "*": { disallow: [], allow: [] } };
  let current = null;
  for (const rawLine of String(txt).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    if (!k || !rest.length) continue;
    const key = k.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      const ua = value.toLowerCase();
      if (!groups[ua]) groups[ua] = { disallow: [], allow: [] };
      current = groups[ua];
    } else if (current && key === "disallow") {
      if (value) current.disallow.push(value);
    } else if (current && key === "allow") {
      if (value) current.allow.push(value);
    }
  }
  return groups;
};

const getRules = async (origin) => {
  const cached = cache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.rules;

  let rules;
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      // Treat non-200 as "no rules" → allow.
      rules = { allowAll: true };
    } else {
      const txt = await res.text();
      rules = parseRobots(txt);
    }
  } catch (err) {
    logger.debug("robots.txt fetch failed; allowing", {
      origin,
      message: err.message,
    });
    rules = { allowAll: true };
  }
  cache.set(origin, { rules, expiresAt: Date.now() + CACHE_TTL_MS });
  return rules;
};

const matchPath = (path, rule) => {
  // Simple prefix match; supports `*` wildcard and `$` end-anchor.
  if (!rule) return false;
  const pattern = rule
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  const re = new RegExp(`^${pattern}${rule.endsWith("$") ? "" : ""}`);
  return re.test(path);
};

export const isAllowedByRobots = async (rawUrl) => {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return true;
  }
  const origin = `${u.protocol}//${u.host}`;
  const path = u.pathname + (u.search || "");
  const rules = await getRules(origin);
  if (rules.allowAll) return true;

  // Specific UA wins over star.
  const specific = rules[USER_AGENT.toLowerCase()];
  const star = rules["*"];
  const group = specific || star;
  if (!group) return true;

  // If any allow matches, allow.
  if (group.allow.some((r) => matchPath(path, r))) return true;
  // If any disallow matches, block.
  if (group.disallow.some((r) => matchPath(path, r))) return false;
  return true;
};
