import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

const payoutBankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true },
    accountHolderName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    routingNumber: { type: String, trim: true },
    branchName: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "rejected"],
      default: "unverified",
    },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const payoutBkashSchema = new mongoose.Schema(
  {
    number: { type: String, trim: true },
    accountType: {
      type: String,
      enum: ["personal", "agent"],
      default: "personal",
    },
    accountHolderName: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "rejected"],
      default: "unverified",
    },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const payoutDetailsSchema = new mongoose.Schema(
  {
    preferredMethod: {
      type: String,
      enum: ["bank", "bkash"],
      default: "bank",
    },
    bankAccount: payoutBankAccountSchema,
    bkash: payoutBkashSchema,
  },
  { _id: false }
);

const profileCompletionSchema = new mongoose.Schema(
  {
    identitySubmitted: { type: Boolean, default: false },
    payoutSubmitted: { type: Boolean, default: false },
    submittedForApproval: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: false }
);

const investorApprovalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "on-hold"],
      default: "draft",
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
    },
    approvalNote: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    holdReason: { type: String, trim: true },
  },
  { _id: false }
);

const investorProfileSchema = new mongoose.Schema(
  {
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    accreditationStatus: {
      type: String,
      enum: ["none", "accredited", "non_accredited"],
      default: "none",
    },
    riskProfile: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    payoutDetails: payoutDetailsSchema,
    profileCompletion: profileCompletionSchema,
    approval: investorApprovalSchema,
  },
  { _id: false }
);

const platformUserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email address."],
    },
    password: { type: String, required: true, minlength: 8 },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformRole",
      required: true,
    },
    phone: { type: String, trim: true },
    country: { type: String, trim: true },
    investorProfile: investorProfileSchema,
    identityDocuments: [
      {
        docType: {
          type: String,
          enum: ["NID", "Driving License", "Passport"],
          required: true,
        },
        docNumber: { type: String, required: true, trim: true },
        fileUrl: { type: String, required: true, trim: true },
        publicId: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlatformUser",
        },
        isVerified: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        verificationNote: { type: String, trim: true },
      },
    ],
    otherDocuments: [
      {
        docType: { type: String, required: true },
        docNumber: { type: String, trim: true },
        fileUrl: { type: String, required: true },
        publicId: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlatformUser",
        },
      },
    ],
    profilePhoto: {
      url: { type: String },
      publicId: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, default: null, select: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpires: Date,
    otpCode: { type: String, select: false },
    otpExpiry: { type: Date },
    otpStatus: {
      type: String,
      enum: ["pending", "verified", "expired"],
      default: "pending",
    },
    isSystem: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    strict: "throw",
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

platformUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

platformUserSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

platformUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const PlatformUser = mongoose.model("PlatformUser", platformUserSchema);
