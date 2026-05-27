import express from "express";

import {
  generateMetaHandler,
  generateSlugHandler,
  generateFaqHandler,
  analyzeKeywordHandler,
} from "#controllers/article/seoToolsController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  metaSchema,
  slugSchema,
  faqSchema,
  keywordSchema,
} from "#validations/article/seoToolsValidation.js";

export const seoToolsRouter = express.Router();

seoToolsRouter.use("/seo", protect, tenantScope);

seoToolsRouter.post(
  "/seo/meta",
  createStrictRateLimiter(30, 5),
  requirePermission(PERMISSIONS.TENANT_SEO_USE),
  validate(metaSchema),
  generateMetaHandler
);

seoToolsRouter.post(
  "/seo/slug",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_SEO_USE),
  validate(slugSchema),
  generateSlugHandler
);

seoToolsRouter.post(
  "/seo/faq",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_SEO_USE),
  validate(faqSchema),
  generateFaqHandler
);

seoToolsRouter.post(
  "/seo/keyword",
  createStrictRateLimiter(30, 5),
  requirePermission(PERMISSIONS.TENANT_SEO_USE),
  validate(keywordSchema),
  analyzeKeywordHandler
);

export default seoToolsRouter;
