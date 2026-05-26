import { encrypt, decrypt } from "#utils/encryptionUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logger } from "#utils/logger.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  countConnectionsForWorkspace,
  createConnection,
  deleteConnection,
  findConnectionById,
  findConnectionByIdWithSecret,
  listConnectionsForWorkspace,
  touchLastTestedAt,
} from "#repositories/cmsConnectionRepository.js";
import { verifyConnection } from "#services/external/wordpressClient.js";

const MAX_CONNECTIONS_PER_WORKSPACE = 5;

const normalizeSiteUrl = (raw = "") => {
  const trimmed = String(raw).trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(trimmed)) {
    throwError("Site URL must use https://", 400);
  }
  return trimmed;
};

export const listConnections = (workspaceId) =>
  listConnectionsForWorkspace(workspaceId);

export const getConnection = async (workspaceId, id) => {
  const conn = await findConnectionById(workspaceId, id);
  if (!conn) throwError("CMS connection not found", 404);
  return conn;
};

/**
 * Creates a WordPress connection. Validates with /wp-json/wp/v2/users/me
 * and stores the application password encrypted at rest.
 */
export const createWordpressConnection = async ({
  workspaceId,
  actor,
  siteUrl,
  username,
  applicationPassword,
  label,
  req,
}) => {
  const normalized = normalizeSiteUrl(siteUrl);
  const existingCount = await countConnectionsForWorkspace(workspaceId);
  if (existingCount >= MAX_CONNECTIONS_PER_WORKSPACE) {
    throwError("Maximum CMS connections reached for this workspace", 409);
  }

  let verification;
  try {
    verification = await verifyConnection({
      siteUrl: normalized,
      username,
      password: applicationPassword,
    });
  } catch (err) {
    logger.warn("[cms] verify failed", { siteUrl: normalized, message: err.message });
    throwError("CMS authentication failed", 400);
  }
  if (!verification.canEditPosts) {
    throwError(
      "The supplied user does not have permission to edit posts",
      400
    );
  }

  const conn = await createConnection(workspaceId, {
    provider: "wordpress",
    siteUrl: normalized,
    username,
    passwordEncrypted: encrypt(applicationPassword),
    label: label || null,
    isDefault: existingCount === 0, // first one becomes default
    lastTestedAt: new Date(),
  });

  await logAudit({
    actor,
    category: "system",
    action: "cms.connected",
    entityType: "cms_connection",
    entityId: conn._id,
    workspaceId,
    after: { provider: "wordpress", siteUrl: normalized, username },
    req,
  });

  // Strip secret before returning
  return {
    _id: conn._id,
    workspaceId,
    provider: conn.provider,
    siteUrl: conn.siteUrl,
    username: conn.username,
    label: conn.label,
    isDefault: conn.isDefault,
    lastTestedAt: conn.lastTestedAt,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
};

export const testConnection = async (workspaceId, id) => {
  const conn = await findConnectionByIdWithSecret(workspaceId, id);
  if (!conn) throwError("CMS connection not found", 404);
  const password = decrypt(conn.passwordEncrypted);
  await verifyConnection({
    siteUrl: conn.siteUrl,
    username: conn.username,
    password,
  });
  return touchLastTestedAt(workspaceId, id);
};

export const removeConnection = async ({ workspaceId, id, actor, req }) => {
  const removed = await deleteConnection(workspaceId, id);
  if (!removed) throwError("CMS connection not found", 404);
  await logAudit({
    actor,
    category: "system",
    action: "cms.disconnected",
    entityType: "cms_connection",
    entityId: id,
    workspaceId,
    req,
  });
  return { ok: true };
};

/**
 * Used by Publish_Service: returns plaintext credentials to make the
 * outbound API call. Never returned over HTTP.
 */
export const getCredentialsForPublish = async (workspaceId, id) => {
  const conn = await findConnectionByIdWithSecret(workspaceId, id);
  if (!conn) throwError("CMS connection not found", 404);
  return {
    _id: conn._id,
    provider: conn.provider,
    siteUrl: conn.siteUrl,
    username: conn.username,
    password: decrypt(conn.passwordEncrypted),
  };
};
