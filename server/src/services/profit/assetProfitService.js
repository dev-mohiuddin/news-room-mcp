import { createAssetProfit, listAssetProfitsByAssetMonth } from "#repositories/assetProfitRepository.js";
import { getAssetById } from "#repositories/assetRepository.js";
import { recomputeAssetPnlFromMonth } from "#services/profit/assetPnlService.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";

export const recordAssetProfit = async (payload, actor) => {
  const asset = await getAssetById(payload.assetId);
  if (!asset) throwError("Asset not found", 404);

  const entry = await createAssetProfit({
    assetId: payload.assetId,
    monthKey: payload.monthKey,
    amount: payload.amount,
    currency: payload.currency || "USD",
    type: payload.type || "base",
    createdBy: actor.id || actor._id,
  });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "assetProfit.create",
    entity: "AssetProfit",
    entityId: entry._id,
    after: entry.toObject(),
  });

  await recomputeAssetPnlFromMonth(payload.assetId, payload.monthKey);

  return entry;
};

export const listAssetProfitEntries = async (assetId, monthKey) => {
  return listAssetProfitsByAssetMonth(assetId, monthKey);
};
