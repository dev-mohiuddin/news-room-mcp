import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required."],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [250, "Description cannot exceed 250 characters."],
    },
    permissions: {
      type: [String],
      required: [true, "Permissions array is required."],
      validate: {
        validator: function (arr) {
          return (
            Array.isArray(arr) &&
            arr.length > 0 &&
            new Set(arr).size === arr.length
          );
        },
        message: "Permissions array cannot be empty or contain duplicates.",
      },
    },
    hierarchy: {
      type: Number,
      required: [true, "A hierarchy level is required for the role."],
      min: [1, "Hierarchy must be at least 1."],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (!doc) return next();

    if (!doc.isEditable) {
      const update = this.getUpdate();
      if (update.$set?.name || update.$set?.permissions) {
        return next(new Error("This role is protected and cannot be modified."));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

roleSchema.pre("findOneAndDelete", async function (next) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc?.isDefault) {
      return next(new Error("Default roles cannot be deleted."));
    }
    next();
  } catch (err) {
    next(err);
  }
});

export const PlatformRole = mongoose.model("PlatformRole", roleSchema);
