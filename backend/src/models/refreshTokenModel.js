import mongoose from "mongoose";

/**
 * ============================================================
 *  RefreshToken Model — Requirement 16
 * ============================================================
 *
 *  Tracks every issued refresh token so we can:
 *   - rotate on use (revoke old, issue new with parentJti link)
 *   - detect reuse (revoke entire chain on a second use of a consumed token)
 *   - revoke on logout
 *
 *  TTL index on `expiresAt` auto-purges old documents.
 *  The frontend never sees this collection — it works against cookies.
 */

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    parentJti: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    issuedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

// Auto-delete after expiry
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Common lookup: active tokens for a user
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
