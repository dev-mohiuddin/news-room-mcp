import { logger } from "#utils/logger.js";
import {
  verifyAndParse,
  dispatchEvent,
} from "#services/billing/stripeWebhookService.js";

/**
 * Stripe webhook entrypoint.
 *
 *  - Mounted at `POST /api/v1/billing/stripe/webhook`
 *  - The route is mounted with `express.raw({ type: "application/json" })`
 *    BEFORE the global JSON parser so signature verification works.
 *  - We always 200 to Stripe for handler errors so they're not retried
 *    indefinitely on poisoned events; we log them server-side instead.
 *  - Signature verification failures return 400 (Stripe retries those).
 */
export const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    logger.warn("[webhook] missing stripe-signature header");
    return res.status(400).send("Missing signature");
  }

  let event;
  try {
    // express.raw provides a Buffer in req.body
    event = verifyAndParse(req.body, signature);
  } catch (err) {
    logger.warn("[webhook] signature verification failed", {
      message: err.message,
      code: err.code,
    });
    const status = err.statusCode === 503 ? 503 : 400;
    return res.status(status).send(err.message);
  }

  try {
    await dispatchEvent(event);
    return res.status(200).json({ received: true, type: event.type });
  } catch (err) {
    logger.error("[webhook] dispatch failed", {
      type: event.type,
      message: err.message,
    });
    // Return 200 so Stripe doesn't retry on developer bugs.
    // Persistent failures are caught via the audit log + admin observability.
    return res.status(200).json({
      received: true,
      type: event.type,
      handled: false,
      error: err.message,
    });
  }
};
