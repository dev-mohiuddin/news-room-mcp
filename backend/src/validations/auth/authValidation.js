import { z } from "zod";

const emailField = z
  .string({ required_error: "Email is required" })
  .min(1, "Email is required")
  .email("Invalid email address")
  .transform((s) => s.toLowerCase().trim());

const passwordField = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters");

/* ── Register ── */
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .min(2, "Name must be at least 2 characters")
      .trim(),
    email: emailField,
    password: passwordField,
  }),
});

/* ── Login ── */
export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
  }),
});

/* ── Verify OTP ── */
export const verifyOtpSchema = z.object({
  body: z.object({
    email: emailField,
    otp: z
      .string({ required_error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
  }),
});

/* ── Resend OTP ── */
export const resendOtpSchema = z.object({
  body: z.object({
    email: emailField,
  }),
});

/* ── Google sign-in ── */
export const googleSignInSchema = z.object({
  body: z.object({
    idToken: z
      .string({ required_error: "Google ID token is required" })
      .min(10, "Invalid Google token"),
  }),
});

/* ── Refresh token (optional body, may come from cookie) ── */
export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

/* ── Forgot password ── */
export const forgotPasswordSchema = z.object({
  body: z.object({ email: emailField }),
});

/* ── Reset password ── */
export const resetPasswordSchema = z.object({
  body: z.object({ password: passwordField }),
  params: z.object({
    token: z.string().min(10, "Invalid reset token"),
  }),
});
