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
import { ensureSubscription } from "#repositories/subscriptionRepository.js";
import {
  createOtp,
  findActiveOtp,
  countRecentOtps,
  incrementOtpAttempts,
  consumeOtp,
  invalidateAllOtps,
  OTP_PURPOSES,
} from "#repositories/otpRepository.js";

import {
  recordIssued as recordRefreshTokenIssued,
  consume as consumeRefreshToken,
  findByRawToken as findRefreshTokenByRaw,
  revokeAllForUser as revokeAllRefreshTokensForUser,
  revokeByRawToken as revokeRefreshTokenByRaw,
} from "#repositories/refreshTokenRepository.js";

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
 *  Refresh token TTL — must mirror jwtUtil's JWT_REFRESH_EXPIRES_IN
 * ────────────────────────────────────────────────────────── */
const REFRESH_TTL_MS = (() => {
  const days = Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE_DAYS || 30);
  return days * 24 * 60 * 60 * 1000;
})();

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
    // Required by the Socket.io handshake (server.js → io.use) so the
    // socket auto-joins `workspace:{id}` on connect. HTTP middleware
    // never reads this — `protect` always re-loads from DB — so token
    // staleness isn't a concern here.
    workspaceId: user.workspaceId?.toString?.() || null,
  };
  const accessToken = signAccessToken(payload);
  const { token: refreshToken, jti } = signRefreshToken({ id: payload.id });
  return { accessToken, refreshToken, refreshJti: jti };
};

/**
 * Issue a fresh token pair AND persist the refresh token record so that
 * rotation + reuse detection (Requirement 16) can track its lifecycle.
 *
 * Pass `parentJti` on rotation to link the new record to the consumed one.
 */
const issueTokensAndPersist = async (user, { req = null, parentJti = null } = {}) => {
  const { accessToken, refreshToken, refreshJti } = generateTokens(user);
  try {
    await recordRefreshTokenIssued({
      rawToken: refreshToken,
      jti: refreshJti,
      userId: user._id,
      parentJti,
      userAgent: req?.headers?.["user-agent"] || null,
      ip: req?.ip || null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
  } catch (err) {
    // Persistence failure must not break the user-facing login.
    // The refresh-rotation enforcement falls back gracefully — without a
    // record, refreshAccessToken below logs out the user with REFRESH_REUSE.
    logger.warn("[auth] could not persist refresh token", {
      message: err.message,
    });
  }
  return { accessToken, refreshToken };
};

/* ──────────────────────────────────────────────────────────
 *  Registration
 *
 *  Flow:
 *   - PROD: create unverified user → send OTP → require verification
 *   - DEV : create verified user → return tokens immediately (skip OTP)
 * ────────────────────────────────────────────────────────── */
export const register = async ({ name, email, password }, ctx = {}) => {
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
  await ensureSubscription(workspace._id, { anchor: new Date() });

  // Re-fetch with populated role (createUser returns raw doc)
  const populated = await findUserById(user._id);

  if (skipOtp) {
    // DEV path — instant login
    const tokens = await issueTokensAndPersist(populated, { req: ctx.req });
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
export const verifyOtp = async ({ email, otp }, ctx = {}) => {
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
  const tokens = await issueTokensAndPersist(fresh, { req: ctx.req });

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
export const login = async ({ email, password }, ctx = {}) => {
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

  const tokens = await issueTokensAndPersist(user, { req: ctx.req });
  await updateLastLogin(user._id);

  await logAudit({
    actor: { id: user._id, email: user.email, role: user.roleId?.name },
    category: "auth",
    action: "auth.login",
    entityType: "user",
    entityId: user._id,
    workspaceId: user.workspaceId,
    req: ctx.req,
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

export const googleSignIn = async ({ idToken }, ctx = {}) => {
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
    await ensureSubscription(workspace._id, { anchor: new Date() });
    user = await findUserById(created._id);
  }

  if (!user.isActive) throwError("Account is suspended. Contact support.", 403);

  const tokens = await issueTokensAndPersist(user, { req: ctx.req });
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
 *  Refresh access token  — Requirement 16
 *
 *  Performs single-use rotation with reuse detection:
 *   1. Atomically consume the current refresh-token record
 *      (CAS: revokedAt=null AND expiresAt>now → set revokedAt=now)
 *   2. If the consume returned no record:
 *        a) maybe the token never existed (logged-out / older session)
 *        b) maybe it was already consumed (REUSE) — in which case the
 *           record exists but is revoked; revoke ALL active tokens for
 *           the user and force re-login (`REFRESH_REUSE_DETECTED`)
 *   3. Otherwise issue a new pair, link via parentJti
 * ────────────────────────────────────────────────────────── */
export const refreshAccessToken = async ({ rawToken, userId, req = null }) => {
  if (!rawToken) throwError("Refresh token missing", 401);

  const consumed = await consumeRefreshToken(rawToken);

  if (!consumed) {
    // Either the token was never persisted or it was already consumed.
    const existing = await findRefreshTokenByRaw(rawToken);
    if (existing && existing.revokedAt) {
      // REUSE — nuke the entire refresh-token chain for this user.
      await revokeAllRefreshTokensForUser(existing.userId);
      await logAudit({
        actorId: existing.userId,
        category: "auth",
        action: "auth.refresh_reuse_detected",
        entityType: "user",
        entityId: existing.userId,
        status: "failure",
        metadata: { jti: existing.jti, parentJti: existing.parentJti },
        req,
      });
      throwError(
        "Session conflict detected. Please log in again.",
        401
      );
    }
    throwError("Invalid or expired refresh token", 401);
  }

  // Token was valid and is now revoked. Issue rotation pair.
  const user = await findUserById(consumed.userId || userId);
  if (!user) throwError("User not found", 404);
  if (!user.isActive) throwError("Account is suspended", 403);

  const tokens = await issueTokensAndPersist(user, {
    req,
    parentJti: consumed.jti,
  });

  return {
    user: buildUserPayload(user),
    ...tokens,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Logout — revoke the current refresh token (Req 16)
 * ────────────────────────────────────────────────────────── */
export const logout = async ({ rawToken } = {}) => {
  if (rawToken) {
    try {
      await revokeRefreshTokenByRaw(rawToken);
    } catch (err) {
      logger.warn("[auth] logout revoke failed", { message: err.message });
    }
  }
  return { ok: true };
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
