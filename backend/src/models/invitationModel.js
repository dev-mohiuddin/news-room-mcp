import mongoose from "mongoose";
import crypto from "node:crypto";

/**
 * Invitation = pending team invite. Token-based, single-use, 7-day expiry.
 *
 * - Token stored hashed at rest (only raw is emailed)
 * - On acceptance: status → "accepted", User created with workspaceId + roleId
 * - On expiry/cancel: status → "expired" / "cancelled"
 */
const invitationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

invitationSchema.statics.hashToken = function (raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
};

/* ── Indexes for query paths ── */
// Common filter: pending invites for a workspace (team page)
invitationSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
// Per-email lookup for re-send/conflict detection
invitationSchema.index({ workspaceId: 1, email: 1, status: 1 });
// TTL: auto-purge expired invitation rows 14 days after they expire
invitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 14 * 24 * 60 * 60, name: "invite_ttl" }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);
export default Invitation;
