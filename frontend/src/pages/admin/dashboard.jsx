import {
  Users,
  DollarSign,
  FileText,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
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
import {
  USER_GROWTH_30D,
  ARTICLES_14D,
  PLAN_DISTRIBUTION,
  REVENUE_6M,
  MOCK_USERS,
  MOCK_ARTICLES,
  MOCK_FAILED_PAYMENTS,
} from "@/lib/mockData";

const KPIS = [
  { icon: Users, label: "Total users", value: 12483, trend: 8.2 },
  { icon: CreditCard, label: "Active subscriptions", value: 7663, trend: 4.6 },
  { icon: FileText, label: "Articles generated", value: 92840, trend: 12.4 },
  {
    icon: DollarSign,
    label: "MRR",
    value: 48720,
    prefix: "$",
    trend: 14.1,
  },
];

export default function AdminDashboardPage() {
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
        {KPIS.map((k) => (
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
          subtitle="Stripe net revenue, USD"
          height={280}
        >
          <ResponsiveContainer>
            <AreaChart data={REVENUE_6M}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE.violet} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART_PALETTE.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART_PALETTE.violet, strokeOpacity: 0.3 }} />
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

        <ChartCard title="Plan distribution" subtitle="Active subscriptions" height={280}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={PLAN_DISTRIBUTION}
                dataKey="value"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                stroke="none"
              >
                {PLAN_DISTRIBUTION.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="New users (30 days)" subtitle="Daily registrations" height={240}>
          <ResponsiveContainer>
            <LineChart data={USER_GROWTH_30D}>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="users"
                stroke={CHART_PALETTE.blue}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Articles per day (14 days)" subtitle="All tenants combined" height={240}>
          <ResponsiveContainer>
            <BarChart data={ARTICLES_14D}>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="articles" fill={CHART_PALETTE.teal} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentSignups />
        <RecentArticles />
      </div>

      <FailedPayments />
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(6, 12, 26, 0.92)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

function RecentSignups() {
  const rows = MOCK_USERS.slice(0, 6);
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg">Recent signups</h3>
          <p className="text-xs text-muted-foreground">Last 10 registrations</p>
        </div>
        <Button variant="ghost" size="sm">
          View all <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-semibold">
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <PlanBadge plan={u.plan} />
            <span className="text-xs text-muted-foreground hidden md:inline">
              {dateFormater(u.createdAt, "MMM d")}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

function RecentArticles() {
  const rows = MOCK_ARTICLES.slice(0, 6);
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg">Recent articles</h3>
          <p className="text-xs text-muted-foreground">Across all tenants</p>
        </div>
        <Button variant="ghost" size="sm">
          View all <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {a.workspace} · {a.author}
              </p>
            </div>
            <StatusBadge status={a.status} />
            <span className="text-xs text-muted-foreground hidden md:inline">
              {a.words}w
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

function FailedPayments() {
  return (
    <GlassCard className="p-5 border border-red-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            Failed payments
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              {MOCK_FAILED_PAYMENTS.length} accounts
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">Needs admin attention</p>
        </div>
        <Button variant="outline" size="sm">
          View all
        </Button>
      </div>
      <ul className="divide-y divide-white/5">
        {MOCK_FAILED_PAYMENTS.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 py-3 text-sm flex-wrap"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium">{p.user}</p>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
            </div>
            <span className="text-sm font-semibold">${p.amount}</span>
            <span className="text-xs text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
              {p.attempts} attempts
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {dateFormater(p.lastAttempt, "MMM d, HH:mm")}
            </span>
            <Button size="sm" variant="ghost">
              Retry
            </Button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
