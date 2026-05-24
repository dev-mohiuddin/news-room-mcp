import { catchAsync } from "#utils/catchAsync.js";
import {
  listUsers,
  getUserById,
  updateUser,
  createInvestorByAdmin as createInvestorByAdminService,
  getInvestorByIdForAdmin,
  updateInvestorByAdmin,
  updateInvestorStatusByAdmin,
  reviewInvestorApprovalByAdmin,
  submitInvestorProfileForApproval,
  uploadInvestorDocument,
  verifyInvestorDocument,
  listInvestorDocuments,
  getInvestorDashboardByUserId,
  listMyTransactions,
} from "#services/user/userService.js";

export const getMe = catchAsync(async (req, res) => {
  const user = await getUserById(req.user.id || req.user._id);
  res.success({ data: user, message: "User profile" });
});

export const getUsers = catchAsync(async (req, res) => {
  const { page, limit, roleName, isActive } = req.query;
  const users = await listUsers({ page, limit, roleName, isActive });
  res.success({ data: users, message: "Users retrieved" });
});

export const updateMe = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const updated = await updateUser(userId, req.body);
  res.success({ data: updated, message: "Profile updated" });
});

export const createInvestorByAdmin = catchAsync(async (req, res) => {
  const user = await createInvestorByAdminService(req.body, req.user);
  res.success({
    data: user,
    message: "Investor account created successfully",
    statusCode: 201,
  });
});

export const submitMyProfileForApproval = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const updated = await submitInvestorProfileForApproval(userId, req.body, req.user);
  res.success({
    data: updated,
    message: "Profile submitted for admin approval",
    statusCode: 200,
  });
});

export const uploadMyDocument = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const doc = await uploadInvestorDocument({
    targetUserId: userId,
    docType: req.body.docType,
    docNumber: req.body.docNumber,
    category: req.body.category,
    file: req.file,
    actor: req.user,
  });

  res.success({
    data: doc,
    message: "Document uploaded successfully",
    statusCode: 201,
  });
});

export const listMyDocuments = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const docs = await listInvestorDocuments(userId);
  res.success({ data: docs, message: "Documents retrieved" });
});

export const getMyInvestorDashboard = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const dashboard = await getInvestorDashboardByUserId(userId);
  res.success({ data: dashboard, message: "Investor dashboard snapshot" });
});

export const listMyTransactionsController = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const result = await listMyTransactions(userId, req.query || {});
  res.success({ data: result, message: "Wallet transactions retrieved" });
});

export const getInvestorAdminDetails = catchAsync(async (req, res) => {
  const details = await getInvestorByIdForAdmin(req.params.investorId);
  res.success({ data: details, message: "Investor details retrieved" });
});

export const updateInvestorAdmin = catchAsync(async (req, res) => {
  const updated = await updateInvestorByAdmin(req.params.investorId, req.body, req.user);
  res.success({ data: updated, message: "Investor profile updated" });
});

export const updateInvestorAdminStatus = catchAsync(async (req, res) => {
  const updated = await updateInvestorStatusByAdmin(req.params.investorId, req.body, req.user);
  res.success({ data: updated, message: "Investor status updated" });
});

export const reviewInvestorAdminApproval = catchAsync(async (req, res) => {
  const updated = await reviewInvestorApprovalByAdmin(
    req.params.investorId,
    req.body,
    req.user
  );
  res.success({ data: updated, message: "Investor approval decision saved" });
});

export const uploadInvestorDocumentByAdmin = catchAsync(async (req, res) => {
  const doc = await uploadInvestorDocument({
    targetUserId: req.params.investorId,
    docType: req.body.docType,
    docNumber: req.body.docNumber,
    category: req.body.category,
    file: req.file,
    actor: req.user,
  });

  res.success({
    data: doc,
    message: "Investor document uploaded",
    statusCode: 201,
  });
});

export const listInvestorAdminDocuments = catchAsync(async (req, res) => {
  const docs = await listInvestorDocuments(req.params.investorId);
  res.success({ data: docs, message: "Investor documents retrieved" });
});

export const verifyInvestorDocumentByAdmin = catchAsync(async (req, res) => {
  const result = await verifyInvestorDocument(
    req.params.investorId,
    req.params.documentId,
    req.body,
    req.user
  );
  res.success({ data: result, message: "Document verification updated" });
});
