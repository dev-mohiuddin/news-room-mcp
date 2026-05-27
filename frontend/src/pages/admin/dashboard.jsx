import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Users,
  DollarSign,
  FileText,
  CreditCard,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import ChartCard, {
  CHART_PALETTE,
  CHART_GRID_COLOR,
  CHART_TICK_COLOR,
} from "@/components/shared/ChartCard";
import GlassCard from "@/components/shared/GlassCard";
import PlanBadge from "@/components/shared/PlanBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { fetchAdminDashboard } from "@/redux/slice/analytics-slice";
import { decorateDaily, colorForPlan } from "@/lib/analytics";

const tooltipStyle = {
  background: "rgba(6, 12, 26, 0.92)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export default function AdminDashboardPage() {
  const dispatch = useDispatch();
  const data = useSelector((s) => s.analytics.adminDashboard);
  const isLoading = useSelector((s) => s.analytics.isLoading);

  useEffect(() => {
    dispatch(fetchAdminDashboard());
  }, [dispatch]);

  const counts = data?.counts || {};
  const revenue = data?.revenue || null;
  const failedPayments = data?.failedPayments || [];
  const planDistribution = data?.planDistribution || [];
  const recentSignups = data?.recentSignups || [];
  const recentArticles = data?.recentArticles || [];
  const daily = decorateDaily(data?.daily14d || []);
  const monthlyRevenue = (revenue?.monthly || []).map((m) => ({
    label: m.label,
    revenue: m.revenueUsd,
  }));

  const kpis = [
    {
      icon: Users,
      label: "Total users",
      value: counts.users || 0,
      trend: null,
    },
    {
      icon: CreditCard,
      label: "Active subscriptions",
      value: counts.activeSubscriptions || 0,
      trend: null,
    },
    {
      icon: FileText,
      label: "Articles generated",
      value: counts.articles || 0,
      trend: data?.articlesTrendPct ?? null,
    },
    {
      icon: DollarSign,
      label: "MRR",
      value: revenue ? Number((revenue.mrrCents / 100).toFixed(0)) : 0,
      prefix: "$",
      trend: revenue?.trendPct ?? null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mission control"
        title="Platform overview"
        subtitle="Live snapshot of users, content, and revenue across the entire Newsroom MCP platform."
      />

      {/* KPI cards */}
      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpis.map((k) => (
          <motion.div key={k.label} variants={staggerItem}>
            <KPICard {...k} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue (last 6 months)"
          subtitle="Paid invoices, USD"
          height={280}
        >
          <ResponsiveContainer>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART_PALETTE.violet}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_PALETTE.violet}
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
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_PALETTE.violet}
                strokeWidth={2.5}
                fill="url(#revFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Plan distribution"
          subtitle="Active subscriptions"
          height={280}
        >
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={planDistribution}
                dataKey="count"
                nameKey="displayName"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                stroke="none"
              >
                {planDistribution.map((entry) => (
                  <Cell
                    key={entry.code}
                    fill={colorForPlan(entry.code)}
                  />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: CHART_TICK_COLOR }}
              />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Articles per day */}
      <ChartCard
        title="Articles per day (last 14 days)"
        subtitle="All tenants combined"
        height={240}
      >
        <ResponsiveContainer>
          <BarChart data={daily}>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={CHART_TICK_COLOR}
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar
              dataKey="articles"
              fill={CHART_PALETTE.teal}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentSignups rows={recentSignups} loading={isLoading} />
        <RecentArticles rows={recentArticles} loading={isLoading} />
      </div>

      <FailedPayments rows={failedPayments} />
    </div>
  );
}

function RecentSignups({ rows, loading }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg">Recent signups</h3>
          <p className="text-xs text-muted-foreground">
            Last {rows.length || 0} registrations
          </p>
        </div>
        <Link to="/admin/users">
          <Button variant="ghost" size="sm">
            View all <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      {loading && rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No recent signups.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {rows.map((u) => (
            <li
              key={u._id || u.email}
              className="flex items-center gap-3 py-3"
            >
              <div className="h-9 w-9 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-semibold">
                {(u.name || u.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.email}
                </p>
              </div>
              {u.plan && <PlanBadge plan={u.plan} />}
              <span className="text-xs text-muted-foreground hidden md:inline tabular-nums">
                {dateFormater(u.createdAt, "MMM d")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function RecentArticles({ rows, loading }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg">Recent articles</h3>
          <p className="text-xs text-muted-foreground">Across all tenants</p>
        </div>
        <Link to="/admin/content">
          <Button variant="ghost" size="sm">
            View all <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      {loading && rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No articles yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {rows.map((a) => (
            <li key={a._id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {a.workspace?.name || "—"}
                  {a.author?.name ? ` · ${a.author.name}` : ""}
                </p>
              </div>
              <StatusBadge status={a.status} />
              <span className="text-xs text-muted-foreground hidden md:inline tabular-nums">
                {a.wordCount || 0}w
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function FailedPayments({ rows }) {
  if (!rows.length) return null;
  return (
    <GlassCard className="p-5 border border-red-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Failed payments
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              {rows.length} accounts
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Needs admin attention
          </p>
        </div>
        <Link to="/admin/billing">
          <Button variant="outline" size="sm">
            View all
          </Button>
        </Link>
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((p) => (
          <li
            key={p._id}
            className="flex items-center gap-3 py-3 text-sm flex-wrap"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium">{p.workspace?.name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {p.invoiceNumber}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              ${Number(p.amountUsd || 0).toFixed(2)}
            </span>
            <span className="text-xs text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
              {p.attemptCount} attempts
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {dateFormater(p.failedAt, "MMM d, HH:mm")}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
