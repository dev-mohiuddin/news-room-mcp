import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Eye,
  TrendingUp,
  FileText,
  Award,
  DollarSign,
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

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import ChartCard, {
  CHART_PALETTE,
  CHART_GRID_COLOR,
  CHART_TICK_COLOR,
} from "@/components/shared/ChartCard";
import GlassCard from "@/components/shared/GlassCard";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, dateFormater } from "@/lib/utils";
import { fetchTenantReport } from "@/redux/slice/analytics-slice";
import {
  decorateDaily,
  REFERRER_LABEL,
  REFERRER_COLORS,
  SEO_BAND_COLORS,
} from "@/lib/analytics";

const tooltipStyle = {
  background: "rgba(6,12,26,0.92)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export default function UserAnalyticsPage() {
  const dispatch = useDispatch();
  const data = useSelector((s) => s.analytics.tenantReport);
  const isLoading = useSelector((s) => s.analytics.isLoading);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    dispatch(fetchTenantReport(range));
  }, [dispatch, range]);

  const summary = data?.summary || {};
  const dailyArticles = useMemo(
    () => decorateDaily(data?.daily?.articles || []),
    [data]
  );
  const dailyViews = useMemo(
    () => decorateDaily(data?.daily?.views || []),
    [data]
  );
  const traffic = useMemo(
    () =>
      (data?.trafficSources || []).map((t) => ({
        ...t,
        label: REFERRER_LABEL[t.source] || t.source,
      })),
    [data]
  );
  const seoBands = data?.seoBands || [];
  const top = data?.topArticles || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Track article performance, traffic sources, and SEO scores."
        actions={
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
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Eye}
          label="Total views"
          value={summary.totalViews || 0}
          trend={summary.viewsTrendPct ?? null}
        />
        <KPICard
          icon={FileText}
          label="Published"
          value={summary.published || 0}
          glow="teal"
        />
        <KPICard
          icon={DollarSign}
          label="AI cost"
          value={Number((summary.totalCostUsd || 0).toFixed(2))}
          prefix="$"
          decimals={2}
        />
        <KPICard
          icon={Award}
          label="Top performer"
          value={top[0]?.viewsTotal || 0}
          suffix=" views"
          glow="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Views over time"
          subtitle={`Daily views · ${range}`}
          height={280}
        >
          <ResponsiveContainer>
            <AreaChart data={dailyViews}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="views"
                stroke={CHART_PALETTE.blue}
                strokeWidth={2.5}
                fill="url(#viewsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Traffic sources" height={280}>
          {traffic.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No views yet.
            </div>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={traffic}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {traffic.map((_, i) => (
                    <Cell
                      key={i}
                      fill={REFERRER_COLORS[i % REFERRER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: CHART_TICK_COLOR }}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Articles per day"
          subtitle="Created vs published"
          height={260}
        >
          <ResponsiveContainer>
            <BarChart data={dailyArticles}>
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
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: CHART_TICK_COLOR }}
              />
              <Bar
                dataKey="articles"
                stackId="a"
                fill={CHART_PALETTE.violet}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="published"
                stackId="b"
                fill={CHART_PALETTE.teal}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="SEO score distribution" height={260}>
          {seoBands.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Generate articles to see SEO data.
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={seoBands}>
                <CartesianGrid
                  stroke={CHART_GRID_COLOR}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="band"
                  stroke={CHART_TICK_COLOR}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke={CHART_TICK_COLOR}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {seoBands.map((b) => (
                    <Cell
                      key={b.band}
                      fill={SEO_BAND_COLORS[b.band] || CHART_PALETTE.blue}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top articles table */}
      <div>
        <h3 className="font-display text-lg mb-3">Top performing articles</h3>
        {top.length === 0 ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : "No published articles yet. Generate and publish an article to see views and SEO data."}
          </GlassCard>
        ) : (
          <DataTable
            data={top}
            columns={[
              {
                key: "title",
                header: "Article",
                sortable: true,
                render: (a) => (
                  <Link
                    to={`/dashboard/articles/${a._id}`}
                    className="font-medium text-sm truncate block max-w-[300px] hover:text-primary"
                  >
                    {a.title}
                  </Link>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (a) => <StatusBadge status={a.status} />,
              },
              {
                key: "viewsTotal",
                header: "Views",
                sortable: true,
                render: (a) => (
                  <span className="tabular-nums text-sm">
                    {formatNumber(a.viewsTotal || 0)}
                  </span>
                ),
              },
              {
                key: "wordCount",
                header: "Words",
                sortable: true,
                render: (a) => (
                  <span className="text-xs tabular-nums">
                    {a.wordCount || 0}
                  </span>
                ),
              },
              {
                key: "readingTimeMinutes",
                header: "Read",
                render: (a) => (
                  <span className="text-xs tabular-nums">
                    {a.readingTimeMinutes || 0} min
                  </span>
                ),
              },
              {
                key: "publishedAt",
                header: "Published",
                render: (a) => (
                  <span className="text-xs text-muted-foreground">
                    {a.publishedAt
                      ? dateFormater(a.publishedAt, "MMM d")
                      : "—"}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
