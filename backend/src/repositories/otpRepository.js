import { Otp, OTP_PURPOSES } from "#models/otpModel.js";

/* ── Create ── */

export const createOtp = ({ email, plainCode, purpose, expiresAt }) => {
  // Note: plainCode is hashed in the model's pre-save hook
  return Otp.create({
    email: String(email).toLowerCase(),
    codeHash: plainCode,
    purpose,
    expiresAt,
  });
};

/* ── Read ── */

export const findActiveOtp = (email, purpose) =>
  Otp.findOne({
    email: String(email).toLowerCase(),
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .exec();

export const countRecentOtps = (email, purpose, withinMinutes = 15) => {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000);
  return Otp.countDocuments({
    email: String(email).toLowerCase(),
    purpose,
    createdAt: { $gte: since },
  }).exec();
};

/* ── Write ── */

export const incrementOtpAttempts = (id) =>
  Otp.findByIdAndUpdate(id, { $inc: { attempts: 1 } }).exec();

export const consumeOtp = (id) =>
  Otp.findByIdAndUpdate(id, { consumedAt: new Date() }).exec();

export const invalidateAllOtps = (email, purpose) =>
  Otp.updateMany(
    {
      email: String(email).toLowerCase(),
      purpose,
      consumedAt: null,
    },
    { consumedAt: new Date() }
  ).exec();

export { OTP_PURPOSES };
