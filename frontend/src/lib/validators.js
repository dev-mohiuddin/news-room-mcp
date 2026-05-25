import { z } from "zod";

/* ──────────────────────────────────────────────────────────
 *  Auth schemas
 *
 *  registerSchema keeps `confirmPassword` + `terms` as
 *  frontend-only UX fields — they are validated client-side
 *  and stripped before sending to the backend (which only
 *  needs name/email/password).
 * ────────────────────────────────────────────────────────── */

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
    terms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ── OTP ── */
export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

/* ── Article ── */
export const articleSchema = z.object({
  title: z.string().min(3, "Title is too short"),
  topic: z.string().min(3, "Topic is required"),
  keyword: z.string().optional(),
  brandVoiceId: z.string().optional(),
});
