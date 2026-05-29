import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  Save,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/shared/RichTextEditor";
import { hydrateFromParagraphs } from "@/components/shared/extensions/hydrateFromParagraphs";

import {
  runStageApi,
  approveStageApi,
  regenerateStageApi,
  retryStageApi,
} from "@/api/article/wizard";
import { updateArticleApi } from "@/api/article/article";
import { wizardActions } from "@/redux/slice/wizard-slice";
import { formatNumber } from "@/lib/utils";

const AUTO_SAVE_THROTTLE_MS = 5000;
const AUTO_SAVE_FLUSH_MS = 10000;

/**
 * enrichParagraphsWithDisplayHints — Requirement 4.3
 *
 * Pass-through enrichment: when a paragraph has `displayHints.isOpening === true`,
 * inject the `article-hero` class token into the first element of its `html`
 * so the editor renders a hero (lead) paragraph style. Paragraphs without
 * `displayHints` are returned untouched and the whole array reference is
 * preserved when no enrichment applies, keeping render byte-identical to
 * pre-feature output for legacy drafts.
 */
const HERO_CLASS = "article-hero";

const injectHeroClass = (html) => {
  if (typeof html !== "string" || !html) return html;
  // Match the first opening tag; if it already carries a class attribute,
  // prepend our token (without removing existing tokens). Otherwise add one.
  const openTagMatch = html.match(/^\s*<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/);
  if (!openTagMatch) return html;
  const [full, tagName, attrs] = openTagMatch;
  const classAttrRe = /\sclass\s*=\s*("([^"]*)"|'([^']*)')/;
  const classMatch = attrs.match(classAttrRe);
  let nextAttrs;
  if (classMatch) {
    const existing = classMatch[2] ?? classMatch[3] ?? "";
    if (existing.split(/\s+/).includes(HERO_CLASS)) return html;
    const merged = existing ? `${HERO_CLASS} ${existing}` : HERO_CLASS;
    nextAttrs = attrs.replace(classAttrRe, ` class="${merged}"`);
  } else {
    nextAttrs = `${attrs} class="${HERO_CLASS}"`;
  }
  const replacement = `<${tagName}${nextAttrs}>`;
  return html.replace(full, full.replace(/<[^>]+>/, replacement));
};

const enrichParagraphsWithDisplayHints = (paragraphs) => {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return paragraphs;
  let mutated = false;
  const next = paragraphs.map((p) => {
    const hints = p?.displayHints;
    if (!hints || hints.isOpening !== true) return p;
    const nextHtml = injectHeroClass(p.html);
    if (nextHtml === p.html) return p;
    mutated = true;
    return { ...p, html: nextHtml };
  });
  return mutated ? next : paragraphs;
};

export default function DraftStep({ onAdvance }) {
  const dispatch = useDispatch();
  const { articleId, stages, draft } = useSelector((s) => s.wizard);
  const stageStatus = stages.draft?.status || "pending";
  const failureReason = stages.draft?.failureReason;
  const retryCount = stages.draft?.retryCount || 0;
  const originalityRecord = draft.originalityRecord;

  const [submitting, setSubmitting] = useState(false);
  /** Auto-start idempotency guard — see OutlineStep.jsx for rationale. */
  const startedKeysRef = useRef(new Set());
  const lastSavedHtmlRef = useRef(draft.contentHtml);
  const pendingTimerRef = useRef(null);
  const flushTimerRef = useRef(null);

  /* Auto-start the draft stage when entering this step. */
  useEffect(() => {
    const outlineStatus = stages.outline?.status;
    if (
      !articleId ||
      stageStatus !== "pending" ||
      outlineStatus !== "approved"
    ) return;
    const key = `${articleId}:draft`;
    if (startedKeysRef.current.has(key)) return;
    startedKeysRef.current.add(key);
    runStageApi(articleId, "draft").catch((err) => {
      if (err?.statusCode !== 409) {
        startedKeysRef.current.delete(key);
      }
      toast.error(err?.message || "Could not start draft stage");
    });
  }, [articleId, stageStatus, stages.outline?.status]);

  /* Build initial editor content from streamed paragraphs. Memoized so
     the value reference only changes when the underlying paragraphs or
     sourcesIndex change — without this, every parent re-render produced
     a brand-new "" or HTML string, which made the editor's content-sync
     `useEffect` fire on every render and racing with the streaming
     setContent caused TipTap to read .state on a torn-down view.

     Optional `displayHints.isOpening === true` paragraphs are enriched
     with an `article-hero` class on their first element for hero-paragraph
     styling. Paragraphs without `displayHints` are passed through
     unchanged so the rendered HTML is byte-identical to pre-feature
     output for legacy drafts (Requirement 4.3). */
  const initialContent = useMemo(
    () =>
      hydrateFromParagraphs(
        enrichParagraphsWithDisplayHints(draft.paragraphs || []),
        draft.sourcesIndex || []
      ),
    [draft.paragraphs, draft.sourcesIndex]
  );

  /* Defer mounting the editor until either the stage has produced
     content OR the user has reached an editable state. Mounting the
     editor with empty content while the stage is still `pending`
     creates the torn-down-view race during the first paragraph chunk. */
  const showEditor =
    stageStatus !== "pending" || (draft.paragraphs?.length || 0) > 0;

  /* ── Autosave debounce — Requirement 4.12, 4.14 ───────── */
  const triggerSave = (htmlValue) => {
    if (htmlValue === lastSavedHtmlRef.current) return;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        commitSave(htmlValue);
      }, AUTO_SAVE_FLUSH_MS);
    }
    pendingTimerRef.current = setTimeout(() => {
      commitSave(htmlValue);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    }, AUTO_SAVE_THROTTLE_MS);
  };

  const commitSave = async (htmlValue) => {
    if (htmlValue === lastSavedHtmlRef.current) return;
    dispatch(wizardActions.setAutoSaveStatus({ status: "saving" }));
    try {
      await updateArticleApi(articleId, { contentHtml: htmlValue });
      lastSavedHtmlRef.current = htmlValue;
      dispatch(
        wizardActions.setAutoSaveStatus({
          status: "saved",
          lastSavedAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      dispatch(
        wizardActions.setAutoSaveStatus({
          status: "failed",
          error: err?.message || "Save failed",
        })
      );
      // Retry once after 10s — Req 4.12
      setTimeout(() => commitSave(htmlValue), 10000);
    }
  };

  const handleEditorChange = (html) => {
    dispatch(wizardActions.setDraftHtml(html));
    if (stageStatus === "awaiting_approval" || stageStatus === "approved") {
      triggerSave(html);
    }
  };

  /* Cleanup pending timers on unmount */
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const handleRegenerate = async () => {
    if (!window.confirm("Regenerate draft? This consumes a quota slot.")) return;
    setSubmitting(true);
    try {
      await regenerateStageApi(articleId, "draft");
      dispatch(wizardActions.stageReset({ stage: "draft" }));
      toast.success("Regenerating draft…");
    } catch (err) {
      toast.error(err?.message || "Regeneration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setSubmitting(true);
    try {
      await retryStageApi(articleId, "draft");
      toast.success("Retrying draft…");
    } catch (err) {
      toast.error(err?.message || "Retry failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      // Flush any pending save
      if (draft.contentHtml !== lastSavedHtmlRef.current) {
        await commitSave(draft.contentHtml);
      }
      await approveStageApi(articleId, "draft");
      dispatch(wizardActions.stageApproved({ stage: "draft" }));
      onAdvance?.();
    } catch (err) {
      toast.error(err?.message || "Could not advance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <GlassCard className="p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg flex items-center gap-2">
              {stageStatus === "running" && <Loader2 className="h-4 w-4 animate-spin text-sky-400" />}
              <FileText className="h-4 w-4 text-primary" /> Draft
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stageStatus === "running"
                ? "Writing your article paragraph by paragraph…"
                : stageStatus === "awaiting_approval"
                ? `${formatNumber(draft.wordCount || 0)} words · ${draft.readingTimeMinutes || 0} min read · ${draft.paragraphs?.length || 0} paragraphs`
                : stageStatus === "failed"
                ? "Draft generation failed."
                : "Draft pending."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AutoSaveIndicator />
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
            <span className="text-red-300">{getFailureMessage(failureReason)}</span>
          </div>
        )}

        {originalityRecord && stageStatus !== "failed" && (
          <OriginalityBadge record={originalityRecord} />
        )}
      </GlassCard>

      {showEditor ? (
        <RichTextEditor
          value={initialContent}
          onChange={handleEditorChange}
          editable={stageStatus === "awaiting_approval" || stageStatus === "approved"}
          minHeight="500px"
          placeholder={
            stageStatus === "running" ? "Drafting…" : "Your article will appear here…"
          }
        />
      ) : (
        <GlassCard className="p-8 text-center text-xs text-muted-foreground">
          Waiting for the draft stage to start…
        </GlassCard>
      )}

      {stageStatus === "awaiting_approval" && (
        <div className="flex justify-end">
          <GradientButton size="md" onClick={handleContinue} disabled={submitting}>
            Continue to Originality →
          </GradientButton>
        </div>
      )}
    </div>
  );
}

function AutoSaveIndicator() {
  const { status, lastSavedAt, error } = useSelector(
    (s) => s.wizard.draft.autoSave
  );
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <Save className="h-3 w-3 animate-pulse" /> Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="text-xs text-emerald-300 inline-flex items-center gap-1" title={lastSavedAt}>
        <CheckCircle2 className="h-3 w-3" /> Saved
      </span>
    );
  }
  return (
    <span className="text-xs text-red-300 inline-flex items-center gap-1" title={error || ""}>
      <AlertCircle className="h-3 w-3" /> Save failed
    </span>
  );
}

const DRAFT_FAILURE_MESSAGES = {
  UNRESOLVED_CITATION: "A citation URL doesn't match any source in your research brief.",
  INSUFFICIENT_CITATION_DENSITY: "Not enough citations for the amount of factual content.",
  NO_CITATIONS: "The draft has no citations. Factual paragraphs must cite sources.",
  DRAFT_WORD_COUNT_VIOLATION: "Draft length is outside the ±15% target word count range.",
  MISSING_CITATIONS: "A factual paragraph is missing a valid citation.",
  VERBATIM_COPY_DETECTED: "Verbatim text detected from a source. Please paraphrase.",
  ORIGINALITY_THRESHOLD_EXCEEDED: "Content similarity score exceeds the allowed threshold.",
  ORIGINALITY_PROVIDER_ERROR: "Originality check service unavailable. Please retry.",
  STAGE_TIMEOUT: "Draft generation took too long. Please retry.",
  DRAFT_STAGE_ERROR: "Draft generation failed. Check the logs and retry.",
};

const getFailureMessage = (reason) => {
  return DRAFT_FAILURE_MESSAGES[reason] || reason;
};

function OriginalityBadge({ record }) {
  if (!record) return null;
  const score = record.score;
  const provider = record.provider;
  const scorePct = score != null ? Math.round(score * 100) : null;
  const isGood = scorePct != null && scorePct <= 15;

  return (
    <div className="flex items-center gap-2 text-xs p-2 rounded glass border border-emerald-400/20 bg-emerald-500/5">
      {isGood ? (
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      ) : (
        <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      )}
      <span className={isGood ? "text-emerald-300" : "text-amber-300"}>
        Originality: {scorePct != null ? `${scorePct}% similarity` : "Checked"}
        {provider && <span className="text-muted-foreground ml-1">({provider.replace("_", " ")})</span>}
      </span>
    </div>
  );
}
