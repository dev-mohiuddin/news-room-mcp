import Stripe from "stripe";
import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";

/**
 * ============================================================
 *  Stripe SDK singleton — graceful "not configured" mode
 * ============================================================
 *
 *  Boot-time policy:
 *    - If `STRIPE_SECRET_KEY` is missing OR a placeholder, the SDK is
 *      not instantiated. All callers either get `null` (read paths) or
 *      a structured 503 (write paths).
 *    - This keeps the project bootable for local development without
 *      Stripe credentials, and for CI test environments.
 *
 *  In production the keys are required — `assertStripeForWrite()` throws
 *  a 503 with `code: "STRIPE_NOT_CONFIGURED"` so the frontend can show a
 *  user-friendly message instead of a generic crash.
 */

const PLACEHOLDER_PREFIXES = ["change-this", "placeholder", "your_", "sk_test_REPLACE"];

const isPlaceholder = (val) => {
  if (!val || typeof val !== "string") return true;
  const v = val.trim();
  if (v.length < 8) return true;
  return PLACEHOLDER_PREFIXES.some((prefix) =>
    v.toLowerCase().startsWith(prefix.toLowerCase())
  );
};

let stripeSingleton = null;
let initLogged = false;

export const getStripe = () => {
  if (stripeSingleton) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY;
  if (isPlaceholder(key)) {
    if (!initLogged) {
      logger.warn(
        "[stripe] STRIPE_SECRET_KEY missing or placeholder — Stripe paths disabled"
      );
      initLogged = true;
    }
    return null;
  }
  stripeSingleton = new Stripe(key, {
    /**
     *  Pinned to the latest stable Stripe API release.
     *  Bump deliberately — newer versions remove `invoice.subscription`
     *  in favour of `invoice.parent.subscription_details.subscription`
     *  (handled defensively in stripeWebhookService.js).
     */
    apiVersion: "2024-12-18.acacia",
    appInfo: { name: "Newsroom MCP", version: "1.0.0" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
  if (!initLogged) {
    logger.info("[stripe] SDK initialized");
    initLogged = true;
  }
  return stripeSingleton;
};

export const isStripeConfigured = () => Boolean(getStripe());

export const getWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return isPlaceholder(secret) ? null : secret;
};

/**
 * Use at the top of any controller that performs a Stripe write.
 * Throws an HTTP 503 with a stable code so the FE can branch on it.
 */
export const assertStripeForWrite = () => {
  const stripe = getStripe();
  if (!stripe) {
    throwError(
      "Billing is not configured on this deployment. Contact the admin.",
      503,
      { code: "STRIPE_NOT_CONFIGURED" }
    );
  }
  return stripe;
};

/**
 * Common Stripe error mapper — turns Stripe SDK errors into the same
 * structured AppError shape the rest of the API uses.
 */
export const handleStripeError = (err, context = "stripe") => {
  if (!err) return;
  const code = err.code || err.type || "stripe_error";
  const status =
    err.statusCode ||
    (code === "resource_missing" ? 404 :
      code === "rate_limit" ? 429 :
        err.type === "StripeAuthenticationError" ? 502 :
          err.type === "StripeConnectionError" ? 503 : 502);
  logger.warn(`[${context}] stripe error`, {
    code,
    message: err.message,
    type: err.type,
  });
  throwError(err.message || "Payment provider error", status, { code });
};
