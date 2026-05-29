import { createSlice } from "@reduxjs/toolkit";

/**
 * ============================================================
 *  Wizard slice — Requirement 1, 7, 9 (state machine, streaming)
 * ============================================================
 *
 *  Holds the in-flight wizard state for ONE article at a time.
 *  Calling `articleSnapshot` with a new articleId resets the slice
 *  to the snapshot's contents.
 *
 *  Streamed chunks (article:stage_chunk) are idempotent on
 *  `chunkIndex` — re-receiving an index ≤ stream.lastChunkIndex[stage]
 *  is a no-op.
 */

const STAGES = ["research", "outline", "draft", "originality", "seo", "publish"];

const blankStageRecord = (name) => ({
  name,
  status: "pending",
  retryCount: 0,
  chunkCount: 0,
  failureReason: null,
  recoverable: false,
  startedAt: null,
  completedAt: null,
  approvedAt: null,
});

const initialState = {
  articleId: null,
  wizardMode: false,
  topic: "",
  targetKeyword: "",
  tone: "Professional",
  targetWordCount: 1500,

  currentStep: "research",
  stages: STAGES.reduce((acc, name) => {
    acc[name] = blankStageRecord(name);
    return acc;
  }, {}),

  research: {
    sources: [],          // streaming source cards
    summaryBullets: [],   // streaming bullets
    selectedCanonicalUrls: [],
  },
  outline: {
    sections: [],
    isDirty: false,
  },
  draft: {
    paragraphs: [],
    sourcesIndex: [],
    contentHtml: "",
    contentMarkdown: "",
    wordCount: 0,
    readingTimeMinutes: 0,
    originalityRecord: null,
    autoSave: { status: "idle", lastSavedAt: null, error: null },
  },
  originality: {
    score: null,
    provider: null,
    flaggedSpans: [],
    checkedAt: null,
  },
  seo: {
    metaTitleOptions: [],
    metaTitle: null,
    metaDescription: null,
    slug: null,
    tags: [],
    faq: [],
    internalLinks: [],
    keywordDensityPercent: 0,
  },
  publish: {
    mode: "draft",
    scheduledAt: null,
    cmsConnectionId: null,
    featuredImage: null,
    checklistOverride: false,
    checklistOverrideReason: "",
  },

  stream: {
    connected: false,
    pollingActive: false,
    lastChunkIndex: { research: -1, outline: -1, draft: -1, originality: -1, seo: -1 },
  },
};

/* Helpers ─────────────────────────────────────────────────── */

const stageNameFromPayload = (state, stage) => {
  if (!STAGES.includes(stage)) return null;
  return stage;
};

const indexStagesFromArticle = (article) => {
  const indexed = STAGES.reduce((acc, name) => {
    acc[name] = blankStageRecord(name);
    return acc;
  }, {});
  for (const s of article?.stages || []) {
    if (indexed[s.name]) {
      indexed[s.name] = {
        ...indexed[s.name],
        ...s,
      };
    }
  }
  return indexed;
};

const computeCurrentStep = (stages) => {
  // Earliest non-approved stage. If all approved → "publish".
  for (const name of STAGES) {
    if (stages[name].status !== "approved") return name;
  }
  return "publish";
};

/* Slice ───────────────────────────────────────────────────── */

const wizardSlice = createSlice({
  name: "wizard",
  initialState,
  reducers: {
    /**
     * Replace the wizard state from a `GET /articles/:id` response. Does NOT
     * touch `stream.*` (socket/poll state is owned by the hook).
     */
    articleSnapshot(state, action) {
      const article = action.payload?.article || action.payload;
      if (!article) return;
      state.articleId = String(article._id || article.id || "");
      state.wizardMode = Boolean(article?.wizardMode);
      state.topic = article?.topic || "";
      state.targetKeyword = article?.targetKeyword || "";
      state.tone = article?.tone || "Professional";
      state.targetWordCount = article?.targetWordCount || 1500;

      state.stages = indexStagesFromArticle(article);
      state.currentStep = computeCurrentStep(state.stages);

      state.outline.sections = article?.outline || [];
      state.outline.isDirty = false;

      state.draft.paragraphs = article?.paragraphs || [];
      state.draft.sourcesIndex = article?.sourcesIndex || [];
      state.draft.contentHtml = article?.contentHtml || "";
      state.draft.contentMarkdown = article?.contentMarkdown || "";
      state.draft.wordCount = article?.wordCount || 0;
      state.draft.readingTimeMinutes = article?.readingTimeMinutes || 0;
      state.draft.originalityRecord = article?.originalityRecord || null;

      const orig = article?.originalityRecord;
      if (orig) {
        state.originality.score = orig.score;
        state.originality.provider = orig.provider;
        state.originality.flaggedSpans = orig.flaggedSpans || [];
        state.originality.checkedAt = orig.checkedAt || null;
      }

      const seo = article?.seo || {};
      state.seo.metaTitleOptions = seo?.metaTitleOptions || [];
      state.seo.metaTitle = seo?.metaTitle ?? null;
      state.seo.metaDescription = seo?.metaDescription ?? null;
      state.seo.slug = seo?.slug ?? null;
      state.seo.tags = seo?.tags || [];
      state.seo.faq = seo?.faq || [];

      const pub = article?.publishConfig || {};
      state.publish.mode = pub?.mode || "draft";
      state.publish.scheduledAt = pub?.scheduledAt || null;
      state.publish.cmsConnectionId = pub?.cmsConnectionId || null;
      state.publish.featuredImage = pub?.featuredImage || null;
      state.publish.checklistOverride = Boolean(pub?.checklistOverride);
      state.publish.checklistOverrideReason = pub?.checklistOverrideReason || "";

      state.research.selectedCanonicalUrls =
        article?.briefSelections?.selectedCanonicalUrls || [];

      const brief = action.payload?.brief;
      if (brief) {
        state.research.sources = (brief?.sources || []).map((s) => ({
          url: s?.url || "",
          originalUrl: s?.originalUrl || s?.url || "",
          title: s?.title || "",
          snippet: s?.snippet || "",
          scraperProvider: s?.scraperProvider || "",
          retrievedAt: s?.retrievedAt || null,
          skipReason: s?.skipReason || null,
        }));
        state.research.summaryBullets = brief?.summaryBullets || [];
      }
    },

    /**
     * Replace the slice with a fresh wizard article (POST /wizard/start).
     * Keeps stream defaults but resets every stage output.
     */
    wizardStarted(state, action) {
      const { articleId, stages, topic, targetKeyword, tone, targetWordCount } =
        action.payload || {};
      state.articleId = String(articleId);
      state.wizardMode = true;
      state.topic = topic || "";
      state.targetKeyword = targetKeyword || "";
      state.tone = tone || "Professional";
      state.targetWordCount = targetWordCount || 1500;
      state.stages = indexStagesFromArticle({ stages });
      state.currentStep = "research";
      state.research = { sources: [], summaryBullets: [], selectedCanonicalUrls: [] };
      state.outline = { sections: [], isDirty: false };
      state.draft = {
        paragraphs: [], sourcesIndex: [], contentHtml: "", contentMarkdown: "",
        wordCount: 0, readingTimeMinutes: 0, originalityRecord: null,
        autoSave: { status: "idle", lastSavedAt: null, error: null },
      };
      state.originality = { score: null, provider: null, flaggedSpans: [], checkedAt: null };
      state.seo = {
        metaTitleOptions: [], metaTitle: null, metaDescription: null,
        slug: null, tags: [], faq: [], internalLinks: [], keywordDensityPercent: 0,
      };
      state.publish = {
        mode: "draft", scheduledAt: null, cmsConnectionId: null,
        featuredImage: null, checklistOverride: false, checklistOverrideReason: "",
      };
      state.stream.lastChunkIndex = { research: -1, outline: -1, draft: -1, originality: -1, seo: -1 };
    },

    /* ── Streaming events ───────────────────────────── */

    stageStarted(state, action) {
      const { stage, retryCount } = action.payload || {};
      const name = stageNameFromPayload(state, stage);
      if (!name) return;
      state.stages[name].status = "running";
      state.stages[name].retryCount = retryCount || state.stages[name].retryCount;
      state.stages[name].failureReason = null;
      state.stages[name].recoverable = false;
      state.stages[name].startedAt = action.payload.startedAt || new Date().toISOString();
      state.currentStep = name;
      state.stream.lastChunkIndex[name] = -1;
    },

    stageChunk(state, action) {
      const { stage, chunkIndex, chunkType, data } = action.payload || {};
      const name = stageNameFromPayload(state, stage);
      if (!name) return;
      const last = state.stream.lastChunkIndex[name] ?? -1;
      if (chunkIndex <= last) return; // idempotent — drop duplicates / replays
      state.stream.lastChunkIndex[name] = chunkIndex;
      state.stages[name].chunkCount = chunkIndex + 1;

      switch (name) {
        case "research":
          if (chunkType === "source") {
            state.research.sources.push(data);
          } else if (chunkType === "summary_bullet") {
            state.research.summaryBullets.push(data);
          }
          break;
        case "outline":
          if (chunkType === "outline_section") {
            state.outline.sections.push(data);
          }
          break;
        case "draft":
          if (chunkType === "paragraph") {
            state.draft.paragraphs.push(data);
            // contentHtml is rebuilt from paragraphs[] by the editor's
            // hydrateFromParagraphs() call. Mutating it here on every
            // chunk causes the editor's value-sync useEffect to fire
            // mid-stream and replaces the doc out from under the user's
            // cursor. The final canonical snapshot arrives in
            // `stageCompleted` (output.paragraphs) and rebuilds
            // contentHtml once, cleanly.
          }
          break;
        case "seo":
          switch (chunkType) {
            case "meta_titles":
              state.seo.metaTitleOptions = data.options;
              if (!state.seo.metaTitle && data.options?.length) {
                state.seo.metaTitle = data.options[0];
              }
              break;
            case "meta_description":
              state.seo.metaDescription = data.value;
              break;
            case "slug":
              state.seo.slug = data.value;
              break;
            case "tags":
              state.seo.tags = data.values;
              break;
            case "faq":
              state.seo.faq.push(data.entry);
              break;
            case "internal_links":
              state.seo.internalLinks = data.suggestions || [];
              break;
            case "keyword_density":
              state.seo.keywordDensityPercent = data.percent || 0;
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    },

    stageCompleted(state, action) {
      const { stage, completedAt, totalChunks, output } = action.payload || {};
      const name = stageNameFromPayload(state, stage);
      if (!name) return;
      state.stages[name].status = "awaiting_approval";
      state.stages[name].completedAt = completedAt || new Date().toISOString();
      state.stages[name].chunkCount = totalChunks || state.stages[name].chunkCount;

      // Re-hydrate from the canonical output snapshot to avoid drift from
      // any chunks we may have missed before reconnect.
      if (output && name === "draft" && Array.isArray(output?.paragraphs)) {
        state.draft.paragraphs = output.paragraphs;
        state.draft.sourcesIndex = output?.sourcesIndex || [];
        state.draft.wordCount = output?.wordCount || 0;
        state.draft.readingTimeMinutes = output?.readingTimeMinutes || 0;
        state.draft.originalityRecord = output?.originalityRecord || null;
        state.draft.contentHtml = (output.paragraphs || [])
          .map((p) => p?.html || "")
          .filter(Boolean)
          .join("\n");
      }
      if (output && name === "originality") {
        const rec = output?.originalityRecord;
        if (rec) {
          state.originality.score = rec.score;
          state.originality.provider = rec.provider;
          state.originality.flaggedSpans = rec.flaggedSpans || [];
          state.originality.checkedAt = rec.checkedAt || new Date().toISOString();
        }
      }
      if (output && name === "outline" && Array.isArray(output?.outline)) {
        state.outline.sections = output.outline;
      }
      if (output && name === "seo" && output?.seo) {
        state.seo.metaTitleOptions = output.seo?.metaTitleOptions || [];
        state.seo.metaTitle = output.seo?.metaTitle || state.seo.metaTitle;
        state.seo.metaDescription = output.seo?.metaDescription || null;
        state.seo.slug = output.seo?.slug || null;
        state.seo.tags = output.seo?.tags || [];
        state.seo.faq = output.seo?.faq || [];
      }
    },

    stageFailed(state, action) {
      const { stage, failureReason, recoverable, retryCount } = action.payload || {};
      const name = stageNameFromPayload(state, stage);
      if (!name) return;
      state.stages[name].status = "failed";
      state.stages[name].failureReason = failureReason || "UNKNOWN";
      state.stages[name].recoverable = Boolean(recoverable);
      state.stages[name].retryCount = retryCount || state.stages[name].retryCount;
    },

    stageApproved(state, action) {
      const { stage } = action.payload || {};
      const name = stageNameFromPayload(state, stage);
      if (!name) return;
      state.stages[name].status = "approved";
      state.stages[name].approvedAt = new Date().toISOString();
      state.currentStep = computeCurrentStep(state.stages);
    },

    stageReset(state, action) {
      const { stage } = action.payload || {};
      const name = stageNameFromPayload(state, stage);
      if (!name) return;
      // Used after regenerate cascade.
      state.stages[name] = blankStageRecord(name);
      state.stream.lastChunkIndex[name] = -1;
    },

    /* ── Stream connection state (owned by useWizardStream) ── */

    streamConnected(state) {
      state.stream.connected = true;
      state.stream.pollingActive = false;
    },
    streamDisconnected(state) {
      state.stream.connected = false;
    },
    streamPolling(state, action) {
      state.stream.pollingActive = Boolean(action.payload);
    },

    /**
     * Pure navigation — change `currentStep` WITHOUT touching the
     * stage's `status`. The stepper uses this when the user clicks
     * a previous (already-approved or awaiting-approval) step.
     * Replacing the previous misuse of `stageStarted` for navigation.
     */
    setCurrentStep(state, action) {
      const name = stageNameFromPayload(state, action.payload);
      if (name) state.currentStep = name;
    },

    /* ── Research interactions ──────────────────────── */

    setSelectedSourceUrls(state, action) {
      state.research.selectedCanonicalUrls = action.payload || [];
    },
    toggleSourceSelected(state, action) {
      const url = action.payload;
      const set = new Set(state.research.selectedCanonicalUrls);
      if (set.has(url)) set.delete(url); else set.add(url);
      state.research.selectedCanonicalUrls = [...set];
    },

    /* ── Outline interactions ───────────────────────── */

    setOutlineOrder(state, action) {
      state.outline.sections = action.payload || [];
      state.outline.isDirty = true;
    },
    renameSection(state, action) {
      const { idx, heading } = action.payload || {};
      if (state.outline.sections[idx]) {
        state.outline.sections[idx].heading = heading;
        state.outline.isDirty = true;
      }
    },
    addSection(state, action) {
      const section = action.payload;
      state.outline.sections.push(section);
      state.outline.isDirty = true;
    },
    removeSection(state, action) {
      const idx = action.payload;
      state.outline.sections = state.outline.sections.filter((_, i) => i !== idx);
      state.outline.isDirty = true;
    },
    setTone(state, action) {
      state.tone = action.payload;
    },
    setTargetWordCount(state, action) {
      state.targetWordCount = action.payload;
    },
    markOutlineClean(state) {
      state.outline.isDirty = false;
    },

    /* ── Draft interactions ──────────────────────────── */

    setDraftHtml(state, action) {
      state.draft.contentHtml = action.payload || "";
    },
    setDraftStats(state, action) {
      const { wordCount, readingTimeMinutes } = action.payload || {};
      state.draft.wordCount = wordCount ?? state.draft.wordCount;
      state.draft.readingTimeMinutes = readingTimeMinutes ?? state.draft.readingTimeMinutes;
    },
    setAutoSaveStatus(state, action) {
      const { status, lastSavedAt, error } = action.payload || {};
      state.draft.autoSave.status = status || state.draft.autoSave.status;
      if (lastSavedAt !== undefined) state.draft.autoSave.lastSavedAt = lastSavedAt;
      state.draft.autoSave.error = error ?? null;
    },

    /* ── SEO interactions ────────────────────────────── */

    setMetaTitle(state, action) { state.seo.metaTitle = action.payload; },
    setMetaDescription(state, action) { state.seo.metaDescription = action.payload; },
    setSlug(state, action) { state.seo.slug = action.payload; },
    setTags(state, action) { state.seo.tags = action.payload || []; },

    /* ── Publish interactions ───────────────────────── */

    setPublishMode(state, action) { state.publish.mode = action.payload; },
    setScheduledAt(state, action) { state.publish.scheduledAt = action.payload; },
    setCmsConnectionId(state, action) { state.publish.cmsConnectionId = action.payload; },
    setFeaturedImage(state, action) { state.publish.featuredImage = action.payload; },
    setChecklistOverride(state, action) {
      const { override, reason } = action.payload || {};
      state.publish.checklistOverride = Boolean(override);
      state.publish.checklistOverrideReason = reason || "";
    },

    /* ── Reset on navigation away ──────────────────── */

    resetWizard() {
      return initialState;
    },
  },
});

export const wizardActions = wizardSlice.actions;

/* Selectors ───────────────────────────────────────────── */

export const selectWizardArticleId = (s) => s.wizard.articleId;
export const selectWizardCurrentStep = (s) => s.wizard.currentStep;
export const selectWizardStages = (s) => s.wizard.stages;
export const selectStageStatus = (stage) => (s) => s.wizard.stages[stage]?.status;
export const selectIsAnyStageRunning = (s) =>
  Object.values(s.wizard.stages).some((st) => st.status === "running");
export const selectStreamConnected = (s) => s.wizard.stream.connected;
export const selectStreamPolling = (s) => s.wizard.stream.pollingActive;

export default wizardSlice.reducer;
