import { useState } from "react";
import {
  Users,
  Activity,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
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

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import ChartCard, {
  CHART_PALETTE,
  CHART_GRID_COLOR,
  CHART_TICK_COLOR,
} from "@/components/shared/ChartCard";
import GlassCard from "@/components/shared/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  USER_GROWTH_30D,
  ARTICLES_14D,
  PLAN_DISTRIBUTION,
  REVENUE_6M,
  MOCK_USERS,
} from "@/lib/mockData";

const tooltipStyle = {
  background: "rgba(6, 12, 26, 0.92)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30d");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Platform analytics"
        subtitle="Engagement, growth, and revenue metrics across all tenants."
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="glass">Export</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="MAU" value={9842} trend={6.4} />
        <KPICard icon={Activity} label="DAU" value={2104} trend={3.1} glow="teal" />
        <KPICard icon={FileText} label="Articles / day" value={612} trend={8.4} />
        <KPICard
          icon={TrendingUp}
          label="Avg SEO score"
          value={91}
          suffix="/100"
          trend={1.6}
          glow="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="User growth" subtitle={`Daily new signups · ${range}`}>
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

        <ChartCard title="Articles per day" subtitle="All tenants combined">
          <ResponsiveContainer>
            <BarChart data={ARTICLES_14D}>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="articles" fill={CHART_PALETTE.teal} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue trend"
          subtitle="6 months · Stripe net"
        >
          <ResponsiveContainer>
            <AreaChart data={REVENUE_6M}>
              <defs>
                <linearGradient id="revFill3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE.violet} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART_PALETTE.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_PALETTE.violet}
                strokeWidth={2.5}
                fill="url(#revFill3)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Plan distribution">
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
                {PLAN_DISTRIBUTION.map((e) => (
                  <Cell key={e.name} fill={e.color} />
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

      {/* Top tenants */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg">Top 5 tenants by articles</h3>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </div>
        <ul className="space-y-3">
          {[...MOCK_USERS]
            .sort((a, b) => b.articles - a.articles)
            .slice(0, 5)
            .map((u, i) => {
              const max = MOCK_USERS.reduce((m, x) => Math.max(m, x.articles), 0);
              const pct = Math.round((u.articles / max) * 100);
              return (
                <li key={u.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">
                      <span className="text-muted-foreground">#{i + 1}</span>{" "}
                      {u.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {u.articles} articles
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full gradient-bg"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      </GlassCard>
    </div>
  );
}
