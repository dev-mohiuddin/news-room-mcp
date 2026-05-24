import {
  createShareAccounts,
  findShareAccountById,
  assignShareAccount,
  listShareAccountsByAsset,
  listShareAccountsByUser,
  findAvailableShareAccount,
} from "#repositories/shareAccountRepository.js";
import { createShareAssignment, getActiveAssignment } from "#repositories/shareAssignmentRepository.js";
import { createSharePayment, listPaymentsByShare, sumPaymentsUntil } from "#repositories/sharePaymentRepository.js";
import { getAssetById, updateAssetById } from "#repositories/assetRepository.js";
import { findUserById } from "#repositories/userRepository.js";
import { findWalletByUserId } from "#repositories/walletRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { emitToUser } from "#socket/server.js";

export const createShareAccountsForAsset = async (asset, actor) => {
  const docs = Array.from({ length: asset.totalShares }, (_, index) => ({
    assetId: asset._id,
    shareNumber: index + 1,
    status: "inactive",
    assignedUserId: null,
    assignedAt: null,
    assignedBy: null,
  }));

  const created = await createShareAccounts(docs);

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "shareAccount.bulkCreate",
    entity: "ShareAccount",
    entityId: asset._id,
    after: { assetId: asset._id, totalShares: asset.totalShares },
  });

  return created;
};

export const listShareAccounts = async (assetId) => {
  return listShareAccountsByAsset(assetId);
};

export const assignShare = async (shareAccountId, payload, actor) => {
  const shareAccount = await findShareAccountById(shareAccountId);
  if (!shareAccount) throwError("Share account not found", 404);

  if (shareAccount.status === "active") {
    throwError("Share account already assigned", 400);
  }

  const activeAssignment = await getActiveAssignment(shareAccountId);
  if (activeAssignment) {
    throwError("Share account already assigned", 400);
  }

  const asset = await getAssetById(shareAccount.assetId);
  if (!asset) throwError("Asset not found", 404);

  if ((asset.availableShares ?? asset.totalShares) <= 0) {
    throwError("No available shares left for this asset", 400);
  }

  const updatedAccount = await assignShareAccount(shareAccountId, {
    status: "active",
    assignedUserId: payload.userId,
    assignedAt: payload.assignedAt || new Date(),
    assignedBy: actor.id || actor._id,
  });

  const assignment = await createShareAssignment({
    shareAccountId,
    userId: payload.userId,
    assignedBy: actor.id || actor._id,
    assignedAt: payload.assignedAt || new Date(),
    status: "active",
  });

  await updateAssetById(asset._id, { $inc: { availableShares: -1 } });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "share.manualAssignment",
    entity: "ShareAccount",
    entityId: shareAccountId,
    before: shareAccount.toObject(),
    after: updatedAccount.toObject(),
    metadata: { assignmentId: assignment._id, assetId: asset._id },
  });

  emitToUser(payload.userId, "share:assigned", {
    shareAccountId: updatedAccount._id,
    assetId: asset._id,
  });

  return { shareAccount: updatedAccount, assignment };
};

export const recordSharePayment = async (shareAccountId, payload, actor) => {
  const shareAccount = await findShareAccountById(shareAccountId);
  if (!shareAccount) throwError("Share account not found", 404);
  if (shareAccount.status !== "active" || !shareAccount.assignedUserId) {
    throwError("Share account is not assigned", 400);
  }

  if (payload.userId && payload.userId !== shareAccount.assignedUserId.toString()) {
    throwError("Payment user does not match assigned user", 400);
  }

  const asset = await getAssetById(shareAccount.assetId);
  if (!asset) throwError("Asset not found", 404);

  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const paymentAggregate = await sumPaymentsUntil(shareAccount._id, shareAccount.assignedUserId, paidAt);
  const totalPaid = paymentAggregate?.[0]?.total || 0;
  if (totalPaid + payload.amount > asset.sharePrice) {
    throwError("Paid amount exceeds total share price", 400);
  }

  const payment = await createSharePayment({
    shareAccountId,
    userId: shareAccount.assignedUserId,
    amount: payload.amount,
    paidAt,
    createdBy: actor.id || actor._id,
    metadata: payload.metadata || {},
  });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "share.payment.record",
    entity: "SharePayment",
    entityId: payment._id,
    after: payment.toObject(),
  });

  emitToUser(shareAccount.assignedUserId, "share:payment", {
    shareAccountId: shareAccount._id,
    amount: payment.amount,
  });

  return payment;
};

export const listSharePayments = async (shareAccountId) => {
  return listPaymentsByShare(shareAccountId);
};

export const listUserShareAccounts = async (userId) => {
  const accounts = await listShareAccountsByUser(userId);
  const dayEnd = new Date();

  const enriched = await Promise.all(
    accounts.map(async (share) => {
      const paymentAggregate = await sumPaymentsUntil(
        share._id,
        share.assignedUserId,
        dayEnd
      );
      const paidAmount = paymentAggregate?.[0]?.total || 0;
      const sharePrice = share.assetId?.sharePrice || 0;
      const ownershipPercentage =
        sharePrice > 0 ? Number(((paidAmount / sharePrice) * 100).toFixed(2)) : 0;

      const row = share.toObject();
      row.paidAmount = paidAmount;
      row.ownershipPercentage = ownershipPercentage;
      return row;
    })
  );

  return enriched;
};

export const purchaseShare = async (assetId, payload, actor) => {
  const userId = actor.id || actor._id;

  const user = await findUserById(userId, { populateRole: true });
  if (!user) throwError("User not found", 404);
  if (user.isDeleted) throwError("Account has been deactivated", 403);
  if (!user.isActive) throwError("Account is inactive", 403);

  const approvalStatus = user.investorProfile?.approval?.status;
  if (approvalStatus && approvalStatus !== "approved") {
    throwError("Your profile is not approved yet. Financial actions are blocked until approval", 403);
  }

  const asset = await getAssetById(assetId);
  if (!asset) throwError("Asset not found", 404);

  if (asset.status !== "active") {
    throwError("This asset is not currently available for purchase", 400);
  }

  const availableShares = asset.availableShares ?? asset.totalShares;
  if (availableShares <= 0) {
    throwError("No shares available for this asset", 400);
  }

  const quantity = Math.max(1, Math.min(Number(payload.quantity) || 1, availableShares));
  const sharePrice = Number(asset.sharePrice || 0);
  const totalAmount = quantity * sharePrice;

  const wallet = await findWalletByUserId(userId);
  if (!wallet) throwError("Wallet not found. Please contact support.", 404);
  if (wallet.balance < totalAmount) {
    throwError(`Insufficient wallet balance. Required: $${totalAmount.toFixed(2)}, Available: $${(wallet.balance || 0).toFixed(2)}`, 400);
  }

  const purchased = [];
  let amountDebited = 0;
  const shareAccountsToAssign = [];

  for (let i = 0; i < quantity; i++) {
    const availableAccount = await findAvailableShareAccount(assetId);
    if (!availableAccount) {
      throwError(`Only ${i} shares could be assigned. No more available.`, 400);
    }

    shareAccountsToAssign.push(availableAccount);
  }

  const walletDebitResult = await wallet.updateOne({
    $inc: { balance: -totalAmount },
    lastTransactionAt: new Date(),
  });

  if (walletDebitResult.modifiedCount === 0) {
    throwError("Failed to debit wallet. Please try again.", 500);
  }

  try {
    const now = new Date();
    for (const availableAccount of shareAccountsToAssign) {
      const updatedAccount = await assignShareAccount(availableAccount._id, {
        status: "active",
        assignedUserId: userId,
        assignedAt: now,
        assignedBy: userId,
      });

      await createShareAssignment({
        shareAccountId: availableAccount._id,
        userId,
        assignedBy: userId,
        assignedAt: now,
        status: "active",
      });

      purchased.push({
        shareAccountId: availableAccount._id,
        shareNumber: availableAccount.shareNumber,
        price: sharePrice,
      });
    }

    await updateAssetById(assetId, { $inc: { availableShares: -quantity } });
    amountDebited = totalAmount;
  } catch (error) {
    await wallet.updateOne({
      $inc: { balance: totalAmount },
      lastTransactionAt: new Date(),
    });
    throw error;
  }

  await logAudit({
    actorId: userId,
    actorRole: actor.roleName || "Investor",
    action: "share.selfPurchase",
    entity: "ShareAccount",
    entityId: assetId,
    metadata: { quantity, totalAmount, shareIds: purchased.map((p) => p.shareAccountId) },
  });

  emitToUser(userId, "share:assigned", {
    assetId,
    quantity,
    totalAmount,
  });

  return {
    assetId,
    assetName: asset.name,
    quantity,
    sharePrice,
    totalAmount,
    walletBalance: wallet.balance - amountDebited,
    shares: purchased,
  };
};
