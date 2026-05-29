import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

import WizardStepper from "@/components/wizard/WizardStepper";
import StreamStatusBadge from "@/components/wizard/StreamStatusBadge";
import ResearchStep from "@/components/wizard/research/ResearchStep";
import OutlineStep from "@/components/wizard/outline/OutlineStep";
import DraftStep from "@/components/wizard/draft/DraftStep";
import OriginalityStep from "@/components/wizard/originality/OriginalityStep";
import SeoStep from "@/components/wizard/seo/SeoStep";
import PublishStep from "@/components/wizard/publish/PublishStep";

import { useWizardStream } from "@/hooks/useWizardStream";
import { useArticlePolling } from "@/hooks/useArticlePolling";
import { getArticleApi } from "@/api/article/article";
import {
  wizardActions,
  selectWizardCurrentStep,
  selectWizardStages,
  selectIsAnyStageRunning,
  selectStreamConnected,
} from "@/redux/slice/wizard-slice";

/**
 * ============================================================
 *  WizardLayout — Requirement 1, 7, 9
 * ============================================================
 *
 *  Routes:
 *    /dashboard/new-article             — fresh wizard (no articleId)
 *    /dashboard/new-article/:articleId  — resume an in-progress wizard
 *
 *  Wires:
 *    - useWizardStream → live Socket.io chunk hydration
 *    - useArticlePolling → fallback when socket disconnects
 *    - Initial GET /articles/:id snapshot when articleId is present
 *
 *  The user can navigate backward to any approved/awaiting/failed step
 *  while no stage is running. Forward navigation is gated by the prior
 *  stage's `approved` status (server enforces this too).
 */

export default function WizardLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { articleId: routeArticleId } = useParams();

  const stages = useSelector(selectWizardStages);
  const currentStep = useSelector(selectWizardCurrentStep);
  const isAnyRunning = useSelector(selectIsAnyStageRunning);
  const streamConnected = useSelector(selectStreamConnected);
  const currentArticleId = useSelector((s) => s.wizard.articleId);

  /* Track which stage is currently running so the stream replay
     hook knows what to ask back-end for on reconnect. */
  const runningStageRef = useRef(null);
  useEffect(() => {
    runningStageRef.current = Object.keys(stages).find(
      (n) => stages[n].status === "running"
    ) || null;
  }, [stages]);

  /* On mount: if route has articleId, hydrate the slice from the server. */
  useEffect(() => {
    let cancelled = false;
    if (routeArticleId && routeArticleId !== currentArticleId) {
      (async () => {
        try {
          const res = await getArticleApi(routeArticleId);
          if (cancelled) return;
          dispatch(wizardActions.articleSnapshot(res?.data || res));
        } catch (err) {
          if (cancelled) return;
          // Article missing or unauthorized → reset and show entry form.
          dispatch(wizardActions.resetWizard());
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [routeArticleId, currentArticleId, dispatch]);

  /* Live stream + polling fallback */
  useWizardStream(currentArticleId, runningStageRef);
  useArticlePolling(currentArticleId, {
    enabled: Boolean(currentArticleId) && !streamConnected && isAnyRunning,
    intervalMs: 8000,
  });

  /* When article URL changes from /new-article (no id) to one with id
     after wizardStarted, mirror it into the URL bar so reload works. */
  useEffect(() => {
    if (currentArticleId && !routeArticleId) {
      navigate(`/dashboard/new-article/${currentArticleId}`, { replace: true });
    }
  }, [currentArticleId, routeArticleId, navigate]);

  /* Reset slice on unmount (leaving the wizard route family) */
  useEffect(() => {
    return () => {
      dispatch(wizardActions.resetWizard());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (stage) => {
    if (isAnyRunning) return;
    // Only allow navigation between non-pending stages (or current).
    const target = stages[stage];
    if (target?.status === "pending" && stage !== currentStep) return;
    // Pure navigation — does NOT mutate any stage's status.
    dispatch(wizardActions.setCurrentStep(stage));
  };

  const handleAdvance = () => {
    /* No-op — the slice's `stageApproved` reducer recomputes currentStep
       to the next non-approved stage automatically. */
  };

  const handleQuickGenerated = (newId) => {
    navigate(`/dashboard/articles/${newId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Create"
        title="New Article"
        subtitle="Six-step wizard: research → outline → draft → originality → SEO → publish."
        actions={<StreamStatusBadge />}
      />

      <div className="overflow-x-auto pb-2">
        <WizardStepper
          stages={stages}
          currentStep={currentStep}
          onSelect={handleSelect}
          isAnyRunning={isAnyRunning}
          articleId={currentArticleId}
        />
      </div>

      {/**
        * Each step's panel renders only when it is the active step. We do
        * NOT keep all panels mounted because TipTap, dnd-kit, and the
        * stream subscriptions all do work on mount/unmount that would
        * compound across hidden tabs. Stepping is debounced via
        * `currentStep` so every transition is one render cycle.
        */}
      <div className="min-h-[420px]">
        {currentStep === "research" && (
          <ResearchStep
            onAdvance={handleAdvance}
            onQuickGenerated={handleQuickGenerated}
          />
        )}
        {currentStep === "outline" && <OutlineStep onAdvance={handleAdvance} />}
        {currentStep === "draft" && <DraftStep onAdvance={handleAdvance} />}
        {currentStep === "originality" && <OriginalityStep onAdvance={handleAdvance} />}
        {currentStep === "seo" && <SeoStep onAdvance={handleAdvance} />}
        {currentStep === "publish" && <PublishStep />}
      </div>

      <div className="text-center pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/articles")}>
          ← Back to articles
        </Button>
      </div>
    </div>
  );
}
