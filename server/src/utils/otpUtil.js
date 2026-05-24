import { logger } from "#utils/logger.js";
import { sendOtpEmail } from "#utils/emailUtil.js";

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOtpExpiry = () => {
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
};

export const sendOtp = async ({ email, phone, code }) => {
  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    logger.error("Failed to send OTP email", { email, error: err.message });
  }
};
