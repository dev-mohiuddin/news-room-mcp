import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CreditCard,
  Check,
  Download,
  ArrowRight,
  Receipt,
  Zap,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import UsageBar from "@/components/shared/UsageBar";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations";
import { dateFormater, cn } from "@/lib/utils";
import {
  fetchMySubscription,
  fetchMyInvoices,
  createCheckoutSession,
  createPortalSession,
} from "@/redux/slice/billing-slice";
import { fetchPublicPlans } from "@/redux/slice/plan-slice";

export default function UserBillingPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [yearly, setYearly] = useState(false);

  const subscription = useSelector((s) => s.billing.subscription);
  const plan = useSelector((s) => s.billing.plan);
  const usage = useSelector((s) => s.billing.usage);
  const paymentMethod = useSelector((s) => s.billing.paymentMethod);
  const invoices = useSelector((s) => s.billing.invoices);
  const stripeConfigured = useSelector((s) => s.billing.stripeConfigured);
  const isLoading = useSelector((s) => s.billing.isLoading);
  const isMutating = useSelector((s) => s.billing.isMutating);

  const publicPlans = useSelector((s) => s.plans.publicList);

  /* Initial load + reload on Stripe redirect */
  useEffect(() => {
    dispatch(fetchMySubscription());
    dispatch(fetchMyInvoices({ perPage: 12 }));
    dispatch(fetchPublicPlans());
  }, [dispatch]);

  /* Handle Stripe-driven success / cancel flags from query string */
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Subscription updated. Welcome to your new plan!");
      // Webhook will have updated the DB; refetch shortly.
      setTimeout(() => dispatch(fetchMySubscription()), 1500);
    } else if (status === "cancelled") {
      toast.info("Checkout cancelled. No changes made.");
    }
    if (status) {
      const next = new URLSearchParams(searchParams);
      next.delete("status");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
    }
  }, [dispatch, searchParams, setSearchParams]);

  const handleUpgrade = async (planCode) => {
    if (!stripeConfigured) {
      toast.error("Billing isn't configured on this deployment yet.");
      return;
    }
    const res = await dispatch(
      createCheckoutSession({
        planCode,
        billingCycle: yearly ? "yearly" : "monthly",
      })
    );
    if (createCheckoutSession.fulfilled.match(res)) {
      const url = res.payload?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Could not open checkout — missing URL");
      }
    } else {
      const code = res.payload?.code;
      const msg = res.payload?.message || "Could not start checkout";
      toast.error(
        code === "PLAN_PRICE_NOT_CONFIGURED"
          ? "This plan needs a Stripe price ID. Ask the admin to configure it."
          : code === "STRIPE_NOT_CONFIGURED"
          ? "Billing isn't configured on this deployment yet."
          : msg
      );
    }
  };

  const handleOpenPortal = async () => {
    if (!stripeConfigured) {
      toast.error("Billing isn't configured on this deployment yet.");
      return;
    }
    const res = await dispatch(createPortalSession());
    if (createPortalSession.fulfilled.match(res)) {
      const url = res.payload?.data?.url;
      if (url) window.location.href = url;
      else toast.error("Could not open billing portal");
    } else {
      const code = res.payload?.code;
      toast.error(
        code === "STRIPE_NOT_CONFIGURED"
          ? "Billing isn't configured on this deployment yet."
          : res.payload?.message || "Could not open portal"
      );
    }
  };

  const sortedPlans = useMemo(
    () =>
      [...publicPlans].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          (a.monthlyPriceCents ?? 0) - (b.monthlyPriceCents ?? 0)
      ),
    [publicPlans]
  );

  const renews = subscription?.currentPeriodEnd
    ? dateFormater(subscription.currentPeriodEnd, "MMM d, yyyy")
    : "—";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Subscription"
        title="Billing & Plan"
        subtitle="Manage your subscription, view usage, and download invoices."
      />

      {!stripeConfigured && (
        <GlassCard className="p-4 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">
              Billing is not yet configured on this deployment.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Plan upgrades and the billing portal are disabled until an admin
              sets <code className="font-mono">STRIPE_SECRET_KEY</code>. Usage
              and invoices still work in read-only mode.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Current plan + usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard glow="violet" className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Current plan
              </p>
              <h3 className="font-display text-3xl mt-1 capitalize gradient-text">
                {isLoading
                  ? "Loading…"
                  : plan?.displayName || subscription?.plan || "—"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {plan?.monthlyPriceCents
                  ? `$${(plan.monthlyPriceCents / 100).toFixed(0)}/month · `
                  : ""}
                Renews {renews}
              </p>
            </div>
            <Badge variant="gradient" className="text-xs capitalize">
              <Zap className="h-3 w-3" />
              {subscription?.status || "active"}
            </Badge>
          </div>

          {subscription?.cancelAtPeriodEnd && (
            <div className="mt-4 rounded-lg p-3 border border-amber-500/30 bg-amber-500/5 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Your subscription is set to cancel at the end of the current
                period. You can keep it active from the billing portal.
              </span>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <UsageBar
              label="Articles"
              value={usage?.articlesUsed ?? 0}
              max={usage?.articleLimit ?? 0}
            />
          </div>

          <div className="mt-6 flex items-center gap-3 pt-4 border-t border-white/5">
            <Button
              variant="glass"
              size="sm"
              onClick={handleOpenPortal}
              disabled={isMutating || !stripeConfigured || !subscription?.hasStripeCustomer}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Manage billing
            </Button>
            {!yearly && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setYearly(true)}
              >
                Switch to yearly (save ~20%)
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Payment method */}
        <GlassCard className="p-6 flex flex-col">
          <h3 className="font-display text-lg mb-4 flex items-center gap-2">
            Payment method
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </h3>
          {paymentMethod?.last4 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg glass border border-white/5 flex-1">
              <CreditCard className="h-8 w-8 text-brand-blue" />
              <div>
                <p className="text-sm font-medium">
                  •••• •••• •••• {paymentMethod.last4}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {paymentMethod.brand || "Card"}
                  {paymentMethod.expMonth && paymentMethod.expYear
                    ? ` · Expires ${String(paymentMethod.expMonth).padStart(
                        2,
                        "0"
                      )}/${String(paymentMethod.expYear).slice(-2)}`
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg glass border border-white/5 flex-1 text-sm text-muted-foreground">
              No payment method on file.
            </div>
          )}
          <Button
            variant="glass"
            size="sm"
            className="mt-4 w-fit"
            onClick={handleOpenPortal}
            disabled={isMutating || !stripeConfigured || !subscription?.hasStripeCustomer}
          >
            Update card
          </Button>
        </GlassCard>
      </div>

      {/* Plan comparison */}
      <section>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-4"
        >
          <h2 className="font-display text-xl">Compare plans</h2>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={cn(
                "text-sm",
                !yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span
              className={cn(
                "text-sm",
                yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Yearly
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Save 20%
            </span>
          </div>
        </motion.div>

        {sortedPlans.length === 0 ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            No plans available yet.
          </GlassCard>
        ) : (
          <motion.div
            variants={staggerContainer(0.06)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {sortedPlans.map((p) => {
              const isCurrent = p.code === subscription?.plan;
              const monthly = (p.monthlyPriceCents ?? 0) / 100;
              const yearlyMonthly =
                p.yearlyPriceCents ? p.yearlyPriceCents / 100 / 12 : monthly;
              const price = yearly ? yearlyMonthly : monthly;
              const isCheaper =
                (p.monthlyPriceCents ?? 0) <
                (plan?.monthlyPriceCents ?? 0);
              const cta =
                isCurrent
                  ? "Current plan"
                  : (p.monthlyPriceCents ?? 0) === 0
                  ? "Switch to free"
                  : isCheaper
                  ? "Downgrade"
                  : "Upgrade";

              return (
                <motion.div key={p._id || p.code} variants={staggerItem}>
                  <GlassCard
                    hover
                    glow={p.highlight ? "blue" : null}
                    className={cn(
                      "p-5 h-full flex flex-col relative",
                      isCurrent && "ring-2 ring-primary/30"
                    )}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest gradient-bg text-white px-2.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    <h4 className="font-display text-lg">{p.displayName}</h4>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <span className="font-display text-3xl">
                        {price.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs flex-1">
                      {(p.features || []).slice(0, 6).map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 mt-0.5 text-brand-teal shrink-0" />
                          <span className="text-muted-foreground">
                            {typeof f === "string" ? f : f.label}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <Button
                        variant="glass"
                        size="sm"
                        className="mt-5 w-full"
                        disabled
                      >
                        Current plan
                      </Button>
                    ) : (
                      <GradientButton
                        size="sm"
                        className="mt-5 w-full"
                        disabled={isMutating || !stripeConfigured}
                        onClick={() => handleUpgrade(p.code)}
                      >
                        {cta} <ArrowRight className="h-3.5 w-3.5" />
                      </GradientButton>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* Invoice history */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Invoice history</h2>
        </div>

        {invoices.length === 0 ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            No invoices yet. Invoices appear here once your first payment
            settles.
          </GlassCard>
        ) : (
          <DataTable
            data={invoices}
            columns={[
              {
                key: "invoiceNumber",
                header: "Invoice",
                render: (i) => (
                  <span className="font-mono text-xs flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    {i.invoiceNumber || i._id?.slice(-6)}
                  </span>
                ),
              },
              {
                key: "createdAt",
                header: "Date",
                sortable: true,
                render: (i) => (
                  <span className="text-xs text-muted-foreground">
                    {dateFormater(
                      i.paidAt || i.failedAt || i.createdAt,
                      "MMM d, yyyy"
                    )}
                  </span>
                ),
              },
              {
                key: "planDisplayName",
                header: "Plan",
                render: (i) => (
                  <span className="capitalize">
                    {i.planDisplayName || "—"}
                  </span>
                ),
              },
              {
                key: "amountUsd",
                header: "Amount",
                render: (i) => (
                  <span className="tabular-nums">
                    ${Number(i.amountUsd || 0).toFixed(2)}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (i) => <InvoiceStatus status={i.status} />,
              },
              {
                key: "paymentMethodLast4",
                header: "Method",
                render: (i) =>
                  i.paymentMethodLast4 ? (
                    <span className="text-xs">
                      {i.paymentMethodBrand
                        ? `${i.paymentMethodBrand} •••• ${i.paymentMethodLast4}`
                        : `•••• ${i.paymentMethodLast4}`}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  ),
              },
              {
                key: "actions",
                header: "",
                className: "w-12",
                render: (i) =>
                  i.invoicePdf || i.hostedInvoiceUrl ? (
                    <a
                      href={i.invoicePdf || i.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download invoice"
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  ) : null,
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function InvoiceStatus({ status }) {
  const map = {
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    refunded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    void: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    uncollectible: "bg-red-500/15 text-red-400 border-red-500/30",
    draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full border capitalize",
        map[status] || map.open
      )}
    >
      {status}
    </span>
  );
}
