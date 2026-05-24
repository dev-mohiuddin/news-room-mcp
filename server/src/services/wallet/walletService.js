import {
  findWalletByUserId,
  createWallet,
  updateWalletBalance,
  debitWalletBalanceIfAvailable,
} from "#repositories/walletRepository.js";
import { findUserById } from "#repositories/userRepository.js";
import {
  createWithdrawalRequest,
  getWithdrawalRequestsByUser,
  getAllWithdrawalRequests,
  getWithdrawalRequestById,
  updateWithdrawalRequestById,
} from "#repositories/withdrawalRequestRepository.js";
import {
  createDepositRequest,
  getDepositRequestsByUser,
  getAllDepositRequests,
  getDepositRequestById,
  updateDepositRequestById,
} from "#repositories/depositRequestRepository.js";
import { createTransaction } from "#repositories/transactionRepository.js";
import { cloudinary } from "#utils/cloudinaryUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  notifyWalletOutOfBand,
  notifyWalletSocket,
} from "#services/wallet/walletNotificationService.js";
import { sendWithdrawalStatusEmail, sendDepositStatusEmail } from "#utils/emailUtil.js";

const WITHDRAWAL_TRANSITIONS = {
  requested: new Set(["approved", "processing", "rejected", "cancelled"]),
  approved: new Set(["processing", "paid", "cancelled"]),
  processing: new Set(["paid", "cancelled"]),
  paid: new Set(),
  rejected: new Set(),
  cancelled: new Set(),
};

const DEPOSIT_TRANSITIONS = {
  requested: new Set(["approved", "completed", "rejected", "cancelled"]),
  approved: new Set(["completed", "rejected", "cancelled"]),
  completed: new Set(),
  rejected: new Set(),
  cancelled: new Set(),
};

const STATUSES_REQUIRING_REASON = new Set(["rejected", "cancelled"]);

const toActorId = (actor) => actor?.id || actor?._id || null;

const sendStatusEmail = async (userId, status, amount, channel) => {
  try {
    const user = await findUserById(userId);
    if (!user) return;
    const firstName = user.firstName || "User";
    const email = user.email;
    if (!email) return;

    if (channel === "withdrawal") {
      await sendWithdrawalStatusEmail(email, firstName, status, amount);
    } else {
      await sendDepositStatusEmail(email, firstName, status, amount);
    }
  } catch (_) {
    // email failure should not block the operation
  }
};

const normalizePayoutMethod = (method) => {
  const normalized = String(method || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (["bank", "banktransfer", "bankaccount"].includes(normalized)) {
    return "bank";
  }

  if (normalized === "bkash") {
    return "bkash";
  }

  throwError("Payment method must be bank or bkash", 422);
};

const buildStatusHistoryEntry = ({ status, note, reason, actorId }) => {
  const history = {
    status,
    changedAt: new Date(),
  };

  if (actorId) {
    history.changedBy = actorId;
  }

  if (note) {
    history.note = note;
  }

  if (reason) {
    history.reason = reason;
  }

  return history;
};

const appendStatusHistory = (existing, next) => {
  const previous = Array.isArray(existing) ? existing : [];
  return [...previous, next];
};

const requireReasonWhenNeeded = (status, reason) => {
  if (STATUSES_REQUIRING_REASON.has(status) && !reason) {
    throwError(`Reason is required when marking as ${status}`, 422);
  }
};

const validateStatusTransition = (map, entityName, currentStatus, nextStatus) => {
  const allowed = map[currentStatus] || new Set();
  if (!allowed.has(nextStatus)) {
    throwError(
      `${entityName} cannot move from ${currentStatus} to ${nextStatus}`,
      400
    );
  }
};

const uploadBufferToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });

    stream.end(buffer);
  });
};

const normalizeCloudinaryUploadError = (error) => {
  const message = error?.message || "Cloudinary upload failed";

  if (/cloud_name is disabled/i.test(message)) {
    return "Cloudinary cloud name is disabled or invalid. Update CLOUDINARY_CLOUD_NAME with an active lowercase cloud name.";
  }

  if (/must supply api_key|invalid api_key|api key/i.test(message)) {
    return "Cloudinary API key is invalid. Check CLOUDINARY_API_KEY in server/.env.";
  }

  if (/invalid signature|api secret/i.test(message)) {
    return "Cloudinary API secret is invalid. Check CLOUDINARY_API_SECRET in server/.env.";
  }

  return `Cloudinary upload failed: ${message}`;
};

const normalizeReviewNote = (payload) => {
  if (typeof payload?.note === "string") {
    return payload.note.trim();
  }
  return "";
};

const normalizeReviewReason = (payload) => {
  if (typeof payload?.reason === "string") {
    return payload.reason.trim();
  }
  return "";
};

const createWalletNotificationPayload = ({ requestId, status, amount, currency, note, reason }) => {
  const payload = {
    requestId,
    status,
    amount,
    currency,
  };

  if (note) {
    payload.note = note;
  }

  if (reason) {
    payload.reason = reason;
  }

  return payload;
};

const notifyWalletLifecycle = ({ userId, channel, payload }) => {
  const event = channel === "withdrawal" ? "wallet:withdrawal-updated" : "wallet:deposit-updated";
  notifyWalletSocket(userId, event, payload);

  notifyWalletOutOfBand({
    userId,
    channel,
    template: `${channel}.${payload.status}`,
    payload,
  });
};

const hasWithdrawalFundsDebited = (request) => Boolean(request?.metadata?.fundsDebitedAt);
const hasWithdrawalFundsRefunded = (request) => Boolean(request?.metadata?.fundsRefundedAt);
const hasWithdrawalFundsSettled = (request) => Boolean(request?.metadata?.fundsSettledAt);

const applyWithdrawalFinancialEffects = async ({
  request,
  nextStatus,
  actorId,
  note,
  reason,
}) => {
  const amount = Math.abs(Number(request?.amount || 0));
  if (!amount) return {};

  const metadataPatch = {};
  const isDebited = hasWithdrawalFundsDebited(request);
  const isRefunded = hasWithdrawalFundsRefunded(request);
  const isSettled = hasWithdrawalFundsSettled(request);

  if (nextStatus === "paid") {
    if (!isDebited) {
      const debitedWallet = await debitWalletBalanceIfAvailable(request.walletId, amount);
      if (!debitedWallet) {
        throwError("Insufficient wallet balance to mark withdrawal as paid", 400);
      }

      const debitTransaction = await createTransaction({
        walletId: request.walletId,
        userId: request.userId,
        amount: -amount,
        currency: request.currency,
        type: "withdrawal",
        referenceType: "WithdrawalRequest",
        referenceId: request._id,
        createdBy: actorId,
        metadata: {
          payoutMethod: request.method,
          lifecycleStage: "paid_legacy_debit",
          ...(request?.payoutSnapshot ? { payoutSnapshot: request.payoutSnapshot } : {}),
          ...(note ? { note } : {}),
          ...(reason ? { reason } : {}),
        },
      });

      metadataPatch.fundsDebitedAt = new Date();
      metadataPatch.fundsDebitedBy = actorId;
      metadataPatch.fundsDebitedOnRequest = false;
      if (debitTransaction?._id) {
        metadataPatch.fundsDebitTransactionId = debitTransaction._id;
      }

      notifyWalletSocket(request.userId, "wallet:balance-updated", {
        amount: -amount,
        currency: request.currency,
        source: "withdrawal",
        referenceId: request._id,
      });
    }

    if (!isSettled) {
      metadataPatch.fundsSettledAt = new Date();
      metadataPatch.fundsSettledBy = actorId;
    }

    return metadataPatch;
  }

  if (["rejected", "cancelled"].includes(nextStatus) && isDebited && !isRefunded && !isSettled) {
    const refundedWallet = await updateWalletBalance(request.walletId, {
      $inc: { balance: amount },
      lastTransactionAt: new Date(),
    });

    if (!refundedWallet) {
      throwError("Wallet not found", 404);
    }

    const refundTransaction = await createTransaction({
      walletId: request.walletId,
      userId: request.userId,
      amount,
      currency: request.currency,
      type: "reversal",
      referenceType: "WithdrawalRequest",
      referenceId: request._id,
      createdBy: actorId,
      metadata: {
        payoutMethod: request.method,
        lifecycleStage: "withdrawal_refund",
        fromStatus: request.status,
        toStatus: nextStatus,
        ...(note ? { note } : {}),
        ...(reason ? { reason } : {}),
      },
    });

    metadataPatch.fundsRefundedAt = new Date();
    metadataPatch.fundsRefundedBy = actorId;
    if (refundTransaction?._id) {
      metadataPatch.fundsRefundTransactionId = refundTransaction._id;
    }

    notifyWalletSocket(request.userId, "wallet:balance-updated", {
      amount,
      currency: request.currency,
      source: "withdrawal_refund",
      referenceId: request._id,
    });
  }

  return metadataPatch;
};

const updateWithdrawalStatusInternal = async ({
  request,
  nextStatus,
  note,
  reason,
  actor,
  requireReason = true,
  auditAction,
}) => {
  const currentStatus = request.status || "requested";
  const actorId = toActorId(actor);

  if (currentStatus === nextStatus) {
    return request;
  }

  validateStatusTransition(WITHDRAWAL_TRANSITIONS, "Withdrawal", currentStatus, nextStatus);
  if (requireReason) {
    requireReasonWhenNeeded(nextStatus, reason);
  }

  const financialMetadataPatch = await applyWithdrawalFinancialEffects({
    request,
    nextStatus,
    actorId,
    note,
    reason,
  });

  const statusHistory = appendStatusHistory(
    request.statusHistory,
    buildStatusHistoryEntry({
      status: nextStatus,
      note,
      reason,
      actorId,
    })
  );

  const metadata = {
    ...(request.metadata || {}),
    reviewedAt: new Date(),
    actedAt: new Date(),
    ...(actorId ? { reviewedBy: actorId, actedBy: actorId } : {}),
    ...(note ? { lastNote: note } : {}),
    ...(reason ? { lastReason: reason } : {}),
    ...financialMetadataPatch,
  };

  const before = request.toObject();
  const updated = await updateWithdrawalRequestById(request._id, {
    status: nextStatus,
    statusHistory,
    metadata,
  });

  await logAudit({
    actorId,
    actorRole: actor?.roleName,
    action: auditAction || `wallet.withdrawal.${nextStatus}`,
    entity: "WithdrawalRequest",
    entityId: updated._id,
    before,
    after: updated.toObject(),
    metadata: {
      ...(note ? { note } : {}),
      ...(reason ? { reason } : {}),
    },
  });

  notifyWalletLifecycle({
    userId: request.userId,
    channel: "withdrawal",
    payload: createWalletNotificationPayload({
      requestId: request._id,
      status: nextStatus,
      amount: request.amount,
      currency: request.currency,
      note,
      reason,
    }),
  });

  sendStatusEmail(request.userId, nextStatus, request.amount, "withdrawal");

  return updated;
};

const buildPayoutSnapshot = (user, method) => {
  const payoutDetails = user?.investorProfile?.payoutDetails || {};
  const preferredMethod = payoutDetails?.preferredMethod || method;

  if (method === "bank") {
    const bank = payoutDetails?.bankAccount || {};
    if (!bank.bankName || !bank.accountHolderName || !bank.accountNumber) {
      throwError(
        "Bank payout details are incomplete. Update your profile before requesting withdrawal",
        422
      );
    }

    return {
      method,
      preferredMethod,
      bankAccount: {
        bankName: bank.bankName,
        accountHolderName: bank.accountHolderName,
        accountNumber: bank.accountNumber,
        routingNumber: bank.routingNumber || "",
        branchName: bank.branchName || "",
      },
    };
  }

  const bkash = payoutDetails?.bkash || {};
  if (!bkash.number) {
    throwError(
      "bKash payout details are incomplete. Update your profile before requesting withdrawal",
      422
    );
  }

  return {
    method,
    preferredMethod,
    bkash: {
      number: bkash.number,
      accountType: bkash.accountType || "personal",
      accountHolderName: bkash.accountHolderName || "",
    },
  };
};

const ensureDepositProofUpload = async (file, userId) => {
  if (!file?.buffer) {
    throwError("Deposit proof screenshot is required", 422);
  }

  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
      folder: `sharebit/deposits/${userId}`,
      resource_type: "image",
    });
  } catch (error) {
    throwError(normalizeCloudinaryUploadError(error), 502, {
      provider: "cloudinary",
      cause: error?.message || "unknown",
    });
  }

  if (!cloudinaryResult?.secure_url || !cloudinaryResult?.public_id) {
    throwError("Cloudinary upload completed without valid file metadata", 502, {
      provider: "cloudinary",
    });
  }

  return {
    screenshotUrl: cloudinaryResult.secure_url,
    screenshotPublicId: cloudinaryResult.public_id,
    submittedAt: new Date(),
  };
};

const ensureInvestorFinancialAccess = async (userId) => {
  const user = await findUserById(userId, { populateRole: true });
  if (!user) throwError("User not found", 404);

  const roleName = String(user.roleId?.name || "").toLowerCase();
  const isInvestorRole = roleName.includes("investor") || roleName.includes("user");

  if (!isInvestorRole) return user;

  if (!user.isActive) {
    throwError("Account is inactive. Financial actions are blocked", 403);
  }

  const approvalStatus = user.investorProfile?.approval?.status;
  if (approvalStatus && approvalStatus !== "approved") {
    throwError(
      "Your profile is not approved yet. Financial actions are blocked until approval",
      403
    );
  }

  return user;
};

export const getWallet = async (userId) => {
  let wallet = await findWalletByUserId(userId);
  if (!wallet) {
    wallet = await createWallet({ userId, balance: 0, currency: "USD" });
  }
  return wallet;
};

export const requestWithdrawal = async (userId, payload, actor) => {
  const user = await ensureInvestorFinancialAccess(userId);

  const wallet = await getWallet(userId);
  const amount = Math.abs(Number(payload.amount || 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throwError("Invalid withdrawal amount", 422);
  }

  const actorId = toActorId(actor);
  const method = normalizePayoutMethod(
    payload.method || user?.investorProfile?.payoutDetails?.preferredMethod
  );
  const payoutSnapshot = buildPayoutSnapshot(user, method);

  const reservedWallet = await debitWalletBalanceIfAvailable(wallet._id, amount);
  if (!reservedWallet) {
    throwError("Insufficient balance", 400);
  }

  const requestedNote =
    (typeof payload.note === "string" && payload.note.trim()) ||
    (typeof payload?.metadata?.reason === "string" && payload.metadata.reason.trim()) ||
    "";

  const statusHistory = [
    buildStatusHistoryEntry({
      status: "requested",
      note: requestedNote,
      actorId,
    }),
  ];

  const metadata = {
    ...(payload.metadata || {}),
    submittedBy: actorId,
    submittedAt: new Date(),
    fundsDebitedAt: new Date(),
    fundsDebitedBy: actorId,
    fundsDebitedOnRequest: true,
    ...(requestedNote ? { requestNote: requestedNote } : {}),
  };

  let request;
  try {
    request = await createWithdrawalRequest({
      userId,
      walletId: wallet._id,
      amount,
      currency: wallet.currency,
      method,
      payoutSnapshot,
      statusHistory,
      metadata,
    });
  } catch (error) {
    await updateWalletBalance(wallet._id, {
      $inc: { balance: amount },
      lastTransactionAt: new Date(),
    });
    throw error;
  }

  let reserveTransaction = null;
  try {
    reserveTransaction = await createTransaction({
      walletId: wallet._id,
      userId,
      amount: -amount,
      currency: wallet.currency,
      type: "withdrawal",
      referenceType: "WithdrawalRequest",
      referenceId: request._id,
      createdBy: actorId,
      metadata: {
        payoutMethod: method,
        lifecycleStage: "requested_reserve",
        ...(payoutSnapshot ? { payoutSnapshot } : {}),
        ...(requestedNote ? { note: requestedNote } : {}),
      },
    });
  } catch (error) {
    reserveTransaction = null;
  }

  let finalizedRequest = request;
  if (reserveTransaction?._id) {
    finalizedRequest = await updateWithdrawalRequestById(request._id, {
      metadata: {
        ...(request.metadata || {}),
        fundsDebitTransactionId: reserveTransaction._id,
      },
    });
  }

  notifyWalletSocket(userId, "wallet:balance-updated", {
    amount: -amount,
    currency: wallet.currency,
    source: "withdrawal_request",
    referenceId: request._id,
  });

  await logAudit({
    actorId,
    actorRole: actor.roleName,
    action: "wallet.withdrawal.request",
    entity: "WithdrawalRequest",
    entityId: finalizedRequest._id,
    after: finalizedRequest.toObject(),
  });

  notifyWalletLifecycle({
    userId,
    channel: "withdrawal",
    payload: createWalletNotificationPayload({
      requestId: finalizedRequest._id,
      status: finalizedRequest.status,
      amount: finalizedRequest.amount,
      currency: finalizedRequest.currency,
      note: requestedNote,
      reason: "",
    }),
  });

  return finalizedRequest;
};

export const listWithdrawals = async (userId) => {
  return getWithdrawalRequestsByUser(userId);
};

export const listAllWithdrawals = async () => {
  return getAllWithdrawalRequests();
};

export const updateWithdrawalStatus = async (withdrawalId, payload, actor) => {
  const request = await getWithdrawalRequestById(withdrawalId);
  if (!request) throwError("Withdrawal request not found", 404);

  const nextStatus = payload.status;
  const note = normalizeReviewNote(payload);
  const reason = normalizeReviewReason(payload);

  return updateWithdrawalStatusInternal({
    request,
    nextStatus,
    note,
    reason,
    actor,
    requireReason: true,
    auditAction: `wallet.withdrawal.${nextStatus}`,
  });
};

export const cancelWithdrawalByInvestor = async (userId, withdrawalId, payload, actor) => {
  const request = await getWithdrawalRequestById(withdrawalId);
  if (!request) throwError("Withdrawal request not found", 404);

  if (String(request.userId) !== String(userId)) {
    throwError("You can cancel only your own withdrawal request", 403);
  }

  const currentStatus = request.status || "requested";
  if (currentStatus !== "requested") {
    throwError("You can cancel withdrawal only before admin approval", 400);
  }

  const note = normalizeReviewNote(payload);
  const reason = normalizeReviewReason(payload);

  return updateWithdrawalStatusInternal({
    request,
    nextStatus: "cancelled",
    note,
    reason,
    actor,
    requireReason: false,
    auditAction: "wallet.withdrawal.cancelled_by_investor",
  });
};

export const requestDeposit = async (userId, payload, file, actor) => {
  await ensureInvestorFinancialAccess(userId);

  const wallet = await getWallet(userId);
  const actorId = toActorId(actor);
  const method = normalizePayoutMethod(payload.method);
  const proofUpload = await ensureDepositProofUpload(file, userId);
  const note = typeof payload.note === "string" ? payload.note.trim() : "";

  const request = await createDepositRequest({
    userId,
    walletId: wallet._id,
    amount: payload.amount,
    currency: wallet.currency,
    method,
    proof: {
      transactionId: payload.transactionId,
      screenshotUrl: proofUpload.screenshotUrl,
      screenshotPublicId: proofUpload.screenshotPublicId,
      submittedAt: proofUpload.submittedAt,
    },
    statusHistory: [
      buildStatusHistoryEntry({
        status: "requested",
        note,
        actorId,
      }),
    ],
    metadata: {
      submittedBy: actorId,
      submittedAt: new Date(),
      ...(note ? { requestNote: note } : {}),
    },
  });

  await logAudit({
    actorId,
    actorRole: actor.roleName,
    action: "wallet.deposit.request",
    entity: "DepositRequest",
    entityId: request._id,
    after: request.toObject(),
  });

  notifyWalletLifecycle({
    userId,
    channel: "deposit",
    payload: createWalletNotificationPayload({
      requestId: request._id,
      status: request.status,
      amount: request.amount,
      currency: request.currency,
      note,
      reason: "",
    }),
  });

  return request;
};

export const listDeposits = async (userId) => {
  return getDepositRequestsByUser(userId);
};

export const listAllDeposits = async () => {
  return getAllDepositRequests();
};

export const updateDepositStatus = async (depositId, payload, actor) => {
  const request = await getDepositRequestById(depositId);
  if (!request) throwError("Deposit request not found", 404);

  const nextStatus = payload.status;
  const currentStatus = request.status || "requested";
  const note = normalizeReviewNote(payload);
  const reason = normalizeReviewReason(payload);
  const actorId = toActorId(actor);

  if (currentStatus === nextStatus) {
    return request;
  }

  validateStatusTransition(DEPOSIT_TRANSITIONS, "Deposit", currentStatus, nextStatus);
  requireReasonWhenNeeded(nextStatus, reason);

  if (nextStatus === "completed") {
    const wallet = await getWallet(request.userId);

    await updateWalletBalance(wallet._id, {
      $inc: { balance: Math.abs(request.amount) },
      lastTransactionAt: new Date(),
    });

    await createTransaction({
      walletId: wallet._id,
      userId: request.userId,
      amount: Math.abs(request.amount),
      currency: request.currency,
      type: "deposit",
      referenceType: "DepositRequest",
      referenceId: request._id,
      createdBy: actorId,
      metadata: {
        paymentMethod: request.method,
        transactionId: request?.proof?.transactionId,
        ...(note ? { note } : {}),
        ...(reason ? { reason } : {}),
      },
    });

    notifyWalletSocket(request.userId, "wallet:balance-updated", {
      amount: Math.abs(request.amount),
      currency: request.currency,
      source: "deposit",
      referenceId: request._id,
    });
  }

  const statusHistory = appendStatusHistory(
    request.statusHistory,
    buildStatusHistoryEntry({
      status: nextStatus,
      note,
      reason,
      actorId,
    })
  );

  const metadata = {
    ...(request.metadata || {}),
    reviewedBy: actorId,
    reviewedAt: new Date(),
    ...(note ? { lastNote: note } : {}),
    ...(reason ? { lastReason: reason } : {}),
  };

  const updated = await updateDepositRequestById(depositId, {
    status: nextStatus,
    statusHistory,
    metadata,
  });

  await logAudit({
    actorId,
    actorRole: actor.roleName,
    action: `wallet.deposit.${nextStatus}`,
    entity: "DepositRequest",
    entityId: updated._id,
    before: request.toObject(),
    after: updated.toObject(),
    metadata: {
      ...(note ? { note } : {}),
      ...(reason ? { reason } : {}),
    },
  });

  notifyWalletLifecycle({
    userId: request.userId,
    channel: "deposit",
    payload: createWalletNotificationPayload({
      requestId: request._id,
      status: nextStatus,
      amount: request.amount,
      currency: request.currency,
      note,
      reason,
    }),
  });

  sendStatusEmail(request.userId, nextStatus, request.amount, "deposit");

  return updated;
};
