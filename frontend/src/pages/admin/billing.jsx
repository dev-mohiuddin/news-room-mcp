import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Receipt,
  Download,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import ChartCard, {
  CHART_PALETTE,
  CHART_GRID_COLOR,
  CHART_TICK_COLOR,
} from "@/components/shared/ChartCard";
import GlassCard from "@/components/shared/GlassCard";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { dateFormater, cn } from "@/lib/utils";
import {
  fetchAdminBillingSummary,
  fetchAdminInvoices,
} from "@/redux/slice/billing-slice";

export default function AdminBillingPage() {
  const dispatch = useDispatch();

  const summary = useSelector((s) => s.billing.adminSummary);
  const invoices = useSelector((s) => s.billing.adminInvoices);
  const stripeConfigured = useSelector((s) => s.billing.stripeConfigured);

  useEffect(() => {
    dispatch(fetchAdminBillingSummary());
    dispatch(fetchAdminInvoices({ perPage: 20 }));
  }, [dispatch]);

  const kpis = useMemo(() => {
    const mrrCents = summary?.revenue?.mrrCents ?? 0;
    const arrCents = summary?.revenue?.arrCents ?? 0;
    const trend = summary?.revenue?.trendPct ?? null;
    const failed = summary?.failedPayments?.length ?? 0;
    return {
      mrr: mrrCents / 100,
      arr: arrCents / 100,
      trend,
      failed,
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue"
        title="Billing & payments"
        subtitle="Stripe revenue, invoices, and payment failures across the platform."
      />

      {!stripeConfigured && (
        <GlassCard className="p-4 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">
              Stripe is not configured on this deployment.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Set <code className="font-mono">STRIPE_SECRET_KEY</code> +{" "}
              <code className="font-mono">STRIPE_WEBHOOK_SECRET</code> in the
              backend env, configure <code className="font-mono">stripePriceIdMonthly</code>
              {" "}/<code className="font-mono">stripePriceIdYearly</code> on each plan,
              and webhooks will start populating this dashboard.
            </p>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={DollarSign}
          label="MRR"
          value={kpis.mrr}
          prefix="$"
          trend={kpis.trend}
        />
        <KPICard
          icon={DollarSign}
          label="ARR (est.)"
          value={kpis.arr}
          prefix="$"
          glow="teal"
        />
        <KPICard
          icon={TrendingDown}
          label="Months tracked"
          value={summary?.revenue?.monthly?.length || 0}
          decimals={0}
        />
        <KPICard
          icon={AlertTriangle}
          label="Failed payments"
          value={kpis.failed}
          glow="violet"
        />
      </div>

      <ChartCard
        title="Revenue trend"
        subtitle="Last 6 months · paid invoices"
        height={320}
      >
        <ResponsiveContainer>
          <AreaChart data={summary?.revenue?.monthly || []}>
            <defs>
              <linearGradient id="revFillAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={CHART_PALETTE.blue}
                  stopOpacity={0.5}
                />
                <stop
                  offset="100%"
                  stopColor={CHART_PALETTE.blue}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={CHART_TICK_COLOR}
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(6, 12, 26, 0.92)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenueUsd"
              stroke={CHART_PALETTE.blue}
              strokeWidth={2.5}
              fill="url(#revFillAdmin)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Failed payments alert */}
      {summary?.failedPayments?.length > 0 && (
        <GlassCard className="p-5 border border-red-500/20">
          <div className="flex items-start gap-3">
            <span className="h-9 w-9 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <h3 className="font-display text-lg">
                {summary.failedPayments.length} failed payments need attention
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Customers can retry from their billing portal. If the problem
                persists, reach out so they can update their card.
              </p>
              <ul className="mt-4 divide-y divide-white/5 text-sm">
                {summary.failedPayments.map((p) => (
                  <li
                    key={p._id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {p.workspace?.name || "Unknown workspace"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.invoiceNumber}
                        {p.failureMessage ? ` · ${p.failureMessage}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      ${Number(p.amountUsd || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
                      {p.attemptCount || 1} attempt{p.attemptCount === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      )}

      <div>
        <h3 className="font-display text-lg mb-3">Payment history</h3>
        {invoices.length === 0 ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            No invoices recorded yet. Once Stripe webhooks deliver, paid and
            failed invoices will appear here.
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
                key: "workspace",
                header: "Workspace",
                render: (i) => (
                  <span>{i.workspace?.name || "—"}</span>
                ),
              },
              {
                key: "planDisplayName",
                header: "Plan",
                render: (i) => i.planDisplayName || "—",
              },
              {
                key: "amountUsd",
                header: "Amount",
                sortable: true,
                render: (i) => (
                  <span className="tabular-nums">
                    ${Number(i.amountUsd || 0).toFixed(2)}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (i) => <PaymentStatus status={i.status} />,
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
      </div>
    </div>
  );
}

function PaymentStatus({ status }) {
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
