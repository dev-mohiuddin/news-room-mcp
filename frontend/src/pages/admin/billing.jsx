import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingDown, AlertTriangle, Receipt, Download } from "lucide-react";

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
import { dateFormater } from "@/lib/utils";
import { REVENUE_6M, MOCK_PAYMENTS, MOCK_FAILED_PAYMENTS } from "@/lib/mockData";

export default function AdminBillingPage() {
  const kpis = useMemo(() => {
    const mrr = REVENUE_6M[REVENUE_6M.length - 1].revenue;
    const prev = REVENUE_6M[REVENUE_6M.length - 2].revenue;
    const trend = +(((mrr - prev) / prev) * 100).toFixed(1);
    return { mrr, arr: mrr * 12, trend, churn: 2.4, failed: MOCK_FAILED_PAYMENTS.length };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue"
        title="Billing & payments"
        subtitle="Stripe revenue, invoices, and payment failures across the platform."
        actions={
          <Button variant="glass">
            <Download className="h-4 w-4" /> Export invoices
          </Button>
        }
      />

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
          label="ARR"
          value={kpis.arr}
          prefix="$"
          glow="teal"
        />
        <KPICard
          icon={TrendingDown}
          label="Churn rate"
          value={kpis.churn}
          suffix="%"
          decimals={1}
          trend={-0.4}
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
        subtitle="Last 6 months · Stripe net"
        height={320}
      >
        <ResponsiveContainer>
          <AreaChart data={REVENUE_6M}>
            <defs>
              <linearGradient id="revFill2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_PALETTE.blue} stopOpacity={0.5} />
                <stop offset="100%" stopColor={CHART_PALETTE.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
            <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(6, 12, 26, 0.92)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={CHART_PALETTE.blue}
              strokeWidth={2.5}
              fill="url(#revFill2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Failed payments alert */}
      <GlassCard className="p-5 border border-red-500/20">
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/30">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-lg">
              {MOCK_FAILED_PAYMENTS.length} failed payments need attention
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Retry" to attempt charging again, or contact the customer to update their card.
            </p>
            <ul className="mt-4 divide-y divide-white/5 text-sm">
              {MOCK_FAILED_PAYMENTS.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{p.user}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <span className="font-semibold tabular-nums">${p.amount}</span>
                  <span className="text-xs text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
                    {p.attempts} attempts
                  </span>
                  <Button variant="glass" size="sm">
                    Retry
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>

      <div>
        <h3 className="font-display text-lg mb-3">Payment history</h3>
        <DataTable
          data={MOCK_PAYMENTS}
          columns={[
            {
              key: "invoice",
              header: "Invoice",
              render: (p) => (
                <span className="font-mono text-xs flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.invoice}
                </span>
              ),
            },
            { key: "user", header: "Customer", sortable: true },
            { key: "plan", header: "Plan" },
            {
              key: "amount",
              header: "Amount",
              sortable: true,
              render: (p) => <span className="tabular-nums">${p.amount}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (p) => <PaymentStatus status={p.status} />,
            },
            {
              key: "date",
              header: "Date",
              sortable: true,
              render: (p) => (
                <span className="text-xs text-muted-foreground">
                  {dateFormater(p.date, "MMM d, yyyy")}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function PaymentStatus({ status }) {
  const map = {
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    refunded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
        map[status] || map.paid
      }`}
    >
      {status}
    </span>
  );
}
