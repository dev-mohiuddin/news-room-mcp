import crypto from "crypto";
import { findUserByEmail, findUserByPasswordResetToken, createUser, updateUser } from "#repositories/userRepository.js";
import { findDefaultRole, findRoleByName } from "#repositories/roleRepository.js";
import { comparePassword } from "#utils/bcryptUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "#utils/jwtUtil.js";
import { createWallet } from "#repositories/walletRepository.js";
import { generateOtp, getOtpExpiry, sendOtp } from "#utils/otpUtil.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "#utils/emailUtil.js";

export const signIn = async (data) => {
  const existingUser = await findUserByEmail(data.email, { populateRole: true });
  if (!existingUser) throwError("Invalid email or password", 401);

  const isMatch = await comparePassword(data.password, existingUser.password);
  if (!isMatch) throwError("Invalid email or password", 401);

  if (!existingUser.isVerified) {
    throwError("Account not verified. Please verify OTP.", 403);
  }

  const accessToken = signAccessToken({
    id: existingUser._id,
    role: existingUser.roleId,
    email: existingUser.email,
  });

  const refreshToken = signRefreshToken({
    id: existingUser._id,
    role: existingUser.roleId,
    email: existingUser.email,
  });

  return {
    user: {
      id: existingUser._id,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      role: existingUser.roleId?._id || existingUser.roleId,
      roleName: existingUser.roleId?.name,
      permissions: existingUser.roleId?.permissions || [],
    },
    accessToken,
    refreshToken,
  };
};

export const signUp = async (data) => {
  const existingUser = await findUserByEmail(data.email, { includeOtp: true });
  if (existingUser) throwError("Email already exists", 409);

  const role =
    (await findDefaultRole()) ||
    (await findRoleByName("Investor")) ||
    (await findRoleByName("User"));
  if (!role) throwError("Default role not found", 500);

  const nameParts = data.name.trim().split(" ");
  const firstName = nameParts.shift() || "User";
  const lastName = nameParts.join(" ") || "User";

  const otpCode = generateOtp();
  const otpExpiry = getOtpExpiry();

  const user = await createUser({
    firstName,
    lastName,
    email: data.email,
    password: data.password,
    phone: data.phone || undefined,
    roleId: role._id,
    isVerified: false,
    isActive: true,
    otpCode,
    otpExpiry,
    otpStatus: "pending",
    investorProfile: {
      approval: { status: "draft" },
      profileCompletion: {
        identitySubmitted: false,
        payoutSubmitted: false,
        submittedForApproval: false,
      },
    },
  });

  await createWallet({ userId: user._id, balance: 0, currency: "USD" });

  sendOtp({ email: user.email, phone: user.phone, code: otpCode });

  return {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: role._id,
      roleName: role.name,
      permissions: role.permissions || [],
    },
  };
};

export const verifyOtp = async (data) => {
  const existingUser = await findUserByEmail(data.email, { includeOtp: true });
  if (!existingUser) throwError("User not found", 404);

  if (existingUser.isVerified || existingUser.otpStatus === "verified") {
    throwError("Account already verified", 400);
  }

  if (!existingUser.otpCode || !existingUser.otpExpiry) {
    throwError("OTP not found. Please resend OTP.", 400);
  }

  const isExpired = new Date(existingUser.otpExpiry) < new Date();
  if (isExpired) {
    await updateUser(existingUser._id, { otpStatus: "expired" });
    throwError("OTP expired. Please resend OTP.", 400);
  }

  if (existingUser.otpCode !== data.otp) {
    throwError("Invalid OTP", 400);
  }

  const updated = await updateUser(existingUser._id, {
    isVerified: true,
    otpCode: null,
    otpExpiry: null,
    otpStatus: "verified",
  });

  try {
    await sendWelcomeEmail(updated.email, updated.firstName);
  } catch (_) {
    // email failure should not block the response
  }

  return {
    user: {
      id: updated._id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      role: updated.roleId?._id || updated.roleId,
      roleName: updated.roleId?.name,
      permissions: updated.roleId?.permissions || [],
    },
  };
};

export const resendOtp = async (data) => {
  const existingUser = await findUserByEmail(data.email);
  if (!existingUser) throwError("User not found", 404);

  if (existingUser.isVerified) {
    throwError("Account already verified", 400);
  }

  const otpCode = generateOtp();
  const otpExpiry = getOtpExpiry();

  await updateUser(existingUser._id, {
    otpCode,
    otpExpiry,
    otpStatus: "pending",
  });

  sendOtp({ email: existingUser.email, phone: existingUser.phone, code: otpCode });

  return { message: "OTP sent" };
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) throwError("Refresh token missing", 401);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throwError("Invalid refresh token", 401);
  }

  const user = await findUserByEmail(payload.email, { populateRole: true });
  if (!user) throwError("User not found", 404);

  const accessToken = signAccessToken({
    id: user._id,
    role: user.roleId,
    email: user.email,
  });

  const newRefreshToken = signRefreshToken({
    id: user._id,
    role: user.roleId,
    email: user.email,
  });

  return { accessToken, refreshToken: newRefreshToken };
};

export const forgotPassword = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const resetExpiry = new Date();
  resetExpiry.setHours(resetExpiry.getHours() + 1);

  await updateUser(user._id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: resetExpiry,
  });

  const clientOrigin = process.env.CLIENT_APP_ORIGIN || "http://localhost:5173";
  const resetUrl = `${clientOrigin}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (_) {
    // email failure should not block the response
  }
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await findUserByPasswordResetToken(hashedToken);
  if (!user) throwError("Invalid or expired reset token", 400);

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return { message: "Password reset successful" };
};
