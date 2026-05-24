import { Asset } from "#models/assetModel.js";

const roundCurrency = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const initAssetValues = async () => {
  try {
    const legacyAssets = await Asset.find({
      $or: [
        { totalAssetValue: { $exists: false } },
        { totalAssetValue: null },
        { totalAssetValue: { $lte: 0 } },
      ],
    })
      .select("_id totalShares sharePrice")
      .lean();

    if (legacyAssets.length === 0) {
      return;
    }

    const updates = legacyAssets
      .map((asset) => {
        const totalShares = Number(asset.totalShares);
        const sharePrice = Number(asset.sharePrice);

        if (!Number.isFinite(totalShares) || totalShares < 1) return null;
        if (!Number.isFinite(sharePrice) || sharePrice <= 0) return null;

        const totalValue = roundCurrency(totalShares * sharePrice);

        return Asset.updateOne(
          { _id: asset._id },
          {
            $set: {
              totalAssetValue: totalValue,
              totalSharePrice: totalValue,
            },
          }
        );
      })
      .filter(Boolean);

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`Asset value backfill complete. Updated: ${updates.length}`);
    }
  } catch (error) {
    console.error("Error running asset value backfill:", error.message);
  }
};
