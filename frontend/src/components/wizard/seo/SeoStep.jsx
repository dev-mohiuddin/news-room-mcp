import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Hash,
} from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  runStageApi,
  approveStageApi,
  regenerateStageApi,
  retryStageApi,
} from "@/api/article/wizard";
import { updateArticleApi } from "@/api/article/article";
import { wizardActions } from "@/redux/slice/wizard-slice";
import { cn } from "@/lib/utils";

export default function SeoStep({ onAdvance }) {
  const dispatch = useDispatch();
  const { articleId, stages, seo } = useSelector((s) => s.wizard);
  const stageStatus = stages.seo?.status || "pending";
  const failureReason = stages.seo?.failureReason;
  const retryCount = stages.seo?.retryCount || 0;

  const [submitting, setSubmitting] = useState(false);
  /** Auto-start idempotency guard — see OutlineStep.jsx for rationale. */
  const startedKeysRef = useRef(new Set());

  /* Auto-start when entering this step */
  useEffect(() => {
    const originalityStatus = stages.originality?.status;
    if (
      !articleId ||
      stageStatus !== "pending" ||
      originalityStatus !== "approved"
    ) return;
    const key = `${articleId}:seo`;
    if (startedKeysRef.current.has(key)) return;
    startedKeysRef.current.add(key);
    runStageApi(articleId, "seo").catch((err) => {
      if (err?.statusCode !== 409) {
        startedKeysRef.current.delete(key);
      }
      toast.error(err?.message || "Could not start SEO stage");
    });
  }, [articleId, stageStatus, stages.originality?.status]);

  const handleRegenerate = async () => {
    if (!window.confirm("Regenerate SEO? This consumes a quota slot.")) return;
    setSubmitting(true);
    try {
      await regenerateStageApi(articleId, "seo");
      dispatch(wizardActions.stageReset({ stage: "seo" }));
      toast.success("Regenerating SEO…");
    } catch (err) {
      toast.error(err?.message || "Regeneration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setSubmitting(true);
    try {
      await retryStageApi(articleId, "seo");
      toast.success("Retrying SEO…");
    } catch (err) {
      toast.error(err?.message || "Retry failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePersist = async () => {
    try {
      await updateArticleApi(articleId, {
        seo: {
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          slug: seo.slug,
        },
      });
    } catch (err) {
      toast.error(err?.message || "Could not save SEO edits");
      throw err;
    }
  };

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      await handlePersist();
      await approveStageApi(articleId, "seo");
      dispatch(wizardActions.stageApproved({ stage: "seo" }));
      onAdvance?.();
    } catch (err) {
      toast.error(err?.message || "Could not advance");
    } finally {
      setSubmitting(false);
    }
  };

  /* Re-derive keyword density when content + keyword change */
  const densityColor =
    seo.keywordDensityPercent >= 1.0 && seo.keywordDensityPercent <= 2.5
      ? "text-emerald-300"
      : seo.keywordDensityPercent >= 0.5 && seo.keywordDensityPercent <= 4.0
      ? "text-amber-300"
      : "text-red-300";

  return (
    <div className="space-y-3">
      <GlassCard className="p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg flex items-center gap-2">
              {stageStatus === "running" && <Loader2 className="h-4 w-4 animate-spin text-sky-400" />}
              <Search className="h-4 w-4 text-primary" /> SEO
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stageStatus === "running"
                ? "Generating meta titles, descriptions, slug, FAQ…"
                : stageStatus === "awaiting_approval"
                ? "Pick a meta title, fine-tune copy, then continue."
                : stageStatus === "failed"
                ? "SEO generation failed."
                : "SEO pending."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stageStatus === "awaiting_approval" && (
              <Button variant="glass" size="sm" onClick={handleRegenerate} disabled={submitting}>
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
            )}
            {stageStatus === "failed" && retryCount < 3 && (
              <Button variant="glass" size="sm" onClick={handleRetry} disabled={submitting}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry ({3 - retryCount} left)
              </Button>
            )}
          </div>
        </div>

        {failureReason && (
          <div className="flex items-start gap-2 text-xs p-2 rounded glass border border-red-400/30 bg-red-500/5">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
            <span className="text-red-300">{failureReason}</span>
          </div>
        )}
      </GlassCard>

      {(stageStatus === "awaiting_approval" || stageStatus === "approved") && (
        <>
          {/* Meta title options */}
          {seo.metaTitleOptions?.length > 0 && (
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
                  Meta title options
                </h4>
                <span className="text-[10px] text-muted-foreground">
                  Click to select
                </span>
              </div>
              <ul className="space-y-2">
                {seo.metaTitleOptions.map((option, idx) => {
                  const isActive = option === seo.metaTitle;
                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => dispatch(wizardActions.setMetaTitle(option))}
                        className={cn(
                          "w-full text-left p-3 rounded-lg glass border text-sm transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/5"
                            : "border-white/10 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span>{option}</span>
                          {isActive && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                          {option.length} chars
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          )}

          {/* Meta description + slug */}
          <GlassCard className="p-5 space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Meta description
              </Label>
              <Textarea
                value={seo.metaDescription || ""}
                onChange={(e) => dispatch(wizardActions.setMetaDescription(e.target.value))}
                className="mt-1.5 bg-transparent border-white/10 min-h-[80px]"
                placeholder="160 chars max"
                maxLength={160}
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                {(seo.metaDescription || "").length}/160
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  URL slug
                </Label>
                <Input
                  value={seo.slug || ""}
                  onChange={(e) => dispatch(wizardActions.setSlug(e.target.value))}
                  className="mt-1.5 bg-transparent border-white/10"
                  placeholder="article-slug"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Keyword density
                </Label>
                <div className={cn("mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg glass border border-white/10", densityColor)}>
                  <Hash className="h-3.5 w-3.5" />
                  <span className="text-sm font-mono">
                    {(seo.keywordDensityPercent || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {seo.tags?.length > 0 && (
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {seo.tags.map((t, i) => (
                    <span key={i} className="text-xs glass border border-white/10 rounded px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* FAQ */}
          {seo.faq?.length > 0 && (
            <GlassCard className="p-5 space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
                FAQ ({seo.faq.length})
              </h4>
              <ul className="space-y-3">
                {seo.faq.map((entry, i) => (
                  <li key={i} className="text-sm space-y-1">
                    <p className="font-medium">Q. {entry.question}</p>
                    <p className="text-muted-foreground">{entry.answer}</p>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          {stageStatus === "awaiting_approval" && (
            <div className="flex justify-end">
              <GradientButton size="md" onClick={handleContinue} disabled={submitting}>
                Continue to publish →
              </GradientButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
