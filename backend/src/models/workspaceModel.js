import mongoose from "mongoose";

/**
 * Workspace = a tenant. Every user belongs to exactly one workspace.
 *
 * Created automatically when a user signs up (becomes the owner).
 * Teammates invited via `/dashboard/team` join the inviter's workspace.
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
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "agency"],
      default: "free",
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

export const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
