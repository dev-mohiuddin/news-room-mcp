import { createProfitLedger } from "#repositories/profitLedgerRepository.js";
import { createTransaction } from "#repositories/transactionRepository.js";
import { findWalletByUserId, createWallet, updateWalletBalance } from "#repositories/walletRepository.js";
import { findShareAccountById } from "#repositories/shareAccountRepository.js";
import { getAssetById } from "#repositories/assetRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { emitToUser } from "#socket/server.js";

const getWallet = async (userId) => {
  let wallet = await findWalletByUserId(userId);
  if (!wallet) {
    wallet = await createWallet({ userId, balance: 0, currency: "USD" });
  }
  return wallet;
};

export const createProfitAdjustment = async (payload, actor) => {
  const shareAccount = await findShareAccountById(payload.shareAccountId);
  if (!shareAccount) throwError("Share account not found", 404);

  const asset = await getAssetById(payload.assetId);
  if (!asset) throwError("Asset not found", 404);

  if (shareAccount.assetId.toString() !== asset._id.toString()) {
    throwError("Share account does not belong to asset", 400);
  }

  const wallet = await getWallet(payload.userId);

  const adjustmentAmount =
    payload.type === "reversal"
      ? -Math.abs(payload.amount)
      : payload.amount;

  if (wallet.balance + adjustmentAmount < 0) {
    throwError("Adjustment would result in negative wallet balance", 400);
  }

  const ledger = await createProfitLedger({
    walletId: wallet._id,
    userId: payload.userId,
    assetId: asset._id,
    shareAccountId: shareAccount._id,
    ledgerDate: payload.ledgerDate,
    amount: adjustmentAmount,
    currency: payload.currency || wallet.currency,
    type: payload.type,
    createdBy: actor.id || actor._id,
    metadata: {
      referenceLedgerId: payload.referenceLedgerId || null,
      ...payload.metadata,
    },
  });

  await updateWalletBalance(wallet._id, {
    $inc: { balance: adjustmentAmount },
    lastTransactionAt: new Date(),
  });

  await createTransaction({
    walletId: wallet._id,
    userId: payload.userId,
    amount: adjustmentAmount,
    currency: payload.currency || wallet.currency,
    type: payload.type,
    referenceType: "ProfitLedger",
    referenceId: ledger._id,
    createdBy: actor.id || actor._id,
    metadata: {
      referenceLedgerId: payload.referenceLedgerId || null,
      ...payload.metadata,
    },
  });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "profitLedger.adjustment.create",
    entity: "ProfitLedger",
    entityId: ledger._id,
    after: ledger.toObject(),
  });

  emitToUser(payload.userId, "profit:adjusted", {
    amount: adjustmentAmount,
    ledgerDate: payload.ledgerDate,
    assetId: asset._id,
    shareAccountId: shareAccount._id,
  });

  return ledger;
};
