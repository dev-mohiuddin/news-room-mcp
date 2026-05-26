import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  FileText,
  Clock,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Save,
  Rocket,
  ShieldCheck,
  Bot,
  Users,
  Megaphone,
  ImageIcon,
  Copy,
  RefreshCw,
  XCircle,
  Download,
  MoreHorizontal,
  CopyPlus,
} from "lucide-react";
import { toast } from "sonner";

import GlassCard from "@/components/shared/GlassCard";
import KPICard from "@/components/shared/KPICard";
import RichTextEditor from "@/components/shared/RichTextEditor";
import ArticleStatusBadge from "@/components/user/ArticleStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import GradientButton from "@/components/shared/GradientButton";

import {
  fetchArticleById,
  saveArticleEdits,
  retryArticle,
  cancelArticle,
  duplicateArticle,
  clearCurrentArticle,
} from "@/redux/slice/article-slice";
import { fetchCmsConnections } from "@/redux/slice/cms-slice";
import { downloadArticleExport } from "@/api/article/article";
import { dateFormater, formatNumber } from "@/lib/utils";
import PublishDialog from "@/components/user/PublishDialog";
import SocialPackPanel from "@/components/user/SocialPackPanel";
import ImagePickerDialog from "@/components/user/ImagePickerDialog";

const READY_STATUSES = ["draft_ready", "needs_revision", "published"];
const IN_FLIGHT_STATUSES = [
  "draft",
  "researching",
  "outlining",
  "drafting",
  "seo_optimizing",
  "originality_checking",
];

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const article = useSelector((s) => s.articles.current);
  const brief = useSelector((s) => s.articles.brief);
  const liveProgress = useSelector((s) =>
    id ? s.articles.progress?.[id] : null
  );

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  /* Load on mount */
  useEffect(() => {
    if (id) dispatch(fetchArticleById(id));
    dispatch(fetchCmsConnections());
    return () => dispatch(clearCurrentArticle());
  }, [dispatch, id]);

  /* Re-fetch when live progress reaches a settled state */
  useEffect(() => {
    if (!liveProgress || !id) return;
    if (
      ["draft_ready", "published", "failed", "needs_revision"].includes(
        liveProgress.status
      )
    ) {
      dispatch(fetchArticleById(id));
    }
  }, [liveProgress?.status, dispatch, id]);

  /* Sync edit fields when article loads */
  useEffect(() => {
    if (article) {
      setEditTitle(article.seo?.metaTitle || article.topic || "");
      setEditContent(article.contentHtml || article.contentMarkdown || "");
      setContentDirty(false);
    }
  }, [article?._id]);

  if (!article) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/articles")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to articles
        </Button>
        <GlassCard className="p-8 animate-pulse h-48" />
      </div>
    );
  }

  const status = article.status;
  const showLiveProgressCard = liveProgress && !READY_STATUSES.includes(status);
  const canEdit = ["draft_ready", "needs_revision"].includes(status);

  const handleSave = async () => {
    setSavingEdits(true);
    try {
      const payload = {
        seo: {
          metaTitle: editTitle,
        },
      };
      if (contentDirty) {
        payload.contentHtml = editContent;
      }
      await dispatch(
        saveArticleEdits({
          id: article._id,
          data: payload,
        })
      ).unwrap();
      setContentDirty(false);
      toast.success(contentDirty ? "Article saved" : "Title saved");
    } catch (err) {
      toast.error(err || "Could not save");
    } finally {
      setSavingEdits(false);
    }
  };

  const handleRetry = async () => {
    try {
      await dispatch(retryArticle({ id: article._id })).unwrap();
      toast.success("Generation restarted");
    } catch (err) {
      toast.error(err || "Could not retry");
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this generation? The article will be marked failed and quota refunded.")) {
      return;
    }
    try {
      await dispatch(cancelArticle(article._id)).unwrap();
      toast.success("Generation cancelled");
    } catch (err) {
      toast.error(err || "Could not cancel");
    }
  };

  const handleExport = async (format) => {
    try {
      await downloadArticleExport(article._id, format);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err?.message || "Could not export");
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await dispatch(duplicateArticle(article._id)).unwrap();
      const newId = result?.data?._id;
      toast.success("Article duplicated");
      if (newId) navigate(`/dashboard/articles/${newId}`);
    } catch (err) {
      toast.error(err || "Could not duplicate");
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard/articles")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to articles
      </Button>

      {/* Header */}
      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ArticleStatusBadge
                articleId={article._id}
                status={article.status}
              />
              {article.cmsPostUrl && (
                <a
                  href={article.cmsPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View live post
                </a>
              )}
              {(article.seo?.tags || []).slice(0, 5).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
            <h1 className="font-display text-xl md:text-2xl mt-3 leading-tight wrap-break-word">
              {article.seo?.metaTitle || article.topic}
            </h1>
            <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-2 md:gap-3">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />{" "}
                {article.wordCount > 0
                  ? `${formatNumber(article.wordCount)} words`
                  : "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {article.readingTimeMinutes || 0}{" "}
                min read
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Target keyword:{" "}
                <span className="text-foreground font-medium">
                  {article.targetKeyword}
                </span>
              </span>
              <span>
                Created {dateFormater(article.createdAt, "MMM d, HH:mm")}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {status === "draft_ready" && (
              <GradientButton
                size="md"
                onClick={() => setPublishOpen(true)}
              >
                <Rocket className="h-4 w-4" /> Publish
              </GradientButton>
            )}
            {status === "needs_revision" && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleRetry}
              >
                <RefreshCw className="h-4 w-4" /> Retry generation
              </Button>
            )}
            {IN_FLIGHT_STATUSES.includes(status) && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleCancel}
                className="border-red-500/30 hover:border-red-500/50 text-red-300"
              >
                <XCircle className="h-4 w-4" /> Cancel
              </Button>
            )}
            {status === "scheduled" && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleCancel}
                className="border-amber-500/30 hover:border-amber-500/50 text-amber-300"
              >
                <XCircle className="h-4 w-4" /> Unschedule
              </Button>
            )}
            {status === "published" && article.cmsPostUrl && (
              <Button variant="glass" size="sm" asChild>
                <a
                  href={article.cmsPostUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" /> Open live post
                </a>
              </Button>
            )}

            {/* Overflow menu — export + secondary actions */}
            {READY_STATUSES.includes(status) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">
                    Export
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExport("markdown")}>
                    <Download className="h-3.5 w-3.5" /> Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("html")}>
                    <Download className="h-3.5 w-3.5" /> HTML (.html)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    <Download className="h-3.5 w-3.5" /> JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <CopyPlus className="h-3.5 w-3.5" /> Duplicate as new draft
                  </DropdownMenuItem>
                  {status === "needs_revision" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleRetry}>
                        <RefreshCw className="h-3.5 w-3.5" /> Retry generation
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Live progress card */}
      {showLiveProgressCard && (
        <ProgressCard live={liveProgress} status={status} />
      )}

      {/* Failure / needs-revision banner */}
      {status === "failed" && (
        <FailedBanner reason={article.failureReason} />
      )}
      {status === "needs_revision" && (
        <RevisionBanner reason={article.failureReason} />
      )}

      {/* Tabs */}
      <Tabs defaultValue={status === "published" ? "preview" : "preview"}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="flex-nowrap md:flex-wrap h-auto w-max md:w-full">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="originality">Originality</TabsTrigger>
            <TabsTrigger value="fact-check">
              <ShieldCheck className="h-3.5 w-3.5" /> Fact-check
            </TabsTrigger>
            <TabsTrigger value="audience">
              <Users className="h-3.5 w-3.5" /> Audience
            </TabsTrigger>
            <TabsTrigger value="ai-citation">
              <Bot className="h-3.5 w-3.5" /> AI citation
            </TabsTrigger>
            <TabsTrigger value="social">
              <Megaphone className="h-3.5 w-3.5" /> Social pack
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="h-3.5 w-3.5" /> Featured image
            </TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>
        </div>

        {/* Preview / Editor */}
        <TabsContent value="preview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <GlassCard className="p-4 md:p-6 space-y-4">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={!canEdit}
                  className="text-lg md:text-xl font-display border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent"
                  placeholder="Article title"
                />
                {article.contentHtml ? (
                  <RichTextEditor
                    value={editContent}
                    onChange={(html) => {
                      setEditContent(html);
                      setContentDirty(true);
                    }}
                    editable={canEdit}
                    minHeight="420px"
                    placeholder="Edit your draft…"
                  />
                ) : (
                  <Textarea
                    rows={20}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled
                    className="border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent text-sm leading-relaxed resize-none"
                    placeholder="Content will appear once the draft stage completes."
                  />
                )}
                {canEdit && (
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] text-muted-foreground">
                      {contentDirty
                        ? "Unsaved changes."
                        : "Up to date."}
                    </p>
                    <div className="flex items-center gap-2">
                      {contentDirty && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditContent(article.contentHtml || "");
                            setContentDirty(false);
                          }}
                          disabled={savingEdits}
                        >
                          Discard
                        </Button>
                      )}
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={handleSave}
                        disabled={savingEdits}
                      >
                        <Save className="h-4 w-4" />
                        {savingEdits
                          ? "Saving…"
                          : contentDirty
                            ? "Save article"
                            : "Save title"}
                      </Button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            <div className="space-y-4">
              <GlassCard className="p-4">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                  Stats
                </h4>
                <dl className="space-y-2 text-sm">
                  <Row k="Words" v={formatNumber(article.wordCount || 0)} />
                  <Row k="Reading" v={`${article.readingTimeMinutes || 0} min`} />
                  <Row k="Tone" v={article.tone} />
                  <Row k="Target" v={article.targetWordCount} />
                  <Row
                    k="Total cost"
                    v={
                      article.costs?.totalUsd
                        ? `$${Number(article.costs.totalUsd).toFixed(4)}`
                        : "$0.00"
                    }
                  />
                </dl>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4">
          <SeoTab article={article} />
        </TabsContent>

        {/* Sources */}
        <TabsContent value="sources" className="mt-4">
          <SourcesTab brief={brief} />
        </TabsContent>

        {/* Originality */}
        <TabsContent value="originality" className="mt-4">
          <OriginalityTab article={article} />
        </TabsContent>

        {/* Fact-check */}
        <TabsContent value="fact-check" className="mt-4">
          <FactCheckTab article={article} />
        </TabsContent>

        {/* Audience */}
        <TabsContent value="audience" className="mt-4">
          <AudienceTab article={article} />
        </TabsContent>

        {/* AI citation */}
        <TabsContent value="ai-citation" className="mt-4">
          <AiCitationTab article={article} />
        </TabsContent>

        {/* Social pack */}
        <TabsContent value="social" className="mt-4">
          <SocialPackPanel article={article} />
        </TabsContent>

        {/* Featured image */}
        <TabsContent value="image" className="mt-4">
          <FeaturedImageTab
            article={article}
            onPick={() => setImagePickerOpen(true)}
          />
        </TabsContent>

        {/* Costs */}
        <TabsContent value="costs" className="mt-4">
          <CostsTab article={article} />
        </TabsContent>
      </Tabs>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        article={article}
      />

      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        article={article}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Subcomponents
 * ────────────────────────────────────────────────────────── */
function Row({ k, v }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function ProgressCard({ live, status }) {
  const pct = live?.percent || 0;
  return (
    <GlassCard className="p-4 border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {humanStage(live?.stage || status)}…
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full gradient-bg transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
    </GlassCard>
  );
}

function humanStage(s) {
  switch (s) {
    case "research":
    case "researching":
      return "Researching sources";
    case "outline":
    case "outlining":
      return "Building outline";
    case "draft":
    case "drafting":
      return "Drafting article";
    case "seo":
    case "seo_optimizing":
      return "SEO optimization";
    case "originality":
    case "originality_checking":
      return "Originality check";
    case "publishing":
      return "Publishing to CMS";
    default:
      return "Working";
  }
}

function FailedBanner({ reason }) {
  return (
    <GlassCard className="p-3 px-4 flex items-center gap-2.5 border border-red-500/30 bg-red-500/5">
      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
      <p className="text-sm">
        Generation failed.{" "}
        <span className="text-muted-foreground">
          Reason: <code className="text-xs">{reason || "unknown"}</code>
        </span>
      </p>
    </GlassCard>
  );
}

function RevisionBanner({ reason }) {
  return (
    <GlassCard className="p-3 px-4 flex items-center gap-2.5 border border-amber-500/30 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
      <p className="text-sm">
        This draft needs revision.{" "}
        <span className="text-muted-foreground">
          Reason: <code className="text-xs">{reason || "unknown"}</code>
        </span>
      </p>
    </GlassCard>
  );
}

function SeoTab({ article }) {
  const seo = article.seo || {};
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassCard className="p-5">
        <h3 className="font-display text-lg mb-3">Meta title options</h3>
        <ul className="space-y-2">
          {(seo.metaTitleOptions || []).map((t, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg glass border text-sm ${
                t === seo.metaTitle
                  ? "border-primary/40 bg-primary/5"
                  : "border-white/5"
              }`}
            >
              <span className="h-6 w-6 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 truncate">{t}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t.length}c
              </span>
            </li>
          ))}
          {(!seo.metaTitleOptions || !seo.metaTitleOptions.length) && (
            <li className="text-xs text-muted-foreground italic">
              SEO assets not generated yet.
            </li>
          )}
        </ul>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="font-display text-lg mb-3">Meta + slug</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              Meta description
            </dt>
            <dd className="mt-1">
              {seo.metaDescription || (
                <span className="text-muted-foreground italic">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              URL slug
            </dt>
            <dd className="mt-1 font-mono text-xs">{seo.slug || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              Tags
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {(seo.tags || []).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
              {!(seo.tags || []).length && (
                <span className="text-muted-foreground italic">—</span>
              )}
            </dd>
          </div>
        </dl>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-2">
        <h3 className="font-display text-lg mb-3">FAQ</h3>
        <ul className="space-y-3">
          {(seo.faq || []).map((f, i) => (
            <li
              key={i}
              className="p-3 rounded-lg glass border border-white/5 text-sm"
            >
              <p className="font-medium">{f.question}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {f.answer}
              </p>
              {f.citationUrls?.length ? (
                <p className="text-[11px] text-primary mt-2 truncate">
                  {f.citationUrls.map((u, idx) => (
                    <a
                      key={idx}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline mr-3"
                    >
                      [{idx + 1}]
                    </a>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
          {!(seo.faq || []).length && (
            <li className="text-xs text-muted-foreground italic">
              FAQ not generated yet.
            </li>
          )}
        </ul>
      </GlassCard>
    </div>
  );
}

function SourcesTab({ brief }) {
  if (!brief) {
    return (
      <GlassCard className="p-6 text-center text-sm text-muted-foreground">
        Research brief not available yet.
      </GlassCard>
    );
  }
  const kept = (brief.sources || []).filter((s) => !s.skipReason);
  const skipped = (brief.sources || []).filter((s) => s.skipReason);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard icon={Globe} label="Sources kept" value={kept.length} />
        <KPICard
          icon={CheckCircle2}
          label="Skipped"
          value={skipped.length}
        />
        <KPICard
          icon={Sparkles}
          label="Provider"
          value={brief.searchProvider || "—"}
        />
      </div>

      <GlassCard className="p-5">
        <h3 className="font-display text-lg mb-3">Sources</h3>
        <ul className="space-y-3">
          {kept.map((s, i) => (
            <li key={s.url} className="p-3 rounded-lg glass border border-white/5">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-primary tabular-nums w-6">
                  [{i + 1}]
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {s.title || s.url}
                  </a>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {s.url} · scraped via {s.scraperProvider}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>

      {skipped.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-display text-base mb-3 text-muted-foreground">
            Skipped sources
          </h3>
          <ul className="space-y-2 text-xs">
            {skipped.map((s) => (
              <li
                key={s.url + (s.skipReason || "")}
                className="flex items-center justify-between gap-2 p-2 rounded glass border border-white/5"
              >
                <span className="truncate">{s.url}</span>
                <Badge variant="outline" className="text-[9px] shrink-0">
                  {s.skipReason}
                </Badge>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function OriginalityTab({ article }) {
  const o = article.originality || {};
  const score = o.score;
  const provider = o.provider;
  const flagged = o.flaggedSpans || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KPICard
        icon={CheckCircle2}
        label="Originality score"
        value={
          score !== null && score !== undefined ? Number(score).toFixed(3) : "—"
        }
      />
      <KPICard icon={Sparkles} label="Provider" value={provider || "—"} />
      <KPICard icon={AlertTriangle} label="Flagged spans" value={flagged.length} />

      {flagged.length > 0 && (
        <GlassCard className="p-5 md:col-span-3">
          <h3 className="font-display text-base mb-3">Verbatim matches</h3>
          <ul className="space-y-2 text-xs">
            {flagged.map((f, i) => (
              <li key={i} className="p-3 rounded glass border border-amber-500/20">
                <p className="text-amber-300">
                  {f.tokenCount}-token match against{" "}
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {f.sourceUrl}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function CostsTab({ article }) {
  const stages = article.costs?.stages || [];
  const total = article.costs?.totalUsd || 0;
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg">Generation costs</h3>
        <Badge variant="outline" className="text-xs tabular-nums">
          Total ${Number(total).toFixed(4)}
        </Badge>
      </div>
      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No cost entries yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {stages.map((s, i) => (
            <li
              key={i}
              className="p-3 rounded-lg glass border border-white/5 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs"
            >
              <span className="capitalize font-medium">{s.stageName}</span>
              <span className="text-muted-foreground truncate">
                {s.providerName}
                {s.model ? ` · ${s.model.split("-").slice(0, 2).join("-")}` : ""}
              </span>
              <span className="tabular-nums">
                {s.unitsConsumed} units
              </span>
              <span className="tabular-nums text-muted-foreground">
                {s.latencyMs} ms
              </span>
              <span className="tabular-nums text-right font-semibold">
                ${Number(s.usdCost || 0).toFixed(4)}
                {s.costFlagged && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[9px] border-amber-500/40 text-amber-300"
                  >
                    flagged
                  </Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}


/* ──────────────────────────────────────────────────────────
 *  Phase B subcomponents
 * ────────────────────────────────────────────────────────── */
function FactCheckTab({ article }) {
  const fc = article.factCheck;
  if (!fc || !fc.checkedAt) {
    return (
      <GlassCard className="p-8 text-center">
        <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">
          Fact-check runs automatically after the draft completes.
        </p>
      </GlassCard>
    );
  }
  const flags = fc.flags || [];
  const blockers = flags.filter((f) => f.severity === "blocker");
  const warnings = flags.filter((f) => f.severity === "warning");
  const nits = flags.filter((f) => f.severity === "nit");
  const verdictPass = fc.verdict === "pass";

  return (
    <div className="space-y-4">
      <GlassCard
        className={`p-5 border ${
          verdictPass
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center gap-3">
          {verdictPass ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          )}
          <div>
            <h3 className="font-display text-lg leading-tight capitalize">
              {fc.verdict}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Checked {dateFormater(fc.checkedAt, "MMM d, HH:mm")}
            </p>
          </div>
        </div>
        {fc.summary && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {fc.summary}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <KPICard icon={AlertTriangle} label="Blockers" value={blockers.length} />
          <KPICard icon={AlertTriangle} label="Warnings" value={warnings.length} />
          <KPICard icon={CheckCircle2} label="Nits" value={nits.length} />
        </div>
      </GlassCard>

      {flags.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-display text-lg mb-3">Flags</h3>
          <ul className="space-y-2">
            {flags.map((f, i) => (
              <li
                key={i}
                className={`p-3 rounded-lg glass border text-sm ${
                  f.severity === "blocker"
                    ? "border-red-500/30 bg-red-500/5"
                    : f.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-white/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase tracking-widest ${
                      f.severity === "blocker"
                        ? "border-red-500/40 text-red-400"
                        : f.severity === "warning"
                          ? "border-amber-500/40 text-amber-400"
                          : "border-white/20 text-muted-foreground"
                    }`}
                  >
                    {f.severity}
                  </Badge>
                  {f.paragraphIndex !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      paragraph #{f.paragraphIndex + 1}
                    </span>
                  )}
                </div>
                <p className="leading-relaxed">{f.issue || f.message || ""}</p>
                {f.suggestion && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Suggestion: {f.suggestion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function AudienceTab({ article }) {
  const a = article.audience;
  if (!a || !a.personaName) {
    return (
      <GlassCard className="p-8 text-center">
        <Users className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">
          Audience persona is classified pre-draft. Re-generate the article to
          populate this tab.
        </p>
      </GlassCard>
    );
  }
  const confidencePct = Math.round((a.confidence || 0) * 100);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GlassCard className="p-5 md:col-span-2">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center shadow-lg shrink-0">
            <Users className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight truncate">
              {a.personaName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Confidence {confidencePct}%
            </p>
          </div>
        </div>
        {a.rationale && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {a.rationale}
          </p>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Drafting hints
        </h4>
        {(a.draftingHints || []).length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No hints.</p>
        ) : (
          <ul className="space-y-2">
            {(a.draftingHints || []).map((h, i) => (
              <li
                key={i}
                className="text-sm flex gap-2 leading-relaxed"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function AiCitationTab({ article }) {
  const c = article.aiCitation;
  if (!c || !c.generatedAt) {
    return (
      <GlassCard className="p-8 text-center">
        <Bot className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">
          AI citation assets are generated after SEO. Re-generate to populate.
        </p>
      </GlassCard>
    );
  }

  const copyJson = async (obj) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      toast.success("JSON-LD copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {c.articleJsonLd && (
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg">Article JSON-LD</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyJson(c.articleJsonLd)}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-black/30 p-3 rounded max-h-80 overflow-auto">
              {JSON.stringify(c.articleJsonLd, null, 2)}
            </pre>
          </GlassCard>
        )}
        {c.faqJsonLd && (
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg">FAQ JSON-LD</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyJson(c.faqJsonLd)}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-black/30 p-3 rounded max-h-80 overflow-auto">
              {JSON.stringify(c.faqJsonLd, null, 2)}
            </pre>
          </GlassCard>
        )}
      </div>

      {(c.entityMentions || []).length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-display text-lg mb-3">Entity mentions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {c.entityMentions.map((e, i) => (
              <div
                key={i}
                className="p-3 rounded-lg glass border border-white/5 text-sm"
              >
                <p className="font-medium">
                  {e.name || e.entity || "—"}
                  {e.type && (
                    <Badge variant="outline" className="ml-2 text-[9px]">
                      {e.type}
                    </Badge>
                  )}
                </p>
                {e.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {(c.promptPatterns || []).length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-display text-lg mb-3">AI prompt patterns</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Likely user prompts that should surface this article in answers.
          </p>
          <ul className="space-y-2">
            {c.promptPatterns.map((p, i) => (
              <li
                key={i}
                className="p-2.5 rounded glass border border-white/5 text-sm font-mono"
              >
                {p}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function FeaturedImageTab({ article, onPick }) {
  const img = article.featuredImage;
  if (!img?.url) {
    return (
      <GlassCard className="p-8 text-center">
        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="font-display text-lg mt-2">No featured image yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pick from Unsplash, upload your own, or generate an AI brief.
        </p>
        <GradientButton size="md" className="mt-4" onClick={onPick}>
          <ImageIcon className="h-4 w-4" /> Pick image
        </GradientButton>
      </GlassCard>
    );
  }
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">Featured image</h3>
        <Button variant="glass" size="sm" onClick={onPick}>
          <ImageIcon className="h-3.5 w-3.5" /> Change
        </Button>
      </div>
      <img
        src={img.url}
        alt={img.alt || ""}
        className="rounded-lg w-full max-h-96 object-cover"
      />
      <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Alt text
          </dt>
          <dd className="mt-1">{img.alt || "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Source
          </dt>
          <dd className="mt-1 capitalize">{img.source}</dd>
        </div>
        {img.sourceAttribution?.photographerName && (
          <div className="md:col-span-2">
            <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Attribution
            </dt>
            <dd className="mt-1 text-xs">
              Photo by{" "}
              {img.sourceAttribution.photographerUrl ? (
                <a
                  href={img.sourceAttribution.photographerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {img.sourceAttribution.photographerName}
                </a>
              ) : (
                img.sourceAttribution.photographerName
              )}
            </dd>
          </div>
        )}
      </dl>
    </GlassCard>
  );
}
