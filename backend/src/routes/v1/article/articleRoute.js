import express from "express";

import {
  generateArticle,
  listArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  restoreArticleHandler,
  publishArticleHandler,
  retryArticleHandler,
  cancelArticleHandler,
  exportArticleHandler,
  duplicateArticleHandler,
  getQuota,
} from "#controllers/article/articleController.js";

import {
  generateSocial,
  generateImageBriefHandler,
  unsplashSearch,
  selectUnsplashImage,
  uploadFeaturedImage,
} from "#controllers/article/articleAgentsController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import { uploadSingle } from "#utils/multerUtil.js";
import {
  createStrictRateLimiter,
  createRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import {
  generateArticleSchema,
  articleIdParamSchema,
  updateArticleSchema,
  listArticlesQuerySchema,
  publishArticleSchema,
  retryArticleSchema,
  exportArticleSchema,
} from "#validations/article/articleValidation.js";
import { PERMISSIONS } from "#constants/roles.js";

export const articleRouter = express.Router();

/**
 * Mount path: /api/v1/articles
 *  - protect       → JWT
 *  - tenantScope   → req.tenant.workspaceId enforcement (Req 15)
 *  - requirePermission → fine-grained RBAC
 */
articleRouter.use("/articles", protect, tenantScope);
articleRouter.use("/quota", protect, tenantScope);

// Quota snapshot
articleRouter.get(
  "/quota",
  requirePermission(PERMISSIONS.TENANT_BILLING_READ),
  getQuota
);

// Generate (writes)
articleRouter.post(
  "/articles/generate",
  createStrictRateLimiter(20, 5), // 20 / 5min
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(generateArticleSchema),
  generateArticle
);

// List + read
articleRouter.get(
  "/articles",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_READ),
  validate(listArticlesQuerySchema),
  listArticles
);
articleRouter.get(
  "/articles/:id",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_READ),
  validate(articleIdParamSchema),
  getArticle
);

// Update
articleRouter.patch(
  "/articles/:id",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(updateArticleSchema),
  updateArticle
);

// Delete (soft) + restore
articleRouter.delete(
  "/articles/:id",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_DELETE),
  validate(articleIdParamSchema),
  deleteArticle
);
articleRouter.post(
  "/articles/:id/restore",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_DELETE),
  validate(articleIdParamSchema),
  restoreArticleHandler
);

// Publish
articleRouter.post(
  "/articles/:id/publish",
  createStrictRateLimiter(10, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_PUBLISH),
  validate(publishArticleSchema),
  publishArticleHandler
);

// Retry — re-run pipeline for `needs_revision`
articleRouter.post(
  "/articles/:id/retry",
  createStrictRateLimiter(10, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(retryArticleSchema),
  retryArticleHandler
);

// Cancel — abort an in-flight job
articleRouter.post(
  "/articles/:id/cancel",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(articleIdParamSchema),
  cancelArticleHandler
);

// Export — markdown / json / html download
articleRouter.get(
  "/articles/:id/export",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_READ),
  validate(exportArticleSchema),
  exportArticleHandler
);

// Duplicate — clone as a fresh draft (consumes a quota slot)
articleRouter.post(
  "/articles/:id/duplicate",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_CREATE),
  validate(articleIdParamSchema),
  duplicateArticleHandler
);

/* ── Phase B on-demand agents ─────────────────────────── */

// B4 — Social repurposer
articleRouter.post(
  "/articles/:id/social-pack",
  createStrictRateLimiter(15, 5),
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(articleIdParamSchema),
  generateSocial
);

// B7 — Featured image: brief / unsplash search / unsplash select / file upload
articleRouter.post(
  "/articles/:id/featured-image/brief",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(articleIdParamSchema),
  generateImageBriefHandler
);
articleRouter.get(
  "/articles/:id/featured-image/unsplash",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(articleIdParamSchema),
  unsplashSearch
);
articleRouter.post(
  "/articles/:id/featured-image/select",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  validate(articleIdParamSchema),
  selectUnsplashImage
);
articleRouter.post(
  "/articles/:id/featured-image/upload",
  requirePermission(PERMISSIONS.TENANT_ARTICLE_UPDATE),
  uploadSingle("file"),
  validate(articleIdParamSchema),
  uploadFeaturedImage
);

export default articleRouter;
