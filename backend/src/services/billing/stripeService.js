import {
  getStripe,
  assertStripeForWrite,
  isStripeConfigured,
  handleStripeError,
} from "#services/external/stripeClient.js";
import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { findPlanByCode } from "#repositories/planRepository.js";
import {
  findByWorkspaceId as findSubscriptionByWorkspace,
  ensureSubscription,
  updateStripeLinkage,
} from "#repositories/subscriptionRepository.js";
import { findUserById } from "#repositories/userRepository.js";

/**
 * ============================================================
 *  Stripe Service
 * ============================================================
 *
 *  Public surface used by the billing controller:
 *    - createCheckoutSession({ workspaceId, planCode, billingCycle })
 *    - createBillingPortalSession({ workspaceId })
 *    - getOrCreateCustomer({ workspaceId, user })
 *
 *  All Stripe writes route through `assertStripeForWrite()` so missing
 *  keys produce a structured 503 with `code: "STRIPE_NOT_CONFIGURED"`
 *  instead of crashing the request.
 */

const APP_ORIGIN = () =>
  process.env.CLIENT_APP_ORIGIN || "http://localhost:5173";

/**
 * Returns an existing Stripe customer ID for the workspace OR creates
 * a fresh one and persists it on the Subscription doc.
 */
export const getOrCreateCustomer = async ({ workspace, user }) => {
  const stripe = assertStripeForWrite();
  const sub = await ensureSubscription(workspace._id);

  if (sub.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(sub.stripeCustomerId);
      if (customer && !customer.deleted) return customer;
    } catch (err) {
      logger.warn("[stripe] cached customer fetch failed; recreating", {
        message: err.message,
      });
    }
  }

  let customer;
  try {
    customer = await stripe.customers.create({
      email: user?.email,
      name: workspace.name,
      metadata: {
        workspaceId: String(workspace._id),
        ownerUserId: String(user?.id || workspace.ownerId || ""),
      },
    });
  } catch (err) {
    handleStripeError(err, "stripe:create_customer");
  }

  await updateStripeLinkage(workspace._id, {
    stripeCustomerId: customer.id,
  });
  return customer;
};

/**
 * Resolve which Stripe Price ID to use given a plan code + billing cycle.
 * Refuses to proceed if the plan has no matching price ID configured.
 */
const resolvePriceId = async (planCode, billingCycle = "monthly") => {
  const plan = await findPlanByCode(planCode);
  if (!plan) throwError("Plan not found", 404);
  if (!plan.isActive) throwError("Plan is not available for purchase", 400);

  const priceId =
    billingCycle === "yearly"
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;

  if (!priceId) {
    throwError(
      `Plan '${plan.code}' has no Stripe price configured for ${billingCycle} billing. Add it from /admin/plans.`,
      503,
      { code: "PLAN_PRICE_NOT_CONFIGURED" }
    );
  }
  return { plan, priceId };
};

/**
 * Create a Stripe Checkout session for a plan upgrade / new subscription.
 *
 * The session redirects to:
 *   - successUrl: /dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}
 *   - cancelUrl:  /dashboard/billing?status=cancelled
 *
 * Webhook `checkout.session.completed` finalises the linkage server-side.
 */
export const createCheckoutSession = async ({
  workspace,
  user,
  planCode,
  billingCycle = "monthly",
}) => {
  const stripe = assertStripeForWrite();
  const customer = await getOrCreateCustomer({ workspace, user });
  const { plan, priceId } = await resolvePriceId(planCode, billingCycle);

  const origin = APP_ORIGIN();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?status=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        metadata: {
          workspaceId: String(workspace._id),
          planCode: plan.code,
          billingCycle,
        },
      },
      metadata: {
        workspaceId: String(workspace._id),
        planCode: plan.code,
        billingCycle,
      },
    });

    logger.info("[stripe] checkout session created", {
      sessionId: session.id,
      workspaceId: String(workspace._id),
      planCode: plan.code,
      billingCycle,
    });

    return {
      sessionId: session.id,
      url: session.url,
      planCode: plan.code,
      billingCycle,
    };
  } catch (err) {
    handleStripeError(err, "stripe:create_checkout");
  }
  return null;
};

/**
 * Create a Stripe Customer Portal session — lets users update card,
 * cancel, switch plans on Stripe-hosted UI.
 */
export const createBillingPortalSession = async ({ workspace, user }) => {
  const stripe = assertStripeForWrite();
  const customer = await getOrCreateCustomer({ workspace, user });

  const origin = APP_ORIGIN();
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/dashboard/billing`,
    });
    return { url: session.url };
  } catch (err) {
    handleStripeError(err, "stripe:create_portal");
  }
  return null;
};

/**
 * For the user-facing billing page — combines the workspace's Subscription
 * doc with a live Stripe payment-method peek (so users see "•••• 4242").
 *
 * If Stripe isn't configured or the customer isn't linked yet, returns
 * the local subscription only.
 */
export const getPaymentMethodSummary = async (workspaceId) => {
  if (!isStripeConfigured()) return null;
  const sub = await findSubscriptionByWorkspace(workspaceId);
  if (!sub?.stripeCustomerId) return null;

  const stripe = getStripe();
  try {
    const customer = await stripe.customers.retrieve(sub.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return null;
    const pm = customer.invoice_settings?.default_payment_method;
    if (!pm || typeof pm === "string") return null;
    return {
      brand: pm.card?.brand || null,
      last4: pm.card?.last4 || null,
      expMonth: pm.card?.exp_month || null,
      expYear: pm.card?.exp_year || null,
    };
  } catch (err) {
    logger.warn("[stripe] payment method peek failed", {
      message: err.message,
    });
    return null;
  }
};

/**
 * Re-export configuration check so the controller can shortcut without
 * a service round-trip.
 */
export { isStripeConfigured };

/**
 * Resolve a User from req for ownership context — used by checkout/portal
 * controllers. Falls back to looking up the workspace owner if `req.user`
 * doesn't carry an email yet.
 */
export const resolveActorIdentity = async (req) => {
  const id = req?.user?.id;
  if (!id) return null;
  const user = await findUserById(id, { populateRole: false });
  if (!user) return null;
  return { id: user._id.toString(), email: user.email, name: user.name };
};
