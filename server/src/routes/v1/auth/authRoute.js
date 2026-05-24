import express from "express";
import {
  signIn,
  signUp,
  verifyOtp,
  resendOtp,
  refreshToken,
  forgotPassword,
  resetPassword,
} from "#controllers/auth/authController.js";
import { validate } from "#middlewares/validateMiddleware.js";
import { createStrictRateLimiter, createRateLimiter } from "#middlewares/rateLimiterMiddleware.js";
import {
  signInSchema,
  signUpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "#validations/auth/authValidation.js";

export const authRouter = express.Router();

const loginLimiter = createStrictRateLimiter(5, 15);
const registerLimiter = createStrictRateLimiter(3, 60);
const verifyLimiter = createRateLimiter(10, 15);
const resendLimiter = createStrictRateLimiter(3, 15);
const forgotLimiter = createStrictRateLimiter(3, 15);
const resetLimiter = createStrictRateLimiter(5, 15);

authRouter.post("/auth/login", loginLimiter, validate(signInSchema), signIn);
authRouter.post("/auth/register", registerLimiter, validate(signUpSchema), signUp);
authRouter.post("/auth/verify-otp", verifyLimiter, validate(verifyOtpSchema), verifyOtp);
authRouter.post("/auth/resend-otp", resendLimiter, validate(resendOtpSchema), resendOtp);
authRouter.post("/auth/refresh-token", validate(refreshTokenSchema), refreshToken);
authRouter.post("/auth/forgot-password", forgotLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/auth/reset-password", resetLimiter, validate(resetPasswordSchema), resetPassword);
