import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  ArrowRight,
  Sparkles,
  Plus,
  X,
  Zap,
  Eye,
  Rocket,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import GenerationProgress from "@/components/user/GenerationProgress";
import PublishDialog from "@/components/user/PublishDialog";

import {
  generateArticle,
  fetchArticleById,
  fetchQuota,
  clearCurrentArticle,
} from "@/redux/slice/article-slice";
import { fetchBrandVoices } from "@/redux/slice/brand-slice";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { formatNumber } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────
 *  Validation
 * ────────────────────────────────────────────────────────── */
const TONES = ["Professional", "Casual", "Journalistic", "Academic"];

const submitSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, "Topic must be at least 3 characters")
    .max(200, "Topic too long"),
  targetKeyword: z
    .string()
    .trim()
    .min(2, "Target keyword required")
    .max(100, "Keyword too long"),
  tone: z.enum(TONES),
  targetWordCount: z.number().int().min(300).max(5000),
});

/* ──────────────────────────────────────────────────────────
 *  Page
 * ────────────────────────────────────────────────────────── */
export default function NewArticlePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const quota = useSelector((s) => s.articles.quota);
  const brandVoices = useSelector((s) => s.brand.list);
  const activeVoice = brandVoices.find((p) => p.isActive) || null;
  const currentArticle = useSelector((s) => s.articles.current);
  const liveProgress = useSelector((s) =>
    currentArticle?._id
      ? s.articles?.progress?.[currentArticle._id]
      : null
  );

  const [submittedArticleId, setSubmittedArticleId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extraKeywords, setExtraKeywords] = useState([]);
  const [extraKeywordInput, setExtraKeywordInput] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      topic: "",
      targetKeyword: "",
      tone: "Professional",
      targetWordCount: 1500,
    },
  });

  /* Initial load */
  useEffect(() => {
    dispatch(fetchQuota());
    dispatch(fetchBrandVoices());
    return () => dispatch(clearCurrentArticle());
  }, [dispatch]);

  /* Re-fetch the article when live progress reaches a settled state */
  useEffect(() => {
    if (!submittedArticleId) return;
    const status = liveProgress?.status;
    if (
      status === "draft_ready" ||
      status === "published" ||
      status === "failed" ||
      status === "needs_revision"
    ) {
      dispatch(fetchArticleById(submittedArticleId));
    }
  }, [liveProgress?.status, submittedArticleId, dispatch]);

  /* Poll-as-fallback every 8s while in progress (in case socket dies) */
  useEffect(() => {
    if (!submittedArticleId) return undefined;
    const status = liveProgress?.status;
    const settled = ["draft_ready", "published", "failed", "needs_revision"].includes(
      status
    );
    if (settled) return undefined;
    const t = setInterval(() => {
      dispatch(fetchArticleById(submittedArticleId));
    }, 8000);
    return () => clearInterval(t);
  }, [submittedArticleId, liveProgress?.status, dispatch]);

  const handleAddKeyword = () => {
    const k = extraKeywordInput.trim();
    if (!k) return;
    if (extraKeywords.length >= 10) {
      toast.error("Maximum 10 additional keywords");
      return;
    }
    if (extraKeywords.includes(k)) {
      setExtraKeywordInput("");
      return;
    }
    setExtraKeywords((prev) => [...prev, k]);
    setExtraKeywordInput("");
  };

  const removeKeyword = (k) =>
    setExtraKeywords((prev) => prev.filter((x) => x !== k));

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(
        generateArticle({
          topic: data.topic,
          targetKeyword: data.targetKeyword,
          tone: data.tone,
          targetWordCount: data.targetWordCount,
          ...(extraKeywords.length
            ? { additionalKeywords: extraKeywords }
            : {}),
        })
      ).unwrap();

      const articleId = result?.data?.articleId;
      if (!articleId) {
        toast.error("Could not start generation");
        return;
      }
      setSubmittedArticleId(articleId);
      // Eagerly load the article so progress card has a record to update.
      dispatch(fetchArticleById(articleId));
      // Refresh quota (it just decremented)
      dispatch(fetchQuota());
      toast.success("Generation queued. Watch the progress below.");
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Generation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setSubmittedArticleId(null);
    dispatch(clearCurrentArticle());
    form.reset({
      topic: "",
      targetKeyword: "",
      tone: "Professional",
      targetWordCount: 1500,
    });
    setExtraKeywords([]);
  };

  const status = currentArticle?.status;
  const showForm = !submittedArticleId;
  const showProgress = submittedArticleId && status !== "draft_ready" && status !== "published";
  const showResult = submittedArticleId && (status === "draft_ready" || status === "published");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Create"
        title="New Article"
        subtitle="Submit a topic, watch our AI research, write, and SEO-optimize it for you in real time."
        actions={
          quota ? (
            <QuotaBadge quota={quota} />
          ) : null
        }
      />

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <SubmitForm
              form={form}
              extraKeywords={extraKeywords}
              extraKeywordInput={extraKeywordInput}
              setExtraKeywordInput={setExtraKeywordInput}
              addKeyword={handleAddKeyword}
              removeKeyword={removeKeyword}
              onSubmit={form.handleSubmit(onSubmit)}
              submitting={submitting}
              quota={quota}
              activeVoice={activeVoice}
            />
          </motion.div>
        )}

        {showProgress && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <GenerationProgress
              articleId={submittedArticleId}
              status={status}
              failureReason={currentArticle?.failureReason}
            />
            {currentArticle && (
              <div className="text-xs text-muted-foreground text-center">
                Article ID:{" "}
                <code className="bg-white/5 px-1.5 py-0.5 rounded">
                  {currentArticle._id}
                </code>
              </div>
            )}
            {(status === "failed" || status === "needs_revision") && (
              <div className="flex justify-center gap-2">
                <Button variant="glass" onClick={handleStartOver}>
                  Start over
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    navigate(`/dashboard/articles/${submittedArticleId}`)
                  }
                >
                  Open article detail <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {showResult && currentArticle && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <ResultPanel
              article={currentArticle}
              onPublish={() => setPublishOpen(true)}
              onOpenDetail={() =>
                navigate(`/dashboard/articles/${currentArticle._id}`)
              }
              onStartOver={handleStartOver}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        article={currentArticle}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Submit form
 * ────────────────────────────────────────────────────────── */
function SubmitForm({
  form,
  extraKeywords,
  extraKeywordInput,
  setExtraKeywordInput,
  addKeyword,
  removeKeyword,
  onSubmit,
  submitting,
  quota,
  activeVoice,
}) {
  const errors = form.formState.errors;
  const wordCountValue = form.watch("targetWordCount");

  return (
    <motion.form
      onSubmit={onSubmit}
      variants={staggerContainer(0.05)}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <GlassCard className="p-4 md:p-6 lg:col-span-2 space-y-5">
        {/* Active brand voice indicator */}
        <motion.div variants={fadeUp}>
          {activeVoice ? (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg glass border border-primary/20 bg-primary/5">
              <span className="h-7 w-7 rounded-md gradient-bg flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  Writing in voice:{" "}
                  <span className="text-primary">{activeVoice.name}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Switch profiles on the Brand Voice page.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg glass border border-white/10">
              <span className="h-7 w-7 rounded-md glass border border-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  No brand voice active{" "}
                  <a
                    href="/dashboard/brand-voice"
                    className="text-primary hover:underline"
                  >
                    create one
                  </a>{" "}
                  for consistent tone across articles.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Topic
          </Label>
          <Input
            {...form.register("topic")}
            className="mt-1.5 bg-transparent border-white/10 text-base"
            placeholder="e.g. The future of AI-powered content workflows"
          />
          {errors.topic && (
            <p className="text-xs text-destructive mt-1.5">
              {errors.topic.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Target keyword
          </Label>
          <Input
            {...form.register("targetKeyword")}
            className="mt-1.5 bg-transparent border-white/10"
            placeholder="ai content workflow"
          />
          {errors.targetKeyword && (
            <p className="text-xs text-destructive mt-1.5">
              {errors.targetKeyword.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Additional keywords (optional)
          </Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              value={extraKeywordInput}
              onChange={(e) => setExtraKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              className="bg-transparent border-white/10"
              placeholder="Press Enter to add"
            />
            <Button
              type="button"
              variant="glass"
              size="icon"
              onClick={addKeyword}
              disabled={extraKeywords.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {extraKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {extraKeywords.map((k) => (
                <Badge
                  key={k}
                  variant="outline"
                  className="text-xs gap-1 cursor-pointer"
                  onClick={() => removeKeyword(k)}
                >
                  {k}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Tone
            </Label>
            <Select
              value={form.watch("tone")}
              onValueChange={(v) => form.setValue("tone", v)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Word count
            </Label>
            <Select
              value={String(wordCountValue)}
              onValueChange={(v) => form.setValue("targetWordCount", Number(v))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1,000</SelectItem>
                <SelectItem value="1500">1,500 (recommended)</SelectItem>
                <SelectItem value="2000">2,000</SelectItem>
                <SelectItem value="3000">3,000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="pt-4 border-t border-white/5">
          <GradientButton
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || (quota && quota.remaining === 0)}
          >
            <Sparkles className="h-5 w-5" />
            {submitting ? "Queueing…" : "Generate article"}
          </GradientButton>
          {quota && quota.remaining === 0 && (
            <p className="text-xs text-amber-400 text-center mt-2">
              Monthly quota reached — upgrade your plan to keep generating.
            </p>
          )}
        </motion.div>
      </GlassCard>

      {/* Side panel — what happens next */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-5 space-y-4 h-full">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            How generation works
          </div>
          <ol className="space-y-3 text-sm">
            {[
              ["Research", "We search 5+ sources, scrape, dedupe."],
              ["Outline", "Claude Sonnet builds a structured outline."],
              ["Draft", "Full article drafted with inline citations."],
              ["SEO", "Meta titles, slug, FAQ generated by Haiku."],
              ["Originality", "Score check + 12-token verbatim guard."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="h-6 w-6 rounded-full glass border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium leading-tight">{t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="pt-3 border-t border-white/5 text-xs text-muted-foreground">
            Typical end-to-end time: 2-5 minutes for a 1,500-word article.
          </div>
        </GlassCard>
      </motion.div>
    </motion.form>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Result panel — shown when status reaches draft_ready
 * ────────────────────────────────────────────────────────── */
function ResultPanel({ article, onPublish, onOpenDetail, onStartOver }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-4 md:p-6 lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <h3 className="font-display text-xl">Your draft is ready</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatNumber(article.wordCount || 0)} words ·{" "}
          {article.readingTimeMinutes || 0} min read · cost{" "}
          {article.costs?.totalUsd
            ? `$${Number(article.costs.totalUsd).toFixed(4)}`
            : "$0.00"}
        </p>

        <div className="rounded-lg p-4 glass border border-white/5">
          <h4 className="font-display text-lg leading-tight">
            {article.seo?.metaTitle || article.topic}
          </h4>
          {article.seo?.metaDescription && (
            <p className="text-sm text-muted-foreground mt-2">
              {article.seo.metaDescription}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <GradientButton size="md" onClick={onPublish}>
            <Rocket className="h-4 w-4" /> Publish to CMS
          </GradientButton>
          <Button variant="glass" size="md" onClick={onOpenDetail}>
            <Eye className="h-4 w-4" /> Review full article
          </Button>
          <Button variant="ghost" size="md" onClick={onStartOver}>
            Generate another
          </Button>
        </div>
      </GlassCard>

      {/* Sources preview */}
      <GlassCard className="p-5 space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
          Cited sources ({article.sourcesIndex?.length || 0})
        </h4>
        <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {(article.sourcesIndex || []).map((s) => (
            <li
              key={s.numeral}
              className="text-xs p-2 rounded glass border border-white/5"
            >
              <span className="text-primary font-bold tabular-nums mr-1">
                [{s.numeral}]
              </span>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline truncate block"
                title={s.url}
              >
                {s.url}
              </a>
            </li>
          ))}
          {!(article.sourcesIndex || []).length && (
            <li className="text-xs italic text-muted-foreground">
              No sources indexed.
            </li>
          )}
        </ul>
      </GlassCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Quota badge
 * ────────────────────────────────────────────────────────── */
function QuotaBadge({ quota }) {
  if (!quota) return null;
  const remaining =
    quota.remaining === null ? "Unlimited" : quota.remaining;
  const total = quota.limit === null ? "∞" : quota.limit;
  const isLow =
    quota.remaining !== null &&
    quota.limit > 0 &&
    quota.remaining / quota.limit <= 0.2;
  return (
    <div className="text-xs glass border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
      <Zap
        className={`h-3.5 w-3.5 ${
          isLow ? "text-amber-400" : "text-brand-teal"
        }`}
      />
      <span className="capitalize text-muted-foreground">
        {quota.planDisplayName || quota.plan}
      </span>
      <span className="tabular-nums font-medium">
        {remaining}/{total}
      </span>
    </div>
  );
}
