import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";

import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  findUserByPasswordResetToken,
  updateUserById,
  updateLastLogin,
  setPasswordResetToken,
  clearPasswordResetToken,
} from "#repositories/userRepository.js";
import { findDefaultRole } from "#repositories/roleRepository.js";
import {
  createWorkspace,
  findWorkspaceByOwnerId,
} from "#repositories/workspaceRepository.js";
import {
  createOtp,
  findActiveOtp,
  countRecentOtps,
  incrementOtpAttempts,
  consumeOtp,
  invalidateAllOtps,
  OTP_PURPOSES,
} from "#repositories/otpRepository.js";

import { signAccessToken, signRefreshToken } from "#utils/jwtUtil.js";
import { generateOtp, getOtpExpiry } from "#utils/otpUtil.js";
import { sendOtpEmail, sendPasswordResetEmail } from "#utils/emailUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logger } from "#utils/logger.js";
import { logAudit } from "#utils/auditLogger.js";

import { ROLE_NAMES, ROLE_SCOPES, computeRedirect } from "#constants/roles.js";

const isDevelopment = () => process.env.NODE_ENV !== "production";

/* ──────────────────────────────────────────────────────────
 *  Shape user payload sent to clients
 *  Single source of truth — used in every auth response
 * ────────────────────────────────────────────────────────── */
const buildUserPayload = (user) => {
  const role = user.roleId;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: role?.name || ROLE_NAMES.WORKSPACE_OWNER,
    roleDisplayName: role?.displayName || null,
    roleScope: role?.scope || ROLE_SCOPES.TENANT,
    permissions: role?.permissions || [],
    isVerified: user.isVerified,
    isActive: user.isActive,
    authProvider: user.authProvider,
    workspaceId: user.workspaceId?.toString?.() || null,
    redirectTo: computeRedirect(role),
    createdAt: user.createdAt,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Token generation helper
 * ────────────────────────────────────────────────────────── */
const generateTokens = (user) => {
  const role = user.roleId;
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: role?.name,
    permissions: role?.permissions || [],
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ id: payload.id }),
  };
};

/* ──────────────────────────────────────────────────────────
 *  Registration
 *
 *  Flow:
 *   - PROD: create unverified user → send OTP → require verification
 *   - DEV : create verified user → return tokens immediately (skip OTP)
 * ────────────────────────────────────────────────────────── */
export const register = async ({ name, email, password }) => {
  const existing = await findUserByEmail(email, { populateRole: false });
  if (existing) {
    throwError("Email already exists", 409);
  }

  const defaultRole = await findDefaultRole();
  if (!defaultRole) throwError("Default role not configured. Contact support.", 500);

  const skipOtp = isDevelopment();

  const user = await createUser({
    name,
    email,
    password,
    roleId: defaultRole._id,
    isVerified: skipOtp, // dev: verified, prod: unverified
    authProvider: "local",
  });

  // Create the user's workspace and link it back
  const workspace = await createWorkspace({
    name: `${name}'s workspace`,
    ownerId: user._id,
  });
  await updateUserById(user._id, { workspaceId: workspace._id });

  // Re-fetch with populated role (createUser returns raw doc)
  const populated = await findUserById(user._id);

  if (skipOtp) {
    // DEV path — instant login
    const tokens = generateTokens(populated);
    await updateLastLogin(populated._id);
    logger.info("User registered (dev — auto-verified)", { email });
    return {
      user: buildUserPayload(populated),
      ...tokens,
      requiresVerification: false,
    };
  }

  // PROD path — send OTP
  const code = generateOtp();
  await createOtp({
    email,
    plainCode: code,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    expiresAt: getOtpExpiry(),
  });
  await sendOtpEmail(email, code);

  logger.info("User registered, OTP sent", { email });
  return {
    user: buildUserPayload(populated),
    requiresVerification: true,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Verify OTP — completes registration
 * ────────────────────────────────────────────────────────── */
export const verifyOtp = async ({ email, otp }) => {
  const user = await findUserByEmail(email);
  if (!user) throwError("User not found", 404);
  if (user.isVerified) throwError("Account already verified", 400);

  const otpDoc = await findActiveOtp(email, OTP_PURPOSES.EMAIL_VERIFICATION);
  if (!otpDoc) throwError("OTP expired. Please request a new one.", 400);

  if (otpDoc.attempts >= 5) {
    await invalidateAllOtps(email, OTP_PURPOSES.EMAIL_VERIFICATION);
    throwError("Too many invalid attempts. Please request a new OTP.", 429);
  }

  const ok = await otpDoc.verifyCode(otp);
  if (!ok) {
    await incrementOtpAttempts(otpDoc._id);
    throwError("Invalid OTP", 400);
  }

  await consumeOtp(otpDoc._id);
  await updateUserById(user._id, { isVerified: true });
  await updateLastLogin(user._id);

  const fresh = await findUserById(user._id);
  const tokens = generateTokens(fresh);

  return {
    user: buildUserPayload(fresh),
    ...tokens,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Resend OTP
 * ────────────────────────────────────────────────────────── */
export const resendOtp = async ({ email }) => {
  const user = await findUserByEmail(email);
  if (!user) throwError("User not found", 404);
  if (user.isVerified) throwError("Account already verified", 400);

  const recentCount = await countRecentOtps(email, OTP_PURPOSES.EMAIL_VERIFICATION, 15);
  if (recentCount >= 3) {
    throwError("Too many OTP requests. Please wait 15 minutes.", 429);
  }

  await invalidateAllOtps(email, OTP_PURPOSES.EMAIL_VERIFICATION);

  const code = generateOtp();
  await createOtp({
    email,
    plainCode: code,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    expiresAt: getOtpExpiry(),
  });
  await sendOtpEmail(email, code);

  return { sent: true };
};

/* ──────────────────────────────────────────────────────────
 *  Login (email + password)
 * ────────────────────────────────────────────────────────── */
export const login = async ({ email, password }) => {
  const user = await findUserByEmail(email, { includePassword: true });
  if (!user) throwError("Invalid email or password", 401);

  if (!user.password) {
    throwError(
      "This account uses Google sign-in. Please continue with Google.",
      400
    );
  }

  const valid = await user.comparePassword(password);
  if (!valid) throwError("Invalid email or password", 401);

  if (!user.isActive) throwError("Account is suspended. Contact support.", 403);

  // In production, require email verification. In dev, allow through.
  if (!user.isVerified && !isDevelopment()) {
    throwError("Please verify your email before logging in.", 403);
  }

  const tokens = generateTokens(user);
  await updateLastLogin(user._id);

  await logAudit({
    actor: { id: user._id, email: user.email, role: user.roleId?.name },
    category: "auth",
    action: "auth.login",
    entityType: "user",
    entityId: user._id,
    workspaceId: user.workspaceId,
  });

  return {
    user: buildUserPayload(user),
    ...tokens,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Google sign-in
 * ────────────────────────────────────────────────────────── */
let googleClient = null;
const getGoogleClient = () => {
  if (googleClient) return googleClient;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throwError(
      "Google sign-in is not configured. Contact support.",
      503
    );
  }
  googleClient = new OAuth2Client(clientId);
  return googleClient;
};

export const googleSignIn = async ({ idToken }) => {
  const client = getGoogleClient();

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn("Google token verification failed", { error: err.message });
    throwError("Invalid Google credentials", 401);
  }

  const { sub: googleId, email, name, picture } = payload;
  if (!email) throwError("Google account has no email", 400);

  // 1) Find by googleId
  let user = await findUserByGoogleId(googleId);

  // 2) Find by email (link existing local account to Google)
  if (!user) {
    user = await findUserByEmail(email);
    if (user) {
      await updateUserById(user._id, {
        googleId,
        avatar: user.avatar || picture,
        isVerified: true,
      });
      user = await findUserById(user._id);
    }
  }

  // 3) New user — create
  if (!user) {
    const defaultRole = await findDefaultRole();
    if (!defaultRole) throwError("Default role not configured", 500);

    const created = await createUser({
      name: name || email.split("@")[0],
      email,
      avatar: picture || null,
      googleId,
      authProvider: "google",
      isVerified: true,
      roleId: defaultRole._id,
      // No password — Google-only
    });
    const workspace = await createWorkspace({
      name: `${created.name}'s workspace`,
      ownerId: created._id,
    });
    await updateUserById(created._id, { workspaceId: workspace._id });
    user = await findUserById(created._id);
  }

  if (!user.isActive) throwError("Account is suspended. Contact support.", 403);

  const tokens = generateTokens(user);
  await updateLastLogin(user._id);

  return {
    user: buildUserPayload(user),
    ...tokens,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Get current user (from JWT in middleware)
 * ────────────────────────────────────────────────────────── */
export const getMe = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throwError("User not found", 404);
  return buildUserPayload(user);
};

/* ──────────────────────────────────────────────────────────
 *  Refresh access token
 * ────────────────────────────────────────────────────────── */
export const refreshAccessToken = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throwError("User not found", 404);
  if (!user.isActive) throwError("Account is suspended", 403);

  const tokens = generateTokens(user);
  return {
    user: buildUserPayload(user),
    ...tokens,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Forgot password
 * ────────────────────────────────────────────────────────── */
export const forgotPassword = async ({ email }) => {
  const user = await findUserByEmail(email);
  // Silent on missing user — don't leak whether email is registered
  if (!user) {
    logger.info("Forgot password requested for non-existent email", { email });
    return { sent: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await setPasswordResetToken(user._id, hashed, expiresAt);

  const baseUrl = process.env.CLIENT_APP_ORIGIN || "http://localhost:5173";
  const resetUrl = `${baseUrl}/auth/reset-password/${rawToken}`;

  await sendPasswordResetEmail(email, resetUrl);
  return { sent: true };
};

/* ──────────────────────────────────────────────────────────
 *  Reset password
 * ────────────────────────────────────────────────────────── */
export const resetPassword = async ({ token, password }) => {
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const user = await findUserByPasswordResetToken(hashed);
  if (!user) throwError("Invalid or expired reset token", 400);

  user.password = password; // pre-save hook will hash it
  await user.save();
  await clearPasswordResetToken(user._id);

  return { reset: true };
};
