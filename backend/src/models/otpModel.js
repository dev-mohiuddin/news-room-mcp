import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Separate collection for OTPs (better than embedding on user doc):
 *   - Auto-expire via TTL index
 *   - Hashed code at rest (never store plain OTP)
 *   - Easy to query/audit independently
 */

const OTP_PURPOSES = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
  LOGIN_2FA: "login_2fa",
};

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSES),
      default: OTP_PURPOSES.EMAIL_VERIFICATION,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index — Mongo will auto-delete docs at expiresAt
      index: { expires: 0 },
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

/* ── Hash code before save ── */
otpSchema.pre("save", async function (next) {
  if (!this.isModified("codeHash")) return next();
  // Caller passes plain code; we hash here
  const salt = await bcrypt.genSalt(8);
  this.codeHash = await bcrypt.hash(this.codeHash, salt);
  next();
});

/* ── Instance: verify ── */
otpSchema.methods.verifyCode = async function (plainCode) {
  return bcrypt.compare(plainCode, this.codeHash);
};

export const Otp = mongoose.model("Otp", otpSchema);
export { OTP_PURPOSES };
export default Otp;
