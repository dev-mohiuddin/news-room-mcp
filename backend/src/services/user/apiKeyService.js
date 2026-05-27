import crypto from "node:crypto";

import * as repo from "#repositories/apiKeyRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";

/**
 * ============================================================
 *  Personal API Keys (workspace-scoped)
 * ============================================================
 *
 *  Token format: `nrm_live_<32 url-safe random chars>`
 *  Storage     : SHA-256 hash + plaintext prefix (first 12 chars).
 *  Visibility  : raw token returned ONCE on create. After that the
 *                user only sees `nrm_live_xxx…` for identification.
 */

const TOKEN_BYTES = 24;            // 24 random bytes → 32 base64url chars
const TOKEN_PREFIX = "nrm_live_";
const KEY_PREFIX_LEN = 12;          // prefix shown in UI ("nrm_live_xxx")

const generateRawToken = () => {
  const random = crypto
    .randomBytes(TOKEN_BYTES)
    .toString("base64url");
  return `${TOKEN_PREFIX}${random}`;
};

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

const sanitize = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id?.toString(),
    name: o.name,
    keyPrefix: o.keyPrefix,
    scope: o.scope,
    createdAt: o.createdAt,
    lastUsedAt: o.lastUsedAt,
    revokedAt: o.revokedAt,
  };
};

export const listApiKeys = async (workspaceId) => {
  const items = await repo.listApiKeys(workspaceId);
  return items.map(sanitize);
};

export const createApiKey = async ({ workspaceId, userId, name, scope, req }) => {
  if (!name?.trim()) throwError("name is required", 400);
  if (name.length > 80) throwError("name is too long", 400);

  const rawToken = generateRawToken();
  const created = await repo.createApiKey(workspaceId, {
    createdBy: userId,
    name: name.trim(),
    keyPrefix: rawToken.slice(0, KEY_PREFIX_LEN),
    keyHash: hashToken(rawToken),
    scope: scope || "all",
  });

  await logAudit({
    actorId: userId,
    category: "security",
    action: "apikey.created",
    entityType: "apikey",
    entityId: created._id,
    workspaceId,
    after: { name: created.name, scope: created.scope },
    req,
  });

  return {
    /* raw token shown ONCE — backend will never return it again */
    rawToken,
    apiKey: sanitize(created),
  };
};

export const revokeApiKey = async ({ workspaceId, userId, id, req }) => {
  const revoked = await repo.revokeApiKey(workspaceId, id);
  if (!revoked) throwError("API key not found or already revoked", 404);

  await logAudit({
    actorId: userId,
    category: "security",
    action: "apikey.revoked",
    entityType: "apikey",
    entityId: id,
    workspaceId,
    before: { name: revoked.name },
    req,
  });

  return { revoked: true };
};

/**
 * Authenticate an incoming raw token. Returns the populated key
 * record or null. Used by a future API-key auth middleware.
 */
export const authenticateToken = async (rawToken) => {
  if (typeof rawToken !== "string" || !rawToken.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  const hash = hashToken(rawToken);
  const found = await repo.findActiveApiKeyByHash(hash);
  if (!found) return null;
  /* fire-and-forget — do not await for performance */
  repo.touchApiKeyLastUsed(found._id).catch(() => {});
  return found;
};
