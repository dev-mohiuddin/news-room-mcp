import * as repo from "#repositories/providerKeyRepository.js";
import { encrypt, decrypt, maskSecret } from "#utils/encryptionUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Provider Key Overrides (per-workspace third-party API keys)
 * ============================================================
 *
 *  Workspaces can plug in their own Anthropic / OpenAI / Brave key
 *  to bypass the platform default. The plaintext key is encrypted
 *  with AES-256-GCM (utils/encryptionUtil.js) and never returned to
 *  the client — only a masked preview is exposed.
 */

const SUPPORTED_PROVIDERS = ["anthropic", "openai", "brave"];

const PROVIDER_DESCRIPTIONS = {
  anthropic: {
    name: "Anthropic",
    description:
      "Override platform key with your own Claude API key for cost control.",
    placeholder: "sk-ant-...",
  },
  openai: {
    name: "OpenAI",
    description:
      "Optional fallback model when Claude is rate-limited.",
    placeholder: "sk-...",
  },
  brave: {
    name: "Brave Search",
    description:
      "Plug in your own search API key to skip platform research limits.",
    placeholder: "BSA...",
  },
};

const sanitize = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    provider: o.provider,
    label: o.label || "",
    masked: o.maskedPreview,
    lastTestedAt: o.lastTestedAt,
    lastTestStatus: o.lastTestStatus || "unknown",
    updatedAt: o.updatedAt,
  };
};

const enrich = (sanitized) => {
  const meta = PROVIDER_DESCRIPTIONS[sanitized.provider];
  return {
    ...sanitized,
    name: meta?.name || sanitized.provider,
    description: meta?.description || "",
    placeholder: meta?.placeholder || "",
    connected: true,
  };
};

const placeholderFor = (provider) => {
  const meta = PROVIDER_DESCRIPTIONS[provider];
  return {
    provider,
    name: meta?.name || provider,
    description: meta?.description || "",
    placeholder: meta?.placeholder || "",
    masked: "—",
    connected: false,
    lastTestedAt: null,
    lastTestStatus: "unknown",
    label: "",
  };
};

export const listProviderKeys = async (workspaceId) => {
  const docs = await repo.listProviderKeys(workspaceId);
  const byProvider = new Map(docs.map((d) => [d.provider, sanitize(d)]));

  /* Always return one row per supported provider so the UI shows
   * a complete grid, including disconnected providers. */
  return SUPPORTED_PROVIDERS.map((p) => {
    const found = byProvider.get(p);
    return found ? enrich(found) : placeholderFor(p);
  });
};

export const upsertProviderKey = async ({
  workspaceId,
  userId,
  provider,
  rawKey,
  label,
  req,
}) => {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throwError("Unsupported provider", 400);
  }
  const trimmed = String(rawKey || "").trim();
  if (!trimmed) throwError("API key is required", 400);
  if (trimmed.length < 10) throwError("Key looks too short", 400);
  if (trimmed.length > 512) throwError("Key looks too long", 400);

  let encryptedKey;
  try {
    encryptedKey = encrypt(trimmed);
  } catch (err) {
    logger.error("[provider-key] encryption failed", { message: err.message });
    throwError(
      "Encryption is not configured on this server. Contact your administrator.",
      503
    );
  }

  const before = await repo.findProviderKey(workspaceId, provider);

  const updated = await repo.upsertProviderKey(workspaceId, provider, {
    encryptedKey,
    maskedPreview: maskSecret(trimmed),
    label: (label || "").trim().slice(0, 120),
    updatedBy: userId,
    /* clear test status on every rotation */
    lastTestedAt: null,
    lastTestStatus: "unknown",
  });

  await logAudit({
    actorId: userId,
    category: "security",
    action: before ? "provider_key.rotated" : "provider_key.connected",
    entityType: "provider_key",
    entityId: updated._id,
    workspaceId,
    after: { provider, label: updated.label },
    req,
  });

  return enrich(sanitize(updated));
};

export const deleteProviderKey = async ({ workspaceId, userId, provider, req }) => {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throwError("Unsupported provider", 400);
  }
  const removed = await repo.deleteProviderKey(workspaceId, provider);
  if (!removed) {
    /* idempotent — return placeholder shape */
    return placeholderFor(provider);
  }
  await logAudit({
    actorId: userId,
    category: "security",
    action: "provider_key.disconnected",
    entityType: "provider_key",
    entityId: removed._id,
    workspaceId,
    before: { provider },
    req,
  });
  return placeholderFor(provider);
};

/**
 * Internal helper for AI services to consume the decrypted key.
 * Returns null if no override is configured (caller falls back to
 * the platform key).
 */
export const getDecryptedProviderKey = async (workspaceId, provider) => {
  if (!workspaceId || !provider) return null;
  if (!SUPPORTED_PROVIDERS.includes(provider)) return null;
  try {
    const doc = await repo.findProviderKeyWithSecret(workspaceId, provider);
    if (!doc?.encryptedKey) return null;
    return decrypt(doc.encryptedKey);
  } catch (err) {
    logger.warn("[provider-key] decrypt failed; falling back to platform key", {
      provider,
      message: err.message,
    });
    return null;
  }
};
