import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";

import {
  runStageApi,
  approveStageApi,
  retryStageApi,
} from "@/api/article/wizard";
import { wizardActions } from "@/redux/slice/wizard-slice";

export default function OriginalityStep({ onAdvance }) {
  const dispatch = useDispatch();
  const { articleId, stages, draft, originality } = useSelector((s) => s.wizard);
  const stageStatus = stages.originality?.status || "pending";
  const failureReason = stages.originality?.failureReason;
  const retryCount = stages.originality?.retryCount || 0;

  const [submitting, setSubmitting] = useState(false);
  const startedKeysRef = useRef(new Set());

  /* Auto-start when draft is approved */
  useEffect(() => {
    const draftStatus = stages.draft?.status;
    if (
      !articleId ||
      stageStatus !== "pending" ||
      draftStatus !== "approved"
    ) return;
    const key = `${articleId}:originality`;
    if (startedKeysRef.current.has(key)) return;
    startedKeysRef.current.add(key);

    // If originality already ran during draft stage (HLP_ORIGINALITY_GATE_ENABLED),
    // just display the result and auto-approve.
    if (draft.originalityRecord) {
      dispatch(wizardActions.stageApproved({ stage: "originality" }));
      return;
    }

    runStageApi(articleId, "originality").catch((err) => {
      if (err?.statusCode !== 409) {
        startedKeysRef.current.delete(key);
      }
      // If backend doesn't have an originality stage endpoint,
      // auto-approve since originality already ran during draft.
      if (err?.statusCode === 404 || err?.message?.includes("Unknown stage")) {
        dispatch(wizardActions.stageApproved({ stage: "originality" }));
        return;
      }
      toast.error(err?.message || "Could not start originality check");
    });
  }, [articleId, stageStatus, stages.draft?.status, draft.originalityRecord, dispatch]);

  const handleRetry = async () => {
    setSubmitting(true);
    try {
      await retryStageApi(articleId, "originality");
      toast.success("Re-checking originality…");
    } catch (err) {
      toast.error(err?.message || "Retry failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      await approveStageApi(articleId, "originality");
      dispatch(wizardActions.stageApproved({ stage: "originality" }));
      onAdvance?.();
    } catch (err) {
      toast.error(err?.message || "Could not advance");
    } finally {
      setSubmitting(false);
    }
  };

  const scorePct = originality.score != null ? Math.round(originality.score * 100) : null;
  const isGood = scorePct != null && scorePct <= 15;

  return (
    <div className="space-y-3">
      <GlassCard className="p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg flex items-center gap-2">
              {stageStatus === "running" && <Loader2 className="h-4 w-4 animate-spin text-sky-400" />}
              {stageStatus === "awaiting_approval" && isGood && (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              )}
              {stageStatus === "awaiting_approval" && !isGood && (
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              )}
              {stageStatus === "failed" && (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              {stageStatus === "approved" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              Originality Check
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stageStatus === "running"
                ? "Checking content against billions of web pages…"
                : stageStatus === "awaiting_approval"
                  ? scorePct != null
                    ? `${scorePct}% similarity · ${originality.provider?.replace("_", " ") || "Unknown"} provider`
                    : "Originality check complete"
                  : stageStatus === "failed"
                    ? "Originality check failed."
                    : "Originality check pending."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stageStatus === "awaiting_approval" && (
              <Button variant="glass" size="sm" onClick={handleRetry} disabled={submitting}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-check
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
            <span className="text-red-300">{getOriginalityFailureMessage(failureReason)}</span>
          </div>
        )}

        {originality.score != null && stageStatus !== "failed" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isGood ? "bg-emerald-400/70" : scorePct <= 30 ? "bg-amber-400/70" : "bg-red-400/70"
                  }`}
                  style={{ width: `${Math.min(scorePct, 100)}%` }}
                />
              </div>
              <span className={`text-sm font-mono ${
                isGood ? "text-emerald-300" : scorePct <= 30 ? "text-amber-300" : "text-red-300"
              }`}>
                {scorePct}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isGood
                ? "Content is sufficiently original. Safe to proceed."
                : scorePct <= 30
                  ? "Some similarity detected. Review flagged sections before proceeding."
                  : "High similarity detected. Consider rewriting flagged sections."}
            </p>
          </div>
        )}

        {originality.flaggedSpans?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-300">
              {originality.flaggedSpans.length} flagged span(s):
            </p>
            {originality.flaggedSpans.slice(0, 3).map((span, i) => (
              <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-amber-400/30">
                Source: {span.sourceUrl}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {stageStatus === "awaiting_approval" && (
        <div className="flex justify-end">
          <GradientButton size="md" onClick={handleContinue} disabled={submitting}>
            Continue to SEO →
          </GradientButton>
        </div>
      )}
    </div>
  );
}

const ORIGINALITY_FAILURE_MESSAGES = {
  ORIGINALITY_THRESHOLD_EXCEEDED: "Content similarity exceeds the allowed threshold. Rewrite flagged sections.",
  MISSING_CITATIONS: "A factual paragraph is missing a valid citation.",
  VERBATIM_COPY_DETECTED: "Verbatim text detected from a source. Please paraphrase.",
  ORIGINALITY_PROVIDER_ERROR: "Originality check service unavailable. Please retry.",
  STAGE_TIMEOUT: "Originality check took too long. Please retry.",
};

const getOriginalityFailureMessage = (reason) => {
  return ORIGINALITY_FAILURE_MESSAGES[reason] || reason;
};
