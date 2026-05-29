import express from "express";

import {
  startWizardArticle,
  runStage,
  approveStage,
  regenerateStage,
  retryStage,
  patchBriefSelections,
  patchOutline,
  appendOutlineSection,
  removeOutlineSection,
  getStageChunks,
  abandonWizard,
} from "#controllers/article/wizardController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createStrictRateLimiter,
  createRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import {
  wizardStartSchema,
  stageRunParamSchema,
  stageParamSchema,
  briefSelectionsSchema,
  outlinePatchSchema,
  outlineSectionAppendSchema,
  outlineSectionRemoveParamSchema,
  chunkReplayQuerySchema,
} from "#validations/article/wizardValidation.js";
import { articleIdParamSchema } from "#validations/article/articleValidation.js";
import { PERMISSIONS } from "#constants/roles.js";

export const wizardRouter = express.Router();

/**
 * Mount path: /api/v1/articles
 * Mounted ONLY when ENABLE_WIZARD_BACKEND=true.
 */
wizardRouter.use("/articles", protect, tenantScope);

/* ── Start wizard article ─────────────────────────────── */
wizardRouter.post(
  "/articles/wizard/start",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(wizardStartSchema),
  startWizardArticle
);

/* ── Stage lifecycle ──────────────────────────────────── */
wizardRouter.post(
  "/articles/:id/stages/:stage/run",
  createStrictRateLimiter(30, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(stageRunParamSchema),
  runStage
);

wizardRouter.post(
  "/articles/:id/stages/:stage/approve",
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(stageRunParamSchema),
  approveStage
);

wizardRouter.post(
  "/articles/:id/stages/:stage/regenerate",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(stageRunParamSchema),
  regenerateStage
);

wizardRouter.post(
  "/articles/:id/stages/:stage/retry",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(stageRunParamSchema),
  retryStage
);

/* ── Brief / outline edits ────────────────────────────── */
wizardRouter.patch(
  "/articles/:id/brief/source-selections",
  createRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(briefSelectionsSchema),
  patchBriefSelections
);

wizardRouter.patch(
  "/articles/:id/outline",
  createRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(outlinePatchSchema),
  patchOutline
);

wizardRouter.post(
  "/articles/:id/outline/sections",
  createRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(outlineSectionAppendSchema),
  appendOutlineSection
);

wizardRouter.delete(
  "/articles/:id/outline/sections/:idx",
  createRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(outlineSectionRemoveParamSchema),
  removeOutlineSection
);

/* ── Stream replay ────────────────────────────────────── */
wizardRouter.get(
  "/articles/:id/stages/:stage/chunks",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_READ),
  validate(chunkReplayQuerySchema),
  getStageChunks
);

/* ── Abandon ──────────────────────────────────────────── */
wizardRouter.post(
  "/articles/:id/wizard/abandon",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_DELETE),
  validate(articleIdParamSchema),
  abandonWizard
);

export default wizardRouter;
