import express from "express";
import { stripeWebhook } from "#controllers/billing/stripeWebhookController.js";

/**
 * Stripe webhook router.
 *
 * IMPORTANT — must be mounted BEFORE `express.json()` in app.js so
 * Stripe's raw-body signature verification works. We do this by
 * exporting a small router that uses `express.raw()` itself, and
 * mounting the router as the very first thing in app.js.
 */
export const stripeWebhookRouter = express.Router();

stripeWebhookRouter.post(
  "/api/v1/billing/stripe/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhook
);

export default stripeWebhookRouter;
