import {
  SystemSettings,
  SETTINGS_SINGLETON_ID,
} from "#models/systemSettingsModel.js";

/**
 * ============================================================
 *  SystemSettings Repository — singleton accessors
 * ============================================================
 *
 *  Always operates on `_id = "system"`. The seeder ensures a row
 *  exists, so reads are non-null after boot. We still defensively
 *  upsert in `findOrCreate` to handle accidental row deletion.
 */

const ID = SETTINGS_SINGLETON_ID;

export const findOrCreate = async () => {
  const existing = await SystemSettings.findById(ID).exec();
  if (existing) return existing;
  return SystemSettings.create({ _id: ID });
};

export const findSettings = () => SystemSettings.findById(ID).exec();

/**
 * Patch settings via dot-path `$set` so nested subdocs merge cleanly
 * (Mongoose's default behavior would replace the entire subtree on
 * a top-level `$set`).
 */
export const patchSettings = async (patch, actorId) => {
  const dotSet = flatten(patch);
  if (actorId) dotSet.lastUpdatedBy = actorId;
  if (Object.keys(dotSet).length === 0) {
    return findSettings();
  }
  return SystemSettings.findByIdAndUpdate(
    ID,
    { $set: dotSet },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).exec();
};

/**
 * Replace the feature-flag list atomically. Used by the dedicated flag
 * endpoint so we don't rebuild the whole settings doc just to flip one
 * toggle.
 */
export const setFeatureFlags = (features, actorId) =>
  SystemSettings.findByIdAndUpdate(
    ID,
    {
      $set: {
        features: features || [],
        ...(actorId ? { lastUpdatedBy: actorId } : {}),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).exec();

export const upsertFeatureFlag = (flag, actorId) =>
  SystemSettings.findOneAndUpdate(
    { _id: ID, "features.id": flag.id },
    {
      $set: {
        "features.$.label": flag.label,
        "features.$.description": flag.description ?? "",
        "features.$.enabled": !!flag.enabled,
        "features.$.category": flag.category || "core",
        ...(actorId ? { lastUpdatedBy: actorId } : {}),
      },
    },
    { new: true }
  )
    .exec()
    .then((updated) =>
      updated
        ? updated
        : SystemSettings.findByIdAndUpdate(
            ID,
            {
              $push: { features: flag },
              ...(actorId ? { $set: { lastUpdatedBy: actorId } } : {}),
            },
            { new: true, upsert: true }
          ).exec()
    );

/* ── helpers ── */

const flatten = (obj, prefix = "", out = {}) => {
  if (!obj || typeof obj !== "object") return out;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
};
