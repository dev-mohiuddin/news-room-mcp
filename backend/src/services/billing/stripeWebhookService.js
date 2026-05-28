import { logger } from "#utils/logger.js";
import {
  getStripe,
  getWebhookSecret,
  isStripeConfigured,
} from "#services/external/stripeClient.js";
import {
  findByStripeCustomerId,
  findByStripeSubscriptionId,
  applyPlanChange,
  updateStripeLinkage,
} from "#repositories/subscriptionRepository.js";
import {
  upsertByStripeInvoiceId,
} from "#repositories/paymentRepository.js";
import { findPlanByCode } from "#repositories/planRepository.js";
import { findWorkspaceById } from "#repositories/workspaceRepository.js";
import * as notificationService from "#services/notification/notificationService.js";
import { logAudit } from "#utils/auditLogger.js";

/**
 * ============================================================
 *  Stripe Webhook Service
 * ============================================================
 *
 *  Verifies signature, parses event, dispatches to per-event handlers.
 *  Webhook deliveries are idempotent — repeated events MUST produce
 *  the same DB state. We rely on:
 *    - upsert-by-stripeInvoiceId for payments
 *    - findOneAndUpdate-by-stripeSubscriptionId for subscriptions
 *
 *  Handler return values are not used by Stripe — but we log every
 *  step for observability (failed webhooks are the #1 billing bug).
 */

export const verifyAndParse = (rawBody, signature) => {
  const stripe = getStripe();
  if (!stripe) {
    throw Object.assign(new Error("Stripe is not configured"), {
      statusCode: 503,
      code: "STRIPE_NOT_CONFIGURED",
    });
  }
  const secret = getWebhookSecret();
  if (!secret) {
    throw Object.assign(new Error("Webhook secret missing"), {
      statusCode: 503,
      code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
    });
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
};

/* ── Helpers ── */

const planCodeFromStripeSub = async (stripeSub) => {
  // Try metadata first (we set it on creation)
  const meta = stripeSub.metadata?.planCode;
  if (meta) return meta;
  // Fall back to looking up by Stripe price ID
  const priceId = stripeSub.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  const { Plan } = await import("#models/planModel.js");
  const plan = await Plan.findOne({
    $or: [
      { stripePriceIdMonthly: priceId },
      { stripePriceIdYearly: priceId },
    ],
  }).lean();
  return plan?.code || null;
};

/* ──────────────────────────────────────────────────────────
 *  Defensive helpers — Stripe field shapes change across API
 *  versions. These accessors read both the legacy + modern
 *  shapes so the API-version pin can be bumped without
 *  rewriting handler code.
 * ────────────────────────────────────────────────────────── */

/** Find subscription id on an invoice across API versions. */
const invoiceSubscriptionId = (invoice) => {
  if (!invoice) return null;
  // Legacy (≤ 2024-09-30): top-level `subscription`
  if (typeof invoice.subscription === "string") return invoice.subscription;
  if (invoice.subscription?.id) return invoice.subscription.id;
  // Modern (2024-10+): nested under invoice.parent
  const parent = invoice.parent?.subscription_details;
  if (parent?.subscription) {
    return typeof parent.subscription === "string"
      ? parent.subscription
      : parent.subscription?.id || null;
  }
  // Some events embed the subscription line item
  const line = invoice.lines?.data?.[0]?.parent?.subscription_item_details;
  if (line?.subscription) return line.subscription;
  return null;
};

/** Find planCode metadata on an invoice across API versions. */
const invoicePlanCodeMeta = (invoice) =>
  invoice?.subscription_details?.metadata?.planCode ||
  invoice?.parent?.subscription_details?.metadata?.planCode ||
  invoice?.metadata?.planCode ||
  null;

/** Read current period start/end from a subscription (sub-level OR item-level). */
const subscriptionPeriod = (stripeSub) => {
  if (!stripeSub) return { start: null, end: null };
  // Legacy: directly on the subscription
  let start = stripeSub.current_period_start;
  let end = stripeSub.current_period_end;
  // Modern: pull from the first item
  if (!start || !end) {
    const item = stripeSub.items?.data?.[0];
    start = start || item?.current_period_start;
    end = end || item?.current_period_end;
  }
  return {
    start: start ? new Date(start * 1000) : null,
    end: end ? new Date(end * 1000) : null,
  };
};

const subStatusFromStripe = (stripe) => {
  const map = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    /**
     *  Treat `incomplete` as past_due — closer to truth than
     *  optimistically activating the workspace before the first
     *  successful charge clears 3-D Secure. A subsequent
     *  `customer.subscription.updated` flips it to `active`.
     */
    incomplete: "past_due",
    incomplete_expired: "canceled",
    paused: "canceled",
  };
  return map[stripe] || "active";
};

const findWorkspaceForStripeCustomer = async (customerId) => {
  const sub = await findByStripeCustomerId(customerId);
  if (!sub) return null;
  return { subscription: sub, workspaceId: sub.workspaceId };
};

const findOwnerUserId = async (workspaceId) => {
  const ws = await findWorkspaceById(workspaceId);
  return ws?.ownerId?.toString() || null;
};

/* ──────────────────────────────────────────────────────────
 *  Per-event handlers
 * ────────────────────────────────────────────────────────── */

const handleCheckoutCompleted = async (event) => {
  const session = event.data.object;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const planCode = session.metadata?.planCode;
  const workspaceId = session.metadata?.workspaceId;
  if (!workspaceId) {
    logger.warn("[webhook] checkout.session.completed missing workspaceId metadata", {
      sessionId: session.id,
    });
    return;
  }

  await updateStripeLinkage(workspaceId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    ...(planCode ? { plan: planCode } : {}),
    status: "active",
  });

  const plan = planCode ? await findPlanByCode(planCode) : null;

  await notificationService.notifyWorkspace({
    workspaceId,
    type: "success",
    category: "billing",
    title: plan ? `You're on the ${plan.displayName} plan` : "Subscription activated",
    body: "Welcome aboard. Your workspace has been upgraded.",
    link: "/dashboard/billing",
    metadata: { planCode, source: "stripe.checkout" },
  }).catch((err) => logger.warn("[webhook] notify failed", { message: err.message }));

  await logAudit({
    actor: null,
    actorEmail: "stripe",
    actorRole: "system",
    category: "billing",
    action: "checkout.completed",
    entityType: "subscription",
    workspaceId,
    after: { customerId, subscriptionId, planCode },
  });
};

const handleSubscriptionUpdated = async (event) => {
  const sub = event.data.object;
  const planCode = await planCodeFromStripeSub(sub);
  const status = subStatusFromStripe(sub.status);
  const { start: periodStart, end: periodEnd } = subscriptionPeriod(sub);

  let lookup = await findByStripeSubscriptionId(sub.id);
  if (!lookup && sub.customer) {
    const byCustomer = await findWorkspaceForStripeCustomer(sub.customer);
    if (byCustomer) lookup = byCustomer.subscription;
  }
  if (!lookup) {
    logger.warn("[webhook] subscription.updated: no matching workspace", {
      stripeSubscriptionId: sub.id,
    });
    return;
  }

  const before = {
    plan: lookup.plan,
    status: lookup.status,
    cancelAtPeriodEnd: lookup.cancelAtPeriodEnd,
  };

  await applyPlanChange(lookup.workspaceId, {
    plan: planCode || lookup.plan,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  });
  await updateStripeLinkage(lookup.workspaceId, {
    stripeSubscriptionId: sub.id,
  });

  if (planCode && planCode !== before.plan) {
    const plan = await findPlanByCode(planCode);
    await notificationService.notifyWorkspace({
      workspaceId: lookup.workspaceId,
      type: "success",
      category: "billing",
      title: `Plan changed to ${plan?.displayName || planCode}`,
      body: "Your subscription has been updated.",
      link: "/dashboard/billing",
      metadata: { from: before.plan, to: planCode, source: "stripe" },
    }).catch(() => {});
  } else if (!before.cancelAtPeriodEnd && sub.cancel_at_period_end) {
    await notificationService.notifyWorkspace({
      workspaceId: lookup.workspaceId,
      type: "warning",
      category: "billing",
      title: "Subscription will cancel at period end",
      body: "You'll keep access until the end of the current billing period.",
      link: "/dashboard/billing",
      metadata: { source: "stripe" },
    }).catch(() => {});
  }

  await logAudit({
    actorEmail: "stripe",
    actorRole: "system",
    category: "billing",
    action: "subscription.updated",
    entityType: "subscription",
    workspaceId: lookup.workspaceId,
    before,
    after: { plan: planCode, status, cancelAtPeriodEnd: sub.cancel_at_period_end },
  });
};

const handleSubscriptionDeleted = async (event) => {
  const sub = event.data.object;
  const lookup = await findByStripeSubscriptionId(sub.id);
  if (!lookup) return;

  await applyPlanChange(lookup.workspaceId, {
    status: "canceled",
    cancelAtPeriodEnd: false,
  });

  await notificationService.notifyWorkspace({
    workspaceId: lookup.workspaceId,
    type: "warning",
    category: "billing",
    title: "Subscription cancelled",
    body: "Your workspace has been moved to the free tier.",
    link: "/dashboard/billing",
    metadata: { source: "stripe" },
  }).catch(() => {});

  await logAudit({
    actorEmail: "stripe",
    actorRole: "system",
    category: "billing",
    action: "subscription.cancelled",
    entityType: "subscription",
    workspaceId: lookup.workspaceId,
  });
};

const handleInvoicePaid = async (event) => {
  const invoice = event.data.object;
  if (!invoice.id) return;

  let workspaceId = null;
  if (invoice.customer) {
    const byCustomer = await findWorkspaceForStripeCustomer(invoice.customer);
    if (byCustomer) workspaceId = byCustomer.workspaceId;
  }

  const planCode = invoicePlanCodeMeta(invoice);
  const planDisplay = planCode ? (await findPlanByCode(planCode))?.displayName : null;
  const subscriptionId = invoiceSubscriptionId(invoice);
  const charge = invoice.charge && typeof invoice.charge === "object"
    ? invoice.charge
    : null;
  const card = charge?.payment_method_details?.card || null;

  await upsertByStripeInvoiceId(invoice.id, {
    workspaceId,
    invoiceNumber: invoice.number || invoice.id,
    description: invoice.description || invoice.lines?.data?.[0]?.description || null,
    planCode,
    planDisplayName: planDisplay,
    amountCents: invoice.amount_paid || invoice.total || 0,
    amountRefundedCents: 0,
    currency: (invoice.currency || "usd").toUpperCase(),
    status: "paid",
    attemptCount: invoice.attempt_count || 1,
    stripeInvoiceId: invoice.id,
    stripeChargeId: typeof invoice.charge === "string" ? invoice.charge : charge?.id || null,
    stripeCustomerId: invoice.customer || null,
    stripeSubscriptionId: subscriptionId,
    stripeHostedInvoiceUrl: invoice.hosted_invoice_url || null,
    stripeInvoicePdf: invoice.invoice_pdf || null,
    paymentMethodBrand: card?.brand || null,
    paymentMethodLast4: card?.last4 || null,
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
    issuedAt: invoice.created ? new Date(invoice.created * 1000) : null,
    failureMessage: null,
  });

  if (workspaceId) {
    await logAudit({
      actorEmail: "stripe",
      actorRole: "system",
      category: "billing",
      action: "invoice.paid",
      entityType: "invoice",
      workspaceId,
      after: {
        invoiceNumber: invoice.number || invoice.id,
        amountCents: invoice.amount_paid,
      },
    });
  }
};

const handleInvoicePaymentFailed = async (event) => {
  const invoice = event.data.object;
  if (!invoice.id) return;

  let workspaceId = null;
  if (invoice.customer) {
    const byCustomer = await findWorkspaceForStripeCustomer(invoice.customer);
    if (byCustomer) workspaceId = byCustomer.workspaceId;
  }

  const planCode = invoicePlanCodeMeta(invoice);
  const subscriptionId = invoiceSubscriptionId(invoice);

  await upsertByStripeInvoiceId(invoice.id, {
    workspaceId,
    invoiceNumber: invoice.number || invoice.id,
    description: invoice.description || invoice.lines?.data?.[0]?.description || null,
    planCode,
    amountCents: invoice.amount_due || invoice.total || 0,
    currency: (invoice.currency || "usd").toUpperCase(),
    status: "failed",
    attemptCount: invoice.attempt_count || 1,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customer || null,
    stripeSubscriptionId: subscriptionId,
    stripeHostedInvoiceUrl: invoice.hosted_invoice_url || null,
    stripeInvoicePdf: invoice.invoice_pdf || null,
    failureMessage: invoice.last_finalization_error?.message ||
      invoice.last_payment_error?.message || null,
    failedAt: new Date(),
    issuedAt: invoice.created ? new Date(invoice.created * 1000) : null,
  });

  if (workspaceId) {
    await notificationService.notifyWorkspace({
      workspaceId,
      type: "error",
      category: "billing",
      title: "Payment failed",
      body: "We couldn't charge your card. Please update your payment method to avoid service interruption.",
      link: "/dashboard/billing",
      metadata: {
        invoiceNumber: invoice.number || invoice.id,
        amountCents: invoice.amount_due,
        source: "stripe",
      },
    }).catch(() => {});

    await logAudit({
      actorEmail: "stripe",
      actorRole: "system",
      category: "billing",
      action: "invoice.payment_failed",
      entityType: "invoice",
      workspaceId,
      status: "warning",
      after: {
        invoiceNumber: invoice.number || invoice.id,
        amountCents: invoice.amount_due,
      },
    });
  }
};

const handleChargeRefunded = async (event) => {
  const charge = event.data.object;
  if (!charge.invoice) return;
  const invoiceId = typeof charge.invoice === "string"
    ? charge.invoice
    : charge.invoice.id;

  const refunded = charge.amount_refunded || 0;
  await upsertByStripeInvoiceId(invoiceId, {
    amountRefundedCents: refunded,
    status: "refunded",
    refundedAt: new Date(),
  });
};

/* ──────────────────────────────────────────────────────────
 *  Dispatcher
 * ────────────────────────────────────────────────────────── */

const handlers = {
  "checkout.session.completed": handleCheckoutCompleted,
  "customer.subscription.created": handleSubscriptionUpdated,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "invoice.paid": handleInvoicePaid,
  "invoice.payment_succeeded": handleInvoicePaid,
  "invoice.payment_failed": handleInvoicePaymentFailed,
  "charge.refunded": handleChargeRefunded,
};

export const dispatchEvent = async (event) => {
  if (!isStripeConfigured()) {
    logger.warn("[webhook] received event but Stripe not configured", {
      type: event?.type,
    });
    return { handled: false, reason: "not_configured" };
  }
  const handler = handlers[event.type];
  if (!handler) {
    logger.debug("[webhook] no handler for event", { type: event.type });
    return { handled: false, reason: "no_handler" };
  }
  try {
    await handler(event);
    return { handled: true };
  } catch (err) {
    logger.error("[webhook] handler crashed", {
      type: event.type,
      eventId: event.id,
      message: err.message,
      stack: err.stack,
    });
    /**
     *  Dead-letter the failure:
     *    1. Persistent audit log entry (`billing.webhook_dead_letter`)
     *       so admins can inspect the raw event id + reason.
     *    2. Best-effort super-admin notification so a human is alerted
     *       to investigate before billing-related data goes stale.
     *
     *  Both are best-effort so we never re-throw and trigger another
     *  Stripe retry storm — we always re-throw the original error to
     *  the controller, which still 200s the response per design.
     */
    try {
      await logAudit({
        actorEmail: "stripe",
        actorRole: "system",
        category: "billing",
        action: "webhook.dead_letter",
        entityType: "stripe_event",
        entityId: event.id,
        status: "error",
        after: {
          type: event.type,
          eventId: event.id,
          message: err.message?.slice(0, 240),
        },
      });
    } catch (auditErr) {
      logger.warn("[webhook] dead-letter audit failed", {
        message: auditErr.message,
      });
    }
    try {
      await notifySuperAdminsOfDeadLetter(event, err);
    } catch (notifyErr) {
      logger.warn("[webhook] dead-letter notification failed", {
        message: notifyErr.message,
      });
    }
    throw err;
  }
};

/**
 *  Notify every active super-admin so a human is paged to investigate
 *  webhook failures. Lazy-imported to avoid a circular dependency
 *  between billing → notification → audit-logger.
 */
const notifySuperAdminsOfDeadLetter = async (event, err) => {
  const { User } = await import("#models/userModel.js");
  const { Role } = await import("#models/roleModel.js");
  const superRole = await Role.findOne({ name: "super_admin" }).lean();
  if (!superRole) return;
  const admins = await User.find({
    roleId: superRole._id,
    isActive: true,
  })
    .select("_id")
    .lean();
  for (const admin of admins) {
    await notificationService
      .notifyUser({
        recipientUserId: admin._id,
        type: "error",
        category: "system",
        title: "Stripe webhook failed",
        body: `Event ${event.type} (id ${event.id}) crashed: ${
          err.message?.slice(0, 160) || "unknown error"
        }`,
        link: "/admin/billing",
        metadata: { eventId: event.id, eventType: event.type },
      })
      .catch(() => {});
  }
};
