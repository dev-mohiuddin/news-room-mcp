import mongoose from "mongoose";

/**
 * Workspace = a tenant. Every user belongs to exactly one workspace.
 *
 * Created automatically when a user signs up (becomes the owner).
 * Teammates invited via `/dashboard/team` join the inviter's workspace.
 *
 * NOTE: per Requirement 12 (Plan Single Source of Truth), the `plan`
 * field has been REMOVED from this schema. Plan + usage live on the
 * `Subscription` document. Read plan via `getActiveSubscription(workspaceId)`.
 *
 * Server startup runs a schema-introspection check (see initDataSetup) and
 * fails fast if a `plan` field somehow resurfaces here.
 */
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    settings: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true, versionKey: false }
);

/* ── Indexes for query patterns ── */
// Owner-side workspace lookup
workspaceSchema.index({ ownerId: 1, isActive: 1 });
workspaceSchema.index({ createdAt: -1 });

export const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
