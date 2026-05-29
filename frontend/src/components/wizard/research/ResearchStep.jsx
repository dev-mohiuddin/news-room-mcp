import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  startWizardApi,
  runStageApi,
  approveStageApi,
  patchBriefSelectionsApi,
  retryStageApi,
} from "@/api/article/wizard";
import { generateArticleApi } from "@/api/article/article";
import { listBrandVoicesApi } from "@/api/brand/brand";
import { listTemplatesApi, getTemplateApi } from "@/api/template/template";
import { wizardActions } from "@/redux/slice/wizard-slice";

const formSchema = z.object({
  topic: z.string().trim().min(3, "Topic too short"),
  targetKeyword: z.string().trim().min(2, "Keyword required"),
});

export default function ResearchStep({ onAdvance, onQuickGenerated }) {
  const dispatch = useDispatch();
  const { articleId, stages, research, topic, targetKeyword } = useSelector(
    (s) => s.wizard
  );
  const stageStatus = stages.research?.status || "pending";
  const failureReason = stages.research?.failureReason;
  const retryCount = stages.research?.retryCount || 0;

  const [quickGenerate, setQuickGenerate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Brand voices + templates the workspace owns. Loaded once. */
  const [brandVoices, setBrandVoices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [searchParams] = useSearchParams();
  const presetTemplateId = searchParams.get("templateId") || "";

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: topic || "",
      targetKeyword: targetKeyword || "",
    },
  });

  /* Load brand voices + templates once when the empty form is shown. */
  useEffect(() => {
    if (articleId) return; // form has been submitted, no need to load
    let cancelled = false;
    (async () => {
      try {
        const [vRes, tRes] = await Promise.all([
          listBrandVoicesApi().catch(() => ({ data: [] })),
          listTemplatesApi({ perPage: 50 }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setBrandVoices(vRes?.data || []);
        setTemplates(tRes?.data || []);
        // Default the brand voice to the workspace-active one so the user
        // sees what's currently in effect without having to pick.
        const active = (vRes?.data || []).find((p) => p.isActive);
        if (active) setSelectedVoice(active._id || active.id);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  /* If a templateId came in via ?templateId=… (from the Templates page),
     fetch it and pre-fill the form. The selected template is also passed
     to the wizard-start call so the backend applies all preset fields. */
  useEffect(() => {
    if (!presetTemplateId || articleId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getTemplateApi(presetTemplateId);
        const tpl = res?.data;
        if (cancelled || !tpl) return;
        setSelectedTemplate(tpl.id);
        if (tpl.brandVoiceProfileId) setSelectedVoice(tpl.brandVoiceProfileId);
      } catch {
        toast.error("Could not load template");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetTemplateId, articleId]);

  /* ── Initial submit (no articleId yet) ──────────────── */
  const handleStart = async (data) => {
    setSubmitting(true);
    try {
      if (quickGenerate) {
        const res = await generateArticleApi({
          topic: data.topic,
          targetKeyword: data.targetKeyword,
          tone: "Professional",
          targetWordCount: 1500,
        });
        const newId = res?.data?.articleId;
        if (newId && onQuickGenerated) onQuickGenerated(newId);
        toast.success("Quick Generate started — redirecting…");
        return;
      }
      const startRes = await startWizardApi({
        topic: data.topic,
        targetKeyword: data.targetKeyword,
        tone: "Professional",
        targetWordCount: 1500,
        ...(selectedVoice ? { brandVoiceProfileId: selectedVoice } : {}),
        ...(selectedTemplate ? { templateId: selectedTemplate } : {}),
      });
      const newId = startRes?.data?.articleId;
      if (!newId) throw new Error("Could not start wizard");
      dispatch(
        wizardActions.wizardStarted({
          articleId: newId,
          stages: startRes.data.stages,
          topic: data.topic,
          targetKeyword: data.targetKeyword,
        })
      );
      // Kick off the research stage immediately.
      await runStageApi(newId, "research");
    } catch (err) {
      toast.error(err?.message || "Could not start article");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Source toggle ─────────────────────────────────── */
  const toggleSource = (url) => dispatch(wizardActions.toggleSourceSelected(url));

  const selectedCount = research.selectedCanonicalUrls.length;
  const usableSources = research.sources.filter((s) => !s.skipReason);

  /* ── Approve research → continue to outline ─────────── */
  const handleContinue = async () => {
    if (!articleId) return;
    if (selectedCount < 3) {
      toast.error("Select at least 3 sources to continue");
      return;
    }
    setSubmitting(true);
    try {
      await patchBriefSelectionsApi(articleId, research.selectedCanonicalUrls);
      await approveStageApi(articleId, "research");
      dispatch(wizardActions.stageApproved({ stage: "research" }));
      onAdvance?.();
    } catch (err) {
      toast.error(err?.message || "Could not advance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!articleId) return;
    setSubmitting(true);
    try {
      await retryStageApi(articleId, "research");
      toast.success("Retrying research…");
    } catch (err) {
      toast.error(err?.message || "Retry failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ────────────────────────────────────────── */
  if (!articleId) {
    return (
      <GlassCard className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> Topic & keyword
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            We'll search the web, score sources, and you'll pick which ones to
            base your article on.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handleStart)} className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Topic
            </Label>
            <Input
              {...form.register("topic")}
              className="mt-1.5 bg-transparent border-white/10"
              placeholder="e.g. Modern JavaScript best practices"
            />
            {form.formState.errors.topic && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.topic.message}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Target keyword
            </Label>
            <Input
              {...form.register("targetKeyword")}
              className="mt-1.5 bg-transparent border-white/10"
              placeholder="javascript best practices"
            />
            {form.formState.errors.targetKeyword && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.targetKeyword.message}
              </p>
            )}
          </div>

          {/* Optional template + brand voice selectors. The backend
              applies the template's preset fields onto the new article
              and uses the chosen brand voice in the draft prompt. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Template (optional)
              </Label>
              <Select
                value={selectedTemplate || "__none__"}
                onValueChange={(v) =>
                  setSelectedTemplate(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="No template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Brand voice (optional)
              </Label>
              <Select
                value={selectedVoice || "__none__"}
                onValueChange={(v) =>
                  setSelectedVoice(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="No brand voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No brand voice</SelectItem>
                  {brandVoices.map((v) => {
                    const id = v._id || v.id;
                    return (
                      <SelectItem key={id} value={id}>
                        {v.name}
                        {v.isActive ? " (active)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick_Generate toggle (Req 11.1) */}
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={quickGenerate}
              onCheckedChange={(v) => setQuickGenerate(Boolean(v))}
            />
            <span>Quick Generate (skip wizard, run end-to-end)</span>
          </label>

          <GradientButton type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {quickGenerate ? "Generate end-to-end" : "Start research"}
          </GradientButton>
        </form>
      </GlassCard>
    );
  }

  /* Research running / awaiting approval */
  return (
    <div className="space-y-4">
      <GlassCard className="p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg flex items-center gap-2">
              {stageStatus === "running" && (
                <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              )}
              <Search className="h-4 w-4 text-primary" /> Research
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stageStatus === "running"
                ? "Searching, scraping, and summarizing sources…"
                : stageStatus === "awaiting_approval"
                ? `Found ${usableSources.length} usable source${usableSources.length === 1 ? "" : "s"}. Pick which ones to keep.`
                : stageStatus === "failed"
                ? "Research failed."
                : "Research not started."}
            </p>
          </div>
          {stageStatus === "failed" && retryCount < 3 && (
            <Button
              variant="glass"
              size="sm"
              onClick={handleRetry}
              disabled={submitting}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry ({3 - retryCount} left)
            </Button>
          )}
        </div>

        {failureReason && (
          <div className="flex items-start gap-2 text-xs p-2 rounded glass border border-red-400/30 bg-red-500/5">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
            <span className="text-red-300">{failureReason}</span>
          </div>
        )}

        {usableSources.length > 0 && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {selectedCount} selected · minimum 3
              </span>
            </div>
            <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {usableSources.map((s) => {
                const isSelected = research.selectedCanonicalUrls.includes(s.url);
                return (
                  <li
                    key={s.url}
                    className="flex items-start gap-3 p-3 rounded-lg glass border border-white/10 hover:border-primary/30 transition-colors"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSource(s.url)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.title || s.url}</p>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline truncate max-w-full"
                      >
                        {s.url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {s.snippet && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {s.snippet}
                        </p>
                      )}
                      <span className="text-[10px] uppercase text-muted-foreground mt-1 inline-block">
                        via {s.scraperProvider}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {research.summaryBullets.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/5">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
              Brief summary
            </h4>
            <ul className="space-y-1.5">
              {research.summaryBullets.map((b, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stageStatus === "awaiting_approval" && (
          <div className="flex justify-end pt-2">
            <GradientButton
              size="md"
              onClick={handleContinue}
              disabled={selectedCount < 3 || submitting}
            >
              Continue to outline →
            </GradientButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
