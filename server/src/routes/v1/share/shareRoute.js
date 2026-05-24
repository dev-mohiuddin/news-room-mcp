import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import { createStrictRateLimiter } from "#middlewares/rateLimiterMiddleware.js";
import {
  assignShareController,
  recordSharePaymentController,
  listShareAccountsController,
  listSharePaymentsController,
  listMyShareAccountsController,
  purchaseShareController,
} from "#controllers/share/shareController.js";
import {
  assignShareSchema,
  recordSharePaymentSchema,
  listShareAccountsSchema,
  listSharePaymentsSchema,
  purchaseShareSchema,
} from "#validations/share/shareValidation.js";

export const shareRouter = express.Router();

shareRouter.get(
  "/assets/:assetId/share-accounts",
  protect,
  authorize(["platform.asset:read", "share:account:read"]),
  validate(listShareAccountsSchema),
  listShareAccountsController
);

shareRouter.post(
  "/share-accounts/:shareAccountId/assign",
  protect,
  authorize(["platform.asset:update", "share:assign"]),
  validate(assignShareSchema),
  assignShareController
);

shareRouter.post(
  "/share-accounts/:shareAccountId/payments",
  protect,
  authorize(["platform.asset:update", "share:payment:create"]),
  validate(recordSharePaymentSchema),
  recordSharePaymentController
);

shareRouter.get(
  "/share-accounts/:shareAccountId/payments",
  protect,
  authorize(["platform.asset:read", "share:payment:read"]),
  validate(listSharePaymentsSchema),
  listSharePaymentsController
);

shareRouter.get(
  "/share-accounts/me",
  protect,
  authorize(["investor.share:read", "share:read", "share:account:read"]),
  listMyShareAccountsController
);

shareRouter.post(
  "/assets/:assetId/purchase",
  protect,
  authorize(["investor.share:create", "share:create"]),
  createStrictRateLimiter(5, 15),
  validate(purchaseShareSchema),
  purchaseShareController
);
