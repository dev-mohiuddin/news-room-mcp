import crypto from "node:crypto";
import { RefreshToken } from "#models/refreshTokenModel.js";

/**
 * ============================================================
 *  RefreshToken Repository — Requirement 16
 * ============================================================
 */

export const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(String(rawToken)).digest("hex");

/**
 * Insert a new refresh token record.
 *  - parentJti is null on first issuance, set to the consumed jti on rotation
 */
export const recordIssued = ({
  rawToken,
  jti,
  userId,
  parentJti = null,
  userAgent = null,
  ip = null,
  expiresAt,
}) =>
  RefreshToken.create({
    tokenHash: hashToken(rawToken),
    jti,
    userId,
    parentJti,
    userAgent,
    ip,
    issuedAt: new Date(),
    expiresAt,
    revokedAt: null,
  });

export const findByRawToken = (rawToken) =>
  RefreshToken.findOne({ tokenHash: hashToken(rawToken) }).exec();

export const findByJti = (jti) => RefreshToken.findOne({ jti }).exec();

export const isUsable = (record, { now = new Date() } = {}) =>
  Boolean(record && !record.revokedAt && record.expiresAt > now);

/** Atomic single-use consumption. Returns the consumed record or null if already used. */
export const consume = async (rawToken, { now = new Date() } = {}) =>
  RefreshToken.findOneAndUpdate(
    {
      tokenHash: hashToken(rawToken),
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    { $set: { revokedAt: now } },
    { new: false } // return the pre-update doc to inspect its jti
  ).exec();

/** Revoke every active refresh token for a user — used on reuse detection. */
export const revokeAllForUser = (userId, { now = new Date() } = {}) =>
  RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: now } }
  ).exec();

/** Revoke a specific token record (used on logout). */
export const revokeByRawToken = (rawToken, { now = new Date() } = {}) =>
  RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: now } },
    { new: true }
  ).exec();
