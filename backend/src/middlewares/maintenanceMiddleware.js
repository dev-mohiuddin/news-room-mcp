import { getMaintenanceState } from "#services/system/systemSettingsService.js";
import { verifyAccessToken } from "#utils/jwtUtil.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Maintenance-mode middleware
 * ============================================================
 *
 *  Mounted on `/api` BEFORE the v1 router, AFTER the Stripe webhook
 *  route, and AFTER the health route. Tenant-facing endpoints return
 *  HTTP 503 with a structured body the frontend can render as a
 *  friendly banner (`code: "MAINTENANCE_MODE"`).
 *
 *  Bypass rules:
 *    1. `/api/v1/auth/...`  — admins must be able to sign in to disable it
 *    2. Stripe webhook (mounted before this middleware)
 *    3. Health (mounted before this middleware)
 *    4. `/api/v1/settings/public` — landing & maintenance banner reads
 *    5. Wildcard / platform.settings:manage perm → admin bypass
 *       (decoded inline from the access token cookie / Authorization
 *       header so we don't need `protect` to have run yet)
 *
 *  Reads use a 5-second in-memory cache so the cost per request is
 *  near-zero.
 */

const ALWAYS_ALLOW_EXACT = new Set([
  "/api/v1/settings/public",
  "/api/v1/track/view",
]);

const ALWAYS_ALLOW_PREFIXES = [
  "/api/v1/auth/",
  "/api/v1/billing/stripe/webhook",
];

const matchesAllowList = (url) => {
  if (ALWAYS_ALLOW_EXACT.has(url)) return true;
  return ALWAYS_ALLOW_PREFIXES.some((p) => url.startsWith(p));
};

const decodeUserPermsSafely = (req) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }
  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }
  if (!token) return [];
  try {
    const decoded = verifyAccessToken(token);
    return Array.isArray(decoded?.permissions) ? decoded.permissions : [];
  } catch {
    return [];
  }
};

export const maintenanceGuard = async (req, res, next) => {
  // Read failures must NEVER lock users out.
  let state;
  try {
    state = await getMaintenanceState();
  } catch (err) {
    logger.warn("[maintenance] settings read failed; allowing request", {
      message: err.message,
    });
    return next();
  }

  if (!state.enabled) return next();

  const url = req.originalUrl?.split("?")[0] || req.url || "";
  if (matchesAllowList(url)) return next();

  if (state.allowAdminBypass) {
    const perms = decodeUserPermsSafely(req);
    if (perms.includes("*") || perms.includes("platform.settings:manage")) {
      return next();
    }
  }

  return res.status(503).json({
    success: false,
    statusCode: 503,
    message: state.message,
    data: { code: "MAINTENANCE_MODE" },
    request: {
      method: req.method,
      url: req.originalUrl,
      requestId: req.requestId || null,
    },
  });
};

export default maintenanceGuard;
