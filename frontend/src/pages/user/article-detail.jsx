import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Clock,
  Eye,
  TrendingUp,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import DataTable from "@/components/shared/DataTable";
import EditorToolbar from "@/components/user/EditorToolbar";
import SeoScoreRing from "@/components/user/SeoScoreRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { dateFormater, formatNumber } from "@/lib/utils";
import {
  MY_ARTICLES,
  ARTICLE_VERSIONS,
  SEO_CHECKS,
  META_TITLE_OPTIONS,
  FAQ_GENERATED,
  INTERNAL_LINK_SUGGESTIONS,
  ARTICLE_PERFORMANCE_TRAFFIC,
} from "@/lib/mockData";

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = useMemo(
    () => MY_ARTICLES.find((a) => a.id === id) || MY_ARTICLES[0],
    [id]
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/articles")} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to articles
      </Button>

      {/* Article header */}
      <GlassCard className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={article.status} />
              <Badge variant="glass">{article.cms}</Badge>
              {article.tags?.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <h1 className="font-display text-2xl mt-3 leading-tight">{article.title}</h1>
            <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {article.words} words</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {article.readingTime} min read</span>
              <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> SEO {article.seoScore}/100</span>
              {article.status === "published" && (
                <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(article.views)} views</span>
              )}
              <span>Updated {dateFormater(article.updatedAt, "MMM d, HH:mm")}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm">
              <Sparkles className="h-4 w-4" /> AI Improve
            </Button>
            <Button variant="gradient" size="sm">
              {article.status === "draft" ? "Publish" : "Update"}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Editor */}
        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-4">
              <EditorToolbar />
              <GlassCard className="p-5">
                <Input defaultValue={article.title} className="text-xl font-display border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent mb-4" />
                <Textarea
                  rows={20}
                  className="border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent text-sm leading-relaxed resize-none"
                  defaultValue={`Search engines have changed. Modern SEO is no longer about keyword stuffing or link farms. The strategies that move the needle today center on intent, depth, and AI-readable structure.\n\nIn this article, we walk through the ten approaches our team has measured across 800+ articles in the past 12 months — from schema markup to topical authority clusters.\n\n## 1. Topical Authority Over Single Keywords\n\nGoogle's algorithms now evaluate your site's expertise on a topic, not just individual page relevance. Building content clusters — a pillar page surrounded by supporting articles — signals depth.\n\n## 2. AI Overview Optimization\n\nWith AI overviews appearing on 38% of queries, structuring content for citation is critical. Use clear headings, factual statements, and schema markup to increase inclusion rates.\n\n## 3. Internal Linking Architecture\n\nOur testing shows that adding 4-6 contextual internal links per article produces a measurable ranking lift within 2-3 weeks. Link from high-authority pages to newer content.\n\n## 4. Content Freshness Signals\n\nUpdating existing articles with new data, examples, and timestamps outperforms publishing new thin content. We refresh our top 20 articles monthly.\n\n## 5. Schema Markup (FAQ, HowTo, Article)\n\nPages with FAQ schema see +27% AI overview inclusion. Article schema helps Google understand authorship and publication dates.`}
                />
              </GlassCard>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <GlassCard className="p-4">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Stats</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Words</dt><dd className="font-medium tabular-nums">{article.words}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Reading time</dt><dd>{article.readingTime} min</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">SEO score</dt><dd className="text-emerald-400 font-semibold">{article.seoScore}/100</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Keyword</dt><dd className="truncate ml-2">{article.keyword}</dd></div>
                </dl>
              </GlassCard>

              <GlassCard className="p-4">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Auto-save</h4>
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                  Saved 4 seconds ago
                </p>
              </GlassCard>

              <GlassCard className="p-4">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">AI Tools</h4>
                <div className="space-y-2">
                  {["Rewrite selection", "Expand paragraph", "Shorten paragraph", "Fix grammar", "Improve clarity"].map((t) => (
                    <Button key={t} variant="ghost" size="sm" className="w-full justify-start text-xs text-brand-violet hover:text-brand-violet">
                      <Sparkles className="h-3 w-3" /> {t}
                    </Button>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard className="p-6 flex flex-col items-center justify-center">
              <SeoScoreRing score={article.seoScore} />
              <p className="text-xs text-muted-foreground mt-3">
                {SEO_CHECKS.filter((c) => c.status === "pass").length}/{SEO_CHECKS.length} checks passed
              </p>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-2">
              <h3 className="font-display text-lg mb-3">SEO Checklist</h3>
              <ul className="space-y-2">
                {SEO_CHECKS.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${c.status === "pass" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {c.status === "pass" ? "✓" : "!"}
                    </span>
                    <span className={c.status === "pass" ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-3">
              <h3 className="font-display text-lg mb-3">Meta title options</h3>
              <div className="space-y-2">
                {META_TITLE_OPTIONS.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg glass border border-white/5 hover:border-white/15 cursor-pointer">
                    <span className="h-6 w-6 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white font-bold">{i + 1}</span>
                    <span className="text-sm flex-1">{t}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{t.length} chars</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-2">
              <h3 className="font-display text-lg mb-3">Generated FAQ</h3>
              <ul className="space-y-3">
                {FAQ_GENERATED.map((f, i) => (
                  <li key={i} className="p-3 rounded-lg glass border border-white/5">
                    <p className="text-sm font-medium">{f.q}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.a}</p>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="font-display text-lg mb-3">Internal links</h3>
              <ul className="space-y-2">
                {INTERNAL_LINK_SUGGESTIONS.map((l) => (
                  <li key={l.slug} className="p-2 rounded-lg glass border border-white/5 text-xs">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-muted-foreground mt-0.5">Anchor: "{l.anchor}"</p>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </TabsContent>

        {/* Versions */}
        <TabsContent value="versions">
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-4">Version history</h3>
            <ul className="space-y-3">
              {ARTICLE_VERSIONS.map((v, i) => (
                <li key={v.id} className="flex items-center gap-4 p-3 rounded-lg glass border border-white/5">
                  <span className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {ARTICLE_VERSIONS.length - i}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{v.label}</p>
                    <p className="text-xs text-muted-foreground">{v.by} · {v.words} words · {dateFormater(v.time, "MMM d, HH:mm")}</p>
                  </div>
                  {i > 0 && (
                    <Button variant="ghost" size="sm">
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </Button>
                  )}
                  {i === 0 && <Badge variant="glass">Current</Badge>}
                </li>
              ))}
            </ul>
          </GlassCard>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          {article.status === "published" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard icon={Eye} label="Total views" value={article.views} trend={12.4} />
              <KPICard icon={TrendingUp} label="SEO score" value={article.seoScore} suffix="/100" glow="teal" />
              <KPICard icon={Clock} label="Avg time on page" value={4.2} suffix="m" decimals={1} />

              <GlassCard className="p-5 md:col-span-3">
                <h3 className="font-display text-lg mb-4">Traffic sources</h3>
                <div className="space-y-3">
                  {ARTICLE_PERFORMANCE_TRAFFIC.map((s) => (
                    <div key={s.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{s.source}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{s.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full gradient-bg" style={{ width: `${s.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <h3 className="font-display text-xl mt-4">No performance data yet</h3>
              <p className="text-sm text-muted-foreground mt-2">Publish this article to start tracking views and engagement.</p>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
