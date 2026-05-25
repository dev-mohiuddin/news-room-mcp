import * as authService from "#services/auth/authService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* ── Cookie helpers ── */
const cookieAgeMs = (envVar, fallbackDays) =>
  Number(process.env[envVar] || fallbackDays) * 24 * 60 * 60 * 1000;

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: maxAgeMs,
  path: "/",
});

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) {
    res.cookie(
      "access_token",
      accessToken,
      cookieOptions(cookieAgeMs("ACCESS_TOKEN_COOKIE_MAX_AGE_DAYS", 7))
    );
  }
  if (refreshToken) {
    res.cookie(
      "refresh_token",
      refreshToken,
      cookieOptions(cookieAgeMs("REFRESH_TOKEN_COOKIE_MAX_AGE_DAYS", 30))
    );
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
};

/* ──────────────────────────────────────────────────────────
 *  Endpoints
 * ────────────────────────────────────────────────────────── */

export const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);

  // If dev mode auto-verified the user, set cookies + return tokens
  if (result.accessToken) {
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  res.success({
    data: {
      user: result.user,
      accessToken: result.accessToken || null,
      requiresVerification: result.requiresVerification,
    },
    message: result.requiresVerification
      ? "Registration successful. Please check your email for the verification code."
      : `Registration successful. Welcome, ${result.user.name}!`,
    statusCode: 201,
  });
});

export const verifyOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  setAuthCookies(res, result);
  res.success({
    data: { user: result.user, accessToken: result.accessToken },
    message: "Email verified successfully",
  });
});

export const resendOtp = catchAsync(async (req, res) => {
  await authService.resendOtp(req.body);
  res.success({
    data: null,
    message: "Verification code sent. Please check your email.",
  });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, result);
  res.success({
    data: { user: result.user, accessToken: result.accessToken },
    message: `Welcome back, ${result.user.name}!`,
  });
});

export const googleSignIn = catchAsync(async (req, res) => {
  const result = await authService.googleSignIn(req.body);
  setAuthCookies(res, result);
  res.success({
    data: { user: result.user, accessToken: result.accessToken },
    message: `Welcome, ${result.user.name}!`,
  });
});

export const logout = catchAsync(async (_req, res) => {
  clearAuthCookies(res);
  res.success({ data: null, message: "Logged out successfully" });
});

export const me = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.success({ data: { user }, message: "Profile fetched" });
});

export const refreshToken = catchAsync(async (req, res) => {
  // The route uses a dedicated middleware that extracts & verifies refresh token
  // and attaches req.user.id to this point.
  const result = await authService.refreshAccessToken(req.user.id);
  setAuthCookies(res, result);
  res.success({
    data: { user: result.user, accessToken: result.accessToken },
    message: "Token refreshed",
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body);
  res.success({
    data: null,
    message: "If that email is registered, a reset link has been sent.",
  });
});

export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword({
    token: req.params.token,
    password: req.body.password,
  });
  res.success({
    data: null,
    message: "Password reset successful. You can now log in.",
  });
});
