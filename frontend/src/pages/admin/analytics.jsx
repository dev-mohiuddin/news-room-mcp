import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  Activity,
  FileText,
  Eye,
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
import { fetchAdminReport } from "@/redux/slice/analytics-slice";
import { decorateDaily, colorForPlan } from "@/lib/analytics";

const tooltipStyle = {
  background: "rgba(6, 12, 26, 0.92)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export default function AdminAnalyticsPage() {
  const dispatch = useDispatch();
  const data = useSelector((s) => s.analytics.adminReport);
  const isLoading = useSelector((s) => s.analytics.isLoading);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    dispatch(fetchAdminReport(range));
  }, [dispatch, range]);

  const summary = data?.summary || {};
  const signups = useMemo(() => decorateDaily(data?.daily?.signups || []), [data]);
  const articles = useMemo(() => decorateDaily(data?.daily?.articles || []), [data]);
  const views = useMemo(() => decorateDaily(data?.daily?.views || []), [data]);
  const monthlyRevenue = useMemo(
    () =>
      (data?.revenue?.monthly || []).map((m) => ({
        label: m.label,
        revenue: m.revenueUsd,
      })),
    [data]
  );
  const planDist = data?.planDistribution || [];
  const costsByWs = data?.costsByWorkspace || [];

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
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="MAU"
          value={summary.mau || 0}
          trend={summary.signupsTrendPct ?? null}
        />
        <KPICard
          icon={Activity}
          label="DAU"
          value={summary.dau || 0}
          glow="teal"
        />
        <KPICard
          icon={FileText}
          label="Articles"
          value={summary.totalArticles || 0}
          trend={summary.articlesTrendPct ?? null}
        />
        <KPICard
          icon={Eye}
          label="Views"
          value={views.reduce((acc, v) => acc + (v.views || 0), 0)}
          trend={summary.viewsTrendPct ?? null}
          glow="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="User growth" subtitle={`Daily new signups · ${range}`}>
          <ResponsiveContainer>
            <LineChart data={signups}>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke={CHART_TICK_COLOR}
                tick={{ fontSize: 11 }}
              />
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

        <ChartCard
          title="Articles per day"
          subtitle="All tenants combined"
        >
          <ResponsiveContainer>
            <BarChart data={articles}>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue trend"
          subtitle="6 months · paid invoices"
        >
          <ResponsiveContainer>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="revFill3" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#revFill3)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Plan distribution">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={planDist}
                dataKey="count"
                nameKey="displayName"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                stroke="none"
              >
                {planDist.map((e) => (
                  <Cell key={e.code} fill={colorForPlan(e.code)} />
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

      {/* Top tenants by AI cost */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg">
              Top tenants by AI cost
            </h3>
            <p className="text-xs text-muted-foreground">
              Cumulative spend across all article generations
            </p>
          </div>
        </div>
        {isLoading && costsByWs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Loading…
          </p>
        ) : costsByWs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No cost data yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {costsByWs.map((row, i) => {
              const max = costsByWs[0]?.totalUsd || 1;
              const pct = Math.round((row.totalUsd / max) * 100);
              return (
                <li key={row.workspaceId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">
                      <span className="text-muted-foreground">
                        #{i + 1}
                      </span>{" "}
                      {row.workspaceName}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ${row.totalUsd.toFixed(2)} · {row.articles} articles
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
        )}
      </GlassCard>
    </div>
  );
}
