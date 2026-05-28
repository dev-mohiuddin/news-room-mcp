import * as repo from "#repositories/integrationRepository.js";
import { encrypt, decrypt, maskSecret } from "#utils/encryptionUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { logger } from "#utils/logger.js";
import { SUPPORTED_INTEGRATION_PROVIDERS } from "#models/integrationModel.js";

/**
 * ============================================================
 *  Admin Integrations — secret management + runtime config resolver
 * ============================================================
 *
 *  Public API:
 *    - listIntegrationsForAdmin()   → safe-to-render list (no plaintext)
 *    - upsertIntegration({ ... })   → encrypt + store, returns sanitized doc
 *    - deleteIntegration(provider)
 *    - setIntegrationActive(provider, isActive)
 *    - getProviderConfig(provider)  → decrypted bundle for runtime use
 *                                     (or null when not configured / disabled)
 *
 *  The runtime resolver is intentionally side-effect-free and cached
 *  for a short window so we don't hit Mongo on every API call. Cache
 *  invalidates on any mutation (upsert / delete / active toggle).
 */

/* ──────────────────────────────────────────────────────────
 *  Per-provider field schema — drives validation, masking, and
 *  the public meta block.
 *
 *  Each field:
 *    - secret  → encrypted at rest, never returned
 *    - meta    → kept in plaintext on `publicMeta` (safe to render)
 * ────────────────────────────────────────────────────────── */
const PROVIDER_FIELDS = {
  anthropic: { apiKey: "secret" },
  brave: { apiKey: "secret" },
  exa: { apiKey: "secret" },
  stripe: {
    secretKey: "secret",
    webhookSecret: "secret",
    publishableKey: "meta",
  },
  cloudinary: {
    cloudName: "meta",
    apiKey: "meta",
    apiSecret: "secret",
  },
  smtp: {
    host: "meta",
    port: "meta",
    user: "meta",
    pass: "secret",
    from: "meta",
  },
  dataforseo: {
    login: "meta",
    password: "secret",
  },
  firecrawl: { apiKey: "secret" },
  jina: { apiKey: "secret" },
};

/**
 * Pick the first secret field on each provider that we'll mask
 * for the integration card preview.
 */
const PRIMARY_SECRET_FIELD = {
  anthropic: "apiKey",
  brave: "apiKey",
  exa: "apiKey",
  stripe: "secretKey",
  cloudinary: "apiSecret",
  smtp: "pass",
  dataforseo: "password",
  firecrawl: "apiKey",
  jina: "apiKey",
};

const PROVIDER_DESCRIPTIONS = {
  anthropic: "Default Claude API key for content generation",
  brave: "Web research source provider",
  exa: "Semantic search fallback when Brave fails",
  stripe: "Subscription billing & invoicing",
  cloudinary: "Featured image storage and transformations",
  smtp: "Transactional email delivery",
  dataforseo: "Keyword analysis enrichment",
  firecrawl: "Primary web scraper for research",
  jina: "Fallback web scraper when Firecrawl fails",
};

const ENV_FALLBACKS = {
  anthropic: { apiKey: "ANTHROPIC_API_KEY" },
  brave: { apiKey: "BRAVE_SEARCH_API_KEY" },
  exa: { apiKey: "EXA_API_KEY" },
  stripe: {
    secretKey: "STRIPE_SECRET_KEY",
    webhookSecret: "STRIPE_WEBHOOK_SECRET",
    publishableKey: "STRIPE_PUBLISHABLE_KEY",
  },
  cloudinary: {
    cloudName: "CLOUDINARY_CLOUD_NAME",
    apiKey: "CLOUDINARY_API_KEY",
    apiSecret: "CLOUDINARY_API_SECRET",
  },
  smtp: {
    host: "SMTP_HOST",
    port: "SMTP_PORT",
    user: "SMTP_USER",
    pass: "SMTP_PASS",
    from: "FROM_EMAIL",
  },
  dataforseo: { login: "DATAFORSEO_LOGIN", password: "DATAFORSEO_PASSWORD" },
  firecrawl: { apiKey: "FIRECRAWL_API_KEY" },
  jina: { apiKey: "JINA_API_KEY" },
};

const isSupported = (provider) =>
  SUPPORTED_INTEGRATION_PROVIDERS.includes(provider);

/* ──────────────────────────────────────────────────────────
 *  Sanitization helpers
 * ────────────────────────────────────────────────────────── */

const sanitizeForApi = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    provider: o.provider,
    name: PROVIDER_FRIENDLY_NAME[o.provider] || o.provider,
    description: PROVIDER_DESCRIPTIONS[o.provider] || "",
    label: o.label || "",
    masked: o.maskedPreview,
    publicMeta: o.publicMeta || {},
    isActive: o.isActive !== false,
    lastTestedAt: o.lastTestedAt,
    lastTestStatus: o.lastTestStatus || "unknown",
    lastTestError: o.lastTestError || null,
    connected: true,
    updatedAt: o.updatedAt,
  };
};

const PROVIDER_FRIENDLY_NAME = {
  anthropic: "Anthropic",
  brave: "Brave Search",
  exa: "Exa AI",
  stripe: "Stripe",
  cloudinary: "Cloudinary",
  smtp: "SMTP (Email)",
  dataforseo: "DataForSEO",
  firecrawl: "Firecrawl",
  jina: "Jina Reader",
};

const placeholderRow = (provider) => ({
  provider,
  name: PROVIDER_FRIENDLY_NAME[provider] || provider,
  description: PROVIDER_DESCRIPTIONS[provider] || "",
  label: "",
  masked: "—",
  publicMeta: {},
  isActive: false,
  lastTestedAt: null,
  lastTestStatus: "unknown",
  lastTestError: null,
  connected: false,
  /**
   * Indicates the provider has an env-fallback configured (so the API
   * is functional, just not managed via the admin UI).
   */
  envFallback: hasEnvFallback(provider),
});

const hasEnvFallback = (provider) => {
  const map = ENV_FALLBACKS[provider];
  if (!map) return false;
  for (const envKey of Object.values(map)) {
    if (process.env[envKey]) return true;
  }
  return false;
};

/* ──────────────────────────────────────────────────────────
 *  Validation + persist
 * ────────────────────────────────────────────────────────── */

const validateBundle = (provider, bundle) => {
  const schema = PROVIDER_FIELDS[provider];
  if (!schema) throwError("Unsupported provider", 400);
  const next = {};
  for (const [field, kind] of Object.entries(schema)) {
    const value = bundle?.[field];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number") {
      throwError(`Field "${field}" must be a string`, 400);
    }
    const str = String(value).trim();
    if (kind === "secret" && str.length < 4) {
      throwError(`Field "${field}" looks too short`, 400);
    }
    if (str.length > 1024) {
      throwError(`Field "${field}" is too long`, 400);
    }
    next[field] = { kind, value: str };
  }
  return next;
};

const buildSecretsAndMeta = (provider, parsed) => {
  const secrets = {};
  const publicMeta = {};
  for (const [field, { kind, value }] of Object.entries(parsed)) {
    if (kind === "secret") {
      secrets[field] = encrypt(value);
    } else {
      publicMeta[field] = value;
    }
  }
  return { secrets, publicMeta };
};

const buildMaskedPreview = (provider, parsed) => {
  const primary = PRIMARY_SECRET_FIELD[provider];
  const candidate = parsed[primary]?.value;
  if (candidate) return maskSecret(candidate);
  /* Fallback — first field anywhere */
  for (const { value } of Object.values(parsed)) {
    if (value) return maskSecret(value);
  }
  return "•••";
};

/* ──────────────────────────────────────────────────────────
 *  Resolver cache (10 sec) — avoids hammering Mongo from
 *  hot paths like the article pipeline.
 * ────────────────────────────────────────────────────────── */
const RESOLVER_TTL_MS = 10_000;
const resolverCache = new Map();

const cacheGet = (provider) => {
  const entry = resolverCache.get(provider);
  if (!entry) return null;
  if (Date.now() - entry.t > RESOLVER_TTL_MS) {
    resolverCache.delete(provider);
    return null;
  }
  return entry.v;
};
const cacheSet = (provider, v) => {
  resolverCache.set(provider, { t: Date.now(), v });
};
const cacheBust = () => resolverCache.clear();

/* ──────────────────────────────────────────────────────────
 *  Public — Admin API surface
 * ────────────────────────────────────────────────────────── */

export const listIntegrationsForAdmin = async () => {
  const docs = await repo.listIntegrations();
  const byProvider = new Map(docs.map((d) => [d.provider, sanitizeForApi(d)]));
  return SUPPORTED_INTEGRATION_PROVIDERS.map((p) =>
    byProvider.get(p) || placeholderRow(p)
  );
};

export const upsertIntegration = async ({
  provider,
  bundle,
  label,
  isActive,
  userId,
  req,
}) => {
  if (!isSupported(provider)) throwError("Unsupported provider", 400);

  const parsed = validateBundle(provider, bundle);
  if (Object.keys(parsed).length === 0) {
    throwError("Provide at least one field to save", 400);
  }

  /* Merge into existing doc (so partial updates are allowed) */
  const existing = await repo.findIntegrationWithSecrets(provider);
  const next = { ...parsed };
  if (existing) {
    /* Pull existing secrets/meta and overlay new values on top */
    if (existing.secrets) {
      for (const [k, encVal] of existing.secrets.entries()) {
        if (!next[k]) {
          next[k] = { kind: "secret", value: decryptSafe(encVal) };
        }
      }
    }
    for (const [k, v] of Object.entries(existing.publicMeta || {})) {
      if (next[k] === undefined) next[k] = { kind: "meta", value: v };
    }
  }

  const { secrets, publicMeta } = buildSecretsAndMeta(provider, next);
  const maskedPreview = buildMaskedPreview(provider, next);

  const updates = {
    secrets,
    publicMeta,
    maskedPreview,
    label: label !== undefined ? String(label).slice(0, 120) : existing?.label || "",
    isActive: isActive !== undefined ? Boolean(isActive) : existing?.isActive ?? true,
    updatedBy: userId || null,
    /* Reset test status on rotation */
    lastTestedAt: null,
    lastTestStatus: "unknown",
    lastTestError: null,
  };

  const saved = await repo.upsertIntegration(provider, updates);
  cacheBust();

  await logAudit({
    actorId: userId,
    category: "system",
    action: existing ? "integration.rotated" : "integration.connected",
    entityType: "integration",
    entityId: saved._id,
    after: { provider, label: saved.label, isActive: saved.isActive },
    req,
  });

  return sanitizeForApi(saved);
};

export const setIntegrationActive = async ({
  provider,
  isActive,
  userId,
  req,
}) => {
  if (!isSupported(provider)) throwError("Unsupported provider", 400);
  const existing = await repo.findIntegrationByProvider(provider);
  if (!existing) throwError("Integration not configured", 404);

  const updated = await repo.setIntegrationActive(provider, isActive);
  cacheBust();

  await logAudit({
    actorId: userId,
    category: "system",
    action: isActive ? "integration.enabled" : "integration.disabled",
    entityType: "integration",
    entityId: updated._id,
    after: { provider, isActive: updated.isActive },
    req,
  });

  return sanitizeForApi(updated);
};

export const deleteIntegration = async ({ provider, userId, req }) => {
  if (!isSupported(provider)) throwError("Unsupported provider", 400);
  const removed = await repo.deleteIntegration(provider);
  cacheBust();
  if (!removed) return placeholderRow(provider);

  await logAudit({
    actorId: userId,
    category: "system",
    action: "integration.disconnected",
    entityType: "integration",
    entityId: removed._id,
    before: { provider },
    req,
  });

  return placeholderRow(provider);
};

export const recordTestResult = async ({ provider, status, error }) => {
  if (!isSupported(provider)) return null;
  const updated = await repo.recordTestResult(provider, { status, error });
  cacheBust();
  return updated ? sanitizeForApi(updated) : null;
};

/* ──────────────────────────────────────────────────────────
 *  Decryption helpers (internal)
 * ────────────────────────────────────────────────────────── */

const decryptSafe = (encrypted) => {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch (err) {
    logger.error("[integration] decrypt failed", { message: err.message });
    return null;
  }
};

/* ──────────────────────────────────────────────────────────
 *  Public — Runtime resolver
 *
 *  Returns the merged config for a provider:
 *    1. DB record if active → decrypt secrets, merge with publicMeta
 *    2. Else env fallback (if configured)
 *    3. Else null
 *
 *  Cached for 10s to keep hot paths (every Anthropic call) cheap.
 * ────────────────────────────────────────────────────────── */
export const getProviderConfig = async (provider) => {
  if (!isSupported(provider)) return null;
  const cached = cacheGet(provider);
  if (cached !== null) return cached;

  let resolved = null;

  try {
    const doc = await repo.findIntegrationWithSecrets(provider);
    if (doc && doc.isActive !== false) {
      const out = { ...(doc.publicMeta || {}) };
      if (doc.secrets) {
        for (const [k, enc] of doc.secrets.entries()) {
          const plain = decryptSafe(enc);
          if (plain != null) out[k] = plain;
        }
      }
      if (Object.keys(out).length > 0) {
        resolved = out;
      }
    }
  } catch (err) {
    logger.warn("[integration] DB read failed; falling back to env", {
      provider,
      message: err.message,
    });
  }

  if (!resolved) {
    const envMap = ENV_FALLBACKS[provider];
    if (envMap) {
      const out = {};
      for (const [field, envKey] of Object.entries(envMap)) {
        const v = process.env[envKey];
        if (v) out[field] = v;
      }
      if (Object.keys(out).length > 0) resolved = out;
    }
  }

  cacheSet(provider, resolved);
  return resolved;
};

export const invalidateProviderCache = () => cacheBust();
