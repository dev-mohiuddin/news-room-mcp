import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  TrendingUp,
  Sparkles,
  Plus,
  Search,
  Globe,
  Mic,
  ArrowRight,
  Eye,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import UsageBar from "@/components/shared/UsageBar";
import StatusBadge from "@/components/shared/StatusBadge";
import ChartCard, { CHART_PALETTE, CHART_GRID_COLOR, CHART_TICK_COLOR } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations";
import { dateFormater, formatNumber } from "@/lib/utils";
import { MY_ARTICLES, ARTICLES_14D } from "@/lib/mockData";

const QUICK_ACTIONS = [
  { label: "Research", icon: Search, to: "/dashboard/research", color: "from-blue-500 to-cyan-500" },
  { label: "SEO Tools", icon: TrendingUp, to: "/dashboard/seo", color: "from-violet-500 to-pink-500" },
  { label: "CMS", icon: Globe, to: "/dashboard/cms", color: "from-teal-500 to-emerald-500" },
  { label: "Brand Voice", icon: Mic, to: "/dashboard/brand-voice", color: "from-orange-500 to-amber-500" },
];

export default function UserDashboardPage() {
  const recentArticles = MY_ARTICLES.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl">
            Hey there, <span className="gradient-text">Sarah</span>.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick up where you left off, or start something new.
          </p>
        </div>
        <Link to="/dashboard/new-article">
          <GradientButton size="md">
            <Plus className="h-4 w-4" /> New article
          </GradientButton>
        </Link>
      </motion.div>

      {/* KPIs */}
      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItem}>
          <KPICard icon={FileText} label="Articles this month" value={12} trend={20} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KPICard icon={Clock} label="Hours saved" value={47} trend={15} glow="teal" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KPICard icon={TrendingUp} label="Avg SEO score" value={92} suffix="/100" trend={3.2} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KPICard icon={Zap} label="Credits remaining" value={47} suffix="/200" glow="violet" />
        </motion.div>
      </motion.div>

      {/* Usage bar */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base">Monthly usage</h3>
          <Link to="/dashboard/billing" className="text-xs text-primary hover:underline">
            Manage plan →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UsageBar label="Articles" value={142} max={200} />
          <UsageBar label="Research queries" value={312} max={500} />
          <UsageBar label="Storage" value={86} max={1024} unit="MB" />
        </div>
      </GlassCard>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent articles */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">Recent articles</h3>
            <Link to="/dashboard/articles">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <ul className="space-y-2">
            {recentArticles.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/dashboard/articles/${a.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg glass border border-white/5 hover:border-white/15 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {a.words}w · {a.cms} · {dateFormater(a.updatedAt, "MMM d")}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                  {a.status === "published" && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {formatNumber(a.views)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Quick actions */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-4">Quick actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group relative overflow-hidden rounded-xl glass border border-white/10 hover:border-white/25 p-4 flex flex-col items-center gap-2 text-center transition-all hover:scale-[1.02]"
                >
                  <span className={`h-10 w-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg`}>
                    <a.icon className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-xs font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* Tip card */}
          <GlassCard className="p-5 border border-brand-teal/20 bg-brand-teal/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-brand-teal shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Pro tip</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Use Brand Voice profiles to make AI drafts sound like you. Upload 3-5 sample articles and every future draft matches your style.
                </p>
                <Link to="/dashboard/brand-voice" className="text-xs text-brand-teal hover:underline mt-2 inline-block">
                  Set up Brand Voice →
                </Link>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Activity chart */}
      <ChartCard title="Articles created (last 14 days)" subtitle="Your publishing velocity" height={220}>
        <ResponsiveContainer>
          <BarChart data={ARTICLES_14D.slice(0, 14)}>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
            <YAxis stroke={CHART_TICK_COLOR} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "rgba(6,12,26,0.92)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, fontSize: 12, color: "#e2e8f0" }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="articles" fill={CHART_PALETTE.violet} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
