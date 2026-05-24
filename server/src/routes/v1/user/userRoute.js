import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import { upload } from "#utils/multerUtil.js";
import {
  createInvestorByAdmin,
  getMe,
  getUsers,
  updateMe,
  getInvestorAdminDetails,
  updateInvestorAdmin,
  updateInvestorAdminStatus,
  reviewInvestorAdminApproval,
  submitMyProfileForApproval,
  uploadMyDocument,
  listMyDocuments,
  getMyInvestorDashboard,
  listMyTransactionsController,
  uploadInvestorDocumentByAdmin,
  verifyInvestorDocumentByAdmin,
  listInvestorAdminDocuments,
} from "#controllers/user/userController.js";
import {
  createInvestorByAdminSchema,
  getInvestorByIdSchema,
  investorDocumentUploadByAdminSchema,
  investorDocumentUploadSchema,
  listInvestorDocumentsSchema,
  listMyTransactionsQuerySchema,
  reviewInvestorApprovalSchema,
  submitInvestorProfileSchema,
  updateInvestorByAdminSchema,
  updateInvestorStatusSchema,
  updateMeSchema,
} from "#validations/user/userValidation.js";

export const userRouter = express.Router();

userRouter.get("/users/me", protect, getMe);
userRouter.get("/users/me/investor-dashboard", protect, getMyInvestorDashboard);
userRouter.get(
  "/users/me/transactions",
  protect,
  validate(listMyTransactionsQuerySchema),
  listMyTransactionsController
);
userRouter.patch("/users/me", protect, validate(updateMeSchema), updateMe);
userRouter.post(
  "/users/me/profile/submit",
  protect,
  validate(submitInvestorProfileSchema),
  submitMyProfileForApproval
);
userRouter.get("/users/me/documents", protect, listMyDocuments);
userRouter.post(
  "/users/me/documents",
  protect,
  upload.single("file"),
  validate(investorDocumentUploadSchema),
  uploadMyDocument
);

userRouter.post(
  "/users/investors",
  protect,
  authorize(["platform.user:create", "user:create"]),
  validate(createInvestorByAdminSchema),
  createInvestorByAdmin
);

userRouter.get(
  "/users/investors/:investorId",
  protect,
  authorize(["platform.user:read", "user:read"]),
  validate(getInvestorByIdSchema),
  getInvestorAdminDetails
);

userRouter.patch(
  "/users/investors/:investorId",
  protect,
  authorize(["platform.user:update", "user:update"]),
  validate(updateInvestorByAdminSchema),
  updateInvestorAdmin
);

userRouter.patch(
  "/users/investors/:investorId/status",
  protect,
  authorize(["platform.user:update", "user:update"]),
  validate(updateInvestorStatusSchema),
  updateInvestorAdminStatus
);

userRouter.patch(
  "/users/investors/:investorId/approval",
  protect,
  authorize(["platform.user:update", "user:update"]),
  validate(reviewInvestorApprovalSchema),
  reviewInvestorAdminApproval
);

userRouter.get(
  "/users/investors/:investorId/documents",
  protect,
  authorize(["platform.user:read", "user:read"]),
  validate(listInvestorDocumentsSchema),
  listInvestorAdminDocuments
);

userRouter.post(
  "/users/investors/:investorId/documents",
  protect,
  authorize(["platform.user:update", "user:update"]),
  upload.single("file"),
  validate(investorDocumentUploadByAdminSchema),
  uploadInvestorDocumentByAdmin
);

userRouter.patch(
  "/users/investors/:investorId/documents/:documentId/verify",
  protect,
  authorize(["platform.user:update", "user:update"]),
  verifyInvestorDocumentByAdmin
);

userRouter.get(
  "/users",
  protect,
  authorize(["platform.user:read", "user:read"]),
  getUsers
);
