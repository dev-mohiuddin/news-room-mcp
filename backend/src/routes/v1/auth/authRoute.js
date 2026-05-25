import express from "express";

import {
  register,
  verifyOtp,
  resendOtp,
  login,
  googleSignIn,
  logout,
  me,
  refreshToken,
  forgotPassword,
  resetPassword,
} from "#controllers/auth/authController.js";

import { validate } from "#middlewares/validateMiddleware.js";
import { protect } from "#middlewares/authMiddleware.js";
import { verifyRefreshTokenMiddleware } from "#middlewares/refreshTokenMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";

import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  googleSignInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "#validations/auth/authValidation.js";

export const authRouter = express.Router();

/* ── Per-route rate limiters ── */
const loginLimiter = createStrictRateLimiter(5, 15);
const registerLimiter = createStrictRateLimiter(3, 60);
const otpLimiter = createStrictRateLimiter(3, 15);
const verifyLimiter = createRateLimiter(10, 15);
const forgotLimiter = createStrictRateLimiter(3, 15);
const resetLimiter = createStrictRateLimiter(5, 15);

/* ── Routes ── */

// Public auth
authRouter.post("/auth/register", registerLimiter, validate(registerSchema), register);
authRouter.post("/auth/verify-otp", verifyLimiter, validate(verifyOtpSchema), verifyOtp);
authRouter.post("/auth/resend-otp", otpLimiter, validate(resendOtpSchema), resendOtp);
authRouter.post("/auth/login", loginLimiter, validate(loginSchema), login);
authRouter.post("/auth/google", loginLimiter, validate(googleSignInSchema), googleSignIn);

// Refresh — uses cookie/body refresh token, NOT access token
authRouter.post("/auth/refresh-token", verifyRefreshTokenMiddleware, refreshToken);

// Logout — public (clears cookies)
authRouter.post("/auth/logout", logout);

// Password reset
authRouter.post(
  "/auth/forgot-password",
  forgotLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);
authRouter.post(
  "/auth/reset-password/:token",
  resetLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

// Authenticated
authRouter.get("/auth/me", protect, me);

export default authRouter;
