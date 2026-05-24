import {
  createAsset as createAssetRepo,
  getAssets,
  getAssetById,
  updateAssetById,
  deleteAssetById,
} from "#repositories/assetRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { createShareAccountsForAsset } from "#services/share/shareService.js";

const roundCurrency = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const ensurePositive = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throwError(`${fieldName} must be greater than 0`, 400);
  }
  return parsed;
};

const normalizeCreateFinancials = (data) => {
  const totalShares = Number(data.totalShares);

  if (!Number.isInteger(totalShares) || totalShares < 1) {
    throwError("totalShares must be a positive integer", 400);
  }

  if (data.totalAssetValue !== undefined) {
    const totalAssetValueInput = ensurePositive(data.totalAssetValue, "totalAssetValue");
    const sharePrice = roundCurrency(totalAssetValueInput / totalShares);
    if (sharePrice <= 0) {
      throwError("totalAssetValue is too low for the selected totalShares", 400);
    }

    const normalizedTotal = roundCurrency(sharePrice * totalShares);

    return {
      totalShares,
      sharePrice,
      totalSharePrice: normalizedTotal,
      totalAssetValue: normalizedTotal,
    };
  }

  const sharePrice = roundCurrency(ensurePositive(data.sharePrice, "sharePrice"));
  const totalSharePrice =
    data.totalSharePrice !== undefined
      ? roundCurrency(ensurePositive(data.totalSharePrice, "totalSharePrice"))
      : roundCurrency(totalShares * sharePrice);
  const totalAssetValue =
    data.totalAssetValue !== undefined
      ? roundCurrency(ensurePositive(data.totalAssetValue, "totalAssetValue"))
      : totalSharePrice;

  return {
    totalShares,
    sharePrice,
    totalSharePrice,
    totalAssetValue,
  };
};

const normalizeUpdateFinancials = (before, data) => {
  const hasFinancialUpdate =
    data.sharePrice !== undefined ||
    data.totalSharePrice !== undefined ||
    data.totalShares !== undefined ||
    data.totalAssetValue !== undefined;

  if (!hasFinancialUpdate) return data;

  const totalShares =
    data.totalShares !== undefined ? Number(data.totalShares) : Number(before.totalShares);

  if (!Number.isInteger(totalShares) || totalShares < 1) {
    throwError("totalShares must be a positive integer", 400);
  }

  let sharePrice;
  let totalSharePrice;
  let totalAssetValue;

  if (data.totalAssetValue !== undefined) {
    const totalAssetValueInput = ensurePositive(data.totalAssetValue, "totalAssetValue");
    sharePrice = roundCurrency(totalAssetValueInput / totalShares);
    if (sharePrice <= 0) {
      throwError("totalAssetValue is too low for the selected totalShares", 400);
    }
    totalSharePrice = roundCurrency(sharePrice * totalShares);
    totalAssetValue = totalSharePrice;
  } else if (data.totalSharePrice !== undefined && data.sharePrice === undefined) {
    const totalSharePriceInput = ensurePositive(data.totalSharePrice, "totalSharePrice");
    sharePrice = roundCurrency(totalSharePriceInput / totalShares);
    if (sharePrice <= 0) {
      throwError("totalSharePrice is too low for the selected totalShares", 400);
    }
    totalSharePrice = roundCurrency(sharePrice * totalShares);
    totalAssetValue = totalSharePrice;
  } else {
    const baseSharePrice =
      data.sharePrice !== undefined
        ? ensurePositive(data.sharePrice, "sharePrice")
        : Number(before.sharePrice);
    sharePrice = roundCurrency(baseSharePrice);
    totalSharePrice = roundCurrency(sharePrice * totalShares);
    totalAssetValue = totalSharePrice;
  }

  return {
    ...data,
    ...(data.totalShares !== undefined ? { totalShares } : {}),
    sharePrice,
    totalSharePrice,
    totalAssetValue,
  };
};

export const createAsset = async (data, actor) => {
  const normalizedFinancials = normalizeCreateFinancials(data);
  const availableShares = data.availableShares ?? normalizedFinancials.totalShares;

  const asset = await createAssetRepo({
    ...data,
    ...normalizedFinancials,
    availableShares,
    createdBy: data.createdBy || actor.id || actor._id,
  });

  await createShareAccountsForAsset(asset, actor);

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "asset.create",
    entity: "Asset",
    entityId: asset._id,
    after: asset.toObject(),
  });

  return asset;
};

export const listAssets = async () => {
  return getAssets();
};

export const getAsset = async (id) => {
  const asset = await getAssetById(id);
  if (!asset) throwError("Asset not found", 404);
  return asset;
};

export const updateAsset = async (id, data, actor) => {
  const before = await getAssetById(id);
  if (!before) throwError("Asset not found", 404);

  const normalizedPayload = normalizeUpdateFinancials(before, data);
  const updated = await updateAssetById(id, normalizedPayload);

  if (
    normalizedPayload.sharePrice !== undefined ||
    normalizedPayload.totalSharePrice !== undefined ||
    normalizedPayload.totalShares !== undefined ||
    normalizedPayload.totalAssetValue !== undefined
  ) {
    await logAudit({
      actorId: actor.id || actor._id,
      actorRole: actor.roleName,
      action: "asset.price.update",
      entity: "Asset",
      entityId: updated._id,
      before: {
        sharePrice: before.sharePrice,
        totalSharePrice: before.totalSharePrice,
        totalAssetValue: before.totalAssetValue,
        totalShares: before.totalShares,
      },
      after: {
        sharePrice: updated.sharePrice,
        totalSharePrice: updated.totalSharePrice,
        totalAssetValue: updated.totalAssetValue,
        totalShares: updated.totalShares,
      },
    });
  }

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "asset.update",
    entity: "Asset",
    entityId: updated._id,
    before: before.toObject(),
    after: updated.toObject(),
  });

  return updated;
};

export const deleteAsset = async (id, actor) => {
  const before = await getAssetById(id);
  if (!before) throwError("Asset not found", 404);

  await deleteAssetById(id);

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "asset.delete",
    entity: "Asset",
    entityId: before._id,
    before: before.toObject(),
  });
};
