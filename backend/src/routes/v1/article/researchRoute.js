import express from "express";

import {
  searchTopicHandler,
  summarizeSourcesHandler,
  generateBriefHandler,
} from "#controllers/article/researchHubController.js";

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
  searchTopicSchema,
  summarizeSourcesSchema,
} from "#validations/article/researchValidation.js";

export const researchRouter = express.Router();

researchRouter.use("/research", protect, tenantScope);

researchRouter.post(
  "/research/search",
  createRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_RESEARCH_USE),
  validate(searchTopicSchema),
  searchTopicHandler
);

researchRouter.post(
  "/research/summarize",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_RESEARCH_USE),
  validate(summarizeSourcesSchema),
  summarizeSourcesHandler
);

/* Alias kept for the existing frontend client */
researchRouter.post(
  "/research/brief",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_RESEARCH_USE),
  validate(summarizeSourcesSchema),
  generateBriefHandler
);

export default researchRouter;
