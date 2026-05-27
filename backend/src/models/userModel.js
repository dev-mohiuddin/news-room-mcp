import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      // Not required when signing up via Google
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return by default
    },
    avatar: {
      type: String,
      default: null,
    },

    /* ── Multi-tenancy ── */
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },

    /* ── RBAC ── */
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },

    /* ── Auth state ── */
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },

    /* ── OAuth providers ── */
    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    /* ── Password reset ── */
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },

    /* ── User-level preferences (timezone, language, notifications, …) ── */
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true, versionKey: false }
);

/* ── Indexes for hot query paths ── */
// Admin user list filters
userSchema.index({ workspaceId: 1, roleId: 1 });
userSchema.index({ workspaceId: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
// Password reset token lookups (sparse — most users don't have one set)
userSchema.index(
  { passwordResetToken: 1 },
  { sparse: true, partialFilterExpression: { passwordResetToken: { $type: "string" } } }
);

/* ── Pre-save: hash password if modified ── */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ── Instance method: compare password ── */
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

/* ── toJSON: strip sensitive fields ── */
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
export default User;
