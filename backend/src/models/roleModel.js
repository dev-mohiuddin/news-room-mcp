import mongoose from "mongoose";
import { ROLE_SCOPES } from "#constants/roles.js";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    scope: {
      type: String,
      enum: Object.values(ROLE_SCOPES),
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr),
        message: "permissions must be an array of strings",
      },
    },
    isDefault: {
      // Auto-assigned to new signups within the role's scope
      type: Boolean,
      default: false,
    },
    isSystem: {
      // Bootstrap-protected — cannot be deleted via API
      type: Boolean,
      default: false,
    },
    isStatic: {
      // Code-controlled — cannot be edited via API (tenant roles & super_admin)
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

/**
 * Only ONE default role per scope (e.g. only one default tenant role).
 */
roleSchema.index(
  { scope: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export const Role = mongoose.model("Role", roleSchema);
export default Role;
