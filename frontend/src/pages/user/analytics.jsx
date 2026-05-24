import { useState } from "react";
import { Eye, TrendingUp, FileText, Award } from "lucide-react";
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
import ChartCard, { CHART_PALETTE, CHART_GRID_COLOR, CHART_TICK_COLOR } from "@/components/shared/ChartCard";
import GlassCard from "@/components/shared/GlassCard";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, dateFormater } from "@/lib/utils";
import { MY_ARTICLES, USER_DAILY_VIEWS, ARTICLE_PERFORMANCE_TRAFFIC } from "@/lib/mockData";

const tooltipStyle = {
  background: "rgba(6,12,26,0.92)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

const TRAFFIC_COLORS = ["#3B82F6", "#8B5CF6", "#2DD4BF", "#F59E0B", "#EC4899"];

export default function UserAnalyticsPage() {
  const [range, setRange] = useState("30d");

  const published = MY_ARTICLES.filter((a) => a.status === "published");
  const totalViews = published.reduce((s, a) => s + a.views, 0);
  const avgSeo = Math.round(published.reduce((s, a) => s + a.seoScore, 0) / (published.length || 1));
  const topArticle = [...published].sort((a, b) => b.views - a.views)[0];

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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Eye} label="Total views" value={totalViews} trend={18.4} />
        <KPICard icon={TrendingUp} label="Avg SEO score" value={avgSeo} suffix="/100" trend={3.2} glow="teal" />
        <KPICard icon={FileText} label="Published" value={published.length} trend={12} />
        <KPICard icon={Award} label="Top performer" value={topArticle?.views || 0} suffix=" views" glow="violet" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard className="lg:col-span-2" title="Views over time" subtitle={`Daily views · ${range}`} height={280}>
          <ResponsiveContainer>
            <AreaChart data={USER_DAILY_VIEWS}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE.blue} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART_PALETTE.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="views" stroke={CHART_PALETTE.blue} strokeWidth={2.5} fill="url(#viewsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Traffic sources" height={280}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={ARTICLE_PERFORMANCE_TRAFFIC}
                dataKey="value"
                nameKey="source"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                stroke="none"
              >
                {ARTICLE_PERFORMANCE_TRAFFIC.map((_, i) => (
                  <Cell key={i} fill={TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: CHART_TICK_COLOR }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top articles table */}
      <div>
        <h3 className="font-display text-lg mb-3">Top performing articles</h3>
        <DataTable
          data={[...published].sort((a, b) => b.views - a.views)}
          columns={[
            {
              key: "title",
              header: "Article",
              sortable: true,
              render: (a) => <span className="font-medium text-sm truncate block max-w-[300px]">{a.title}</span>,
            },
            { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
            {
              key: "views",
              header: "Views",
              sortable: true,
              render: (a) => <span className="tabular-nums text-sm">{formatNumber(a.views)}</span>,
            },
            {
              key: "seoScore",
              header: "SEO",
              sortable: true,
              render: (a) => (
                <span className={`text-xs font-semibold tabular-nums ${a.seoScore >= 90 ? "text-emerald-400" : "text-blue-400"}`}>
                  {a.seoScore}/100
                </span>
              ),
            },
            { key: "words", header: "Words", sortable: true, render: (a) => <span className="text-xs tabular-nums">{a.words}</span> },
            {
              key: "publishedAt",
              header: "Published",
              render: (a) => <span className="text-xs text-muted-foreground">{a.publishedAt ? dateFormater(a.publishedAt, "MMM d") : "—"}</span>,
            },
          ]}
          pageSize={8}
        />
      </div>
    </div>
  );
}
