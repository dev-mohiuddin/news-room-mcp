import {
  findOrCreate,
  findSettings,
  patchSettings,
  setFeatureFlags,
  upsertFeatureFlag,
} from "#repositories/systemSettingsRepository.js";
import { logAudit } from "#utils/auditLogger.js";
import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";

/**
 * ============================================================
 *  SystemSettings Service
 * ============================================================
 *
 *  Public reads: identity + branding + maintenance.enabled + maintenance.message
 *    → consumed by the landing page & maintenance banner
 *  Admin reads:  full document
 *  Admin writes: section-scoped patch endpoints
 *
 *  Hot-path cache:
 *    The maintenance middleware needs to read the maintenance flag on
 *    every request. We cache the latest doc in memory for `CACHE_TTL_MS`
 *    so we don't hit Mongo on every API call. Cache invalidates on every
 *    write through the service.
 */

const CACHE_TTL_MS = 5_000;
let cache = { value: null, expiresAt: 0 };

const invalidateCache = () => {
  cache = { value: null, expiresAt: 0 };
};

export const getSettingsCached = async () => {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;
  const fresh = await findOrCreate();
  cache = { value: fresh, expiresAt: now + CACHE_TTL_MS };
  return fresh;
};

const toAdminShape = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    identity: o.identity || {},
    branding: o.branding || {},
    email: o.email || {},
    maintenance: o.maintenance || { enabled: false },
    features: o.features || [],
    lastUpdatedBy: o.lastUpdatedBy || null,
    updatedAt: o.updatedAt || null,
    createdAt: o.createdAt || null,
  };
};

const toPublicShape = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    identity: {
      platformName: o.identity?.platformName || "Newsroom MCP",
      tagline: o.identity?.tagline || "",
      supportEmail: o.identity?.supportEmail || null,
    },
    branding: {
      primaryColor: o.branding?.primaryColor || "#3B82F6",
      logoLightUrl: o.branding?.logoLightUrl || null,
      logoDarkUrl: o.branding?.logoDarkUrl || null,
      faviconUrl: o.branding?.faviconUrl || null,
    },
    maintenance: {
      enabled: !!o.maintenance?.enabled,
      message: o.maintenance?.message || "",
    },
  };
};

/* ── Reads ── */

export const getAdminSettings = async () => {
  const doc = await findOrCreate();
  return toAdminShape(doc);
};

export const getPublicSettings = async () => {
  const doc = await getSettingsCached();
  return toPublicShape(doc);
};

/**
 * Used by the maintenance middleware. Returns just the flag + message,
 * cached in memory.
 */
export const getMaintenanceState = async () => {
  const doc = await getSettingsCached();
  return {
    enabled: !!doc?.maintenance?.enabled,
    message:
      doc?.maintenance?.message ||
      "We're upgrading our infrastructure. Please try again shortly.",
    allowAdminBypass: doc?.maintenance?.allowAdminBypass !== false,
  };
};

/* ── Writes ── */

const SECTION_KEYS = ["identity", "branding", "email", "maintenance"];

export const updateSettings = async ({ section, patch, actor, req }) => {
  if (!SECTION_KEYS.includes(section)) {
    throwError(`Unknown settings section '${section}'`, 400);
  }
  if (!patch || typeof patch !== "object") {
    throwError("Patch must be an object", 400);
  }

  const before = await findSettings();
  const before_section = before?.[section] ? before[section].toObject?.() ?? before[section] : null;

  const updated = await patchSettings(
    { [section]: patch },
    actor?.id || actor?._id || null
  );
  invalidateCache();

  await logAudit({
    actor,
    category: "system",
    action: `settings.${section}.updated`,
    entityType: "system_settings",
    entityId: null,
    before: before_section,
    after: patch,
    req,
  });

  logger.info(`[settings] section ${section} updated`);
  return toAdminShape(updated);
};

export const replaceFeatureFlags = async ({ flags, actor, req }) => {
  if (!Array.isArray(flags)) throwError("flags must be an array", 400);
  const cleaned = flags
    .filter((f) => f && typeof f === "object" && typeof f.id === "string")
    .map((f) => ({
      id: String(f.id).trim().slice(0, 60),
      label: String(f.label || f.id).trim().slice(0, 120),
      description: String(f.description || "").trim().slice(0, 300),
      enabled: !!f.enabled,
      category: ["core", "experimental", "integration", "billing"].includes(
        f.category
      )
        ? f.category
        : "core",
    }))
    .filter((f) => f.id && f.label);

  // Reject duplicate ids
  const ids = new Set();
  for (const f of cleaned) {
    if (ids.has(f.id)) throwError(`Duplicate feature flag id '${f.id}'`, 400);
    ids.add(f.id);
  }

  const updated = await setFeatureFlags(
    cleaned,
    actor?.id || actor?._id || null
  );
  invalidateCache();

  await logAudit({
    actor,
    category: "system",
    action: "settings.feature_flags.replaced",
    entityType: "system_settings",
    after: { count: cleaned.length },
    req,
  });

  return toAdminShape(updated);
};

export const toggleFeatureFlag = async ({
  flagId,
  enabled,
  label,
  description,
  category,
  actor,
  req,
}) => {
  if (!flagId) throwError("flagId is required", 400);
  const updated = await upsertFeatureFlag(
    {
      id: String(flagId).trim().slice(0, 60),
      label: label ? String(label).slice(0, 120) : flagId,
      description: description ? String(description).slice(0, 300) : "",
      enabled: !!enabled,
      category: category || "core",
    },
    actor?.id || actor?._id || null
  );
  invalidateCache();

  await logAudit({
    actor,
    category: "system",
    action: enabled
      ? "settings.feature_flag.enabled"
      : "settings.feature_flag.disabled",
    entityType: "system_settings",
    after: { flagId, enabled },
    req,
  });
  return toAdminShape(updated);
};

/**
 * Helper used by other services (e.g. article pipeline) to check a flag
 * without writing repository plumbing of their own.
 *
 *   if (await isFeatureEnabled("ghost_integration")) { ... }
 */
export const isFeatureEnabled = async (flagId) => {
  const doc = await getSettingsCached();
  const flag = (doc?.features || []).find((f) => f.id === flagId);
  return !!flag?.enabled;
};

/* ── Cache hooks ── */
export const __invalidateSettingsCache = invalidateCache;
