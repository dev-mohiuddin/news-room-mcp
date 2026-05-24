import mongoose from "mongoose";
import { AssetMonthPnl } from "#models/assetMonthPnlModel.js";

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

export const findAssetMonthPnl = async (assetId, monthKey) => {
  return AssetMonthPnl.findOne({ assetId: toObjectId(assetId), monthKey }).exec();
};

export const upsertAssetMonthPnl = async (assetId, monthKey, payload) => {
  return AssetMonthPnl.findOneAndUpdate(
    { assetId: toObjectId(assetId), monthKey },
    {
      ...payload,
      assetId: toObjectId(assetId),
      monthKey,
      recalculatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

export const findPreviousAssetMonthPnl = async (assetId, monthKey) => {
  return AssetMonthPnl.findOne({
    assetId: toObjectId(assetId),
    monthKey: { $lt: monthKey },
  })
    .sort({ monthKey: -1 })
    .exec();
};

export const listAssetMonthPnlMonthKeysByAsset = async (assetId, fromMonthKey) => {
  const query = { assetId: toObjectId(assetId) };
  if (fromMonthKey) {
    query.monthKey = { $gte: fromMonthKey };
  }

  const rows = await AssetMonthPnl.find(query).sort({ monthKey: 1 }).select("monthKey").lean();
  return rows.map((row) => row.monthKey);
};

export const sumAssetMonthPnlByMonth = async (monthKey, assetId) => {
  const match = {};
  if (monthKey) match.monthKey = monthKey;
  if (assetId) match.assetId = toObjectId(assetId);

  const rows = await AssetMonthPnl.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCarryInLoss: { $sum: "$carryInLoss" },
        totalDistributableProfit: { $sum: "$distributableProfit" },
        totalCarryOutLoss: { $sum: "$carryOutLoss" },
      },
    },
  ]).exec();

  return (
    rows?.[0] || {
      totalCarryInLoss: 0,
      totalDistributableProfit: 0,
      totalCarryOutLoss: 0,
    }
  );
};
