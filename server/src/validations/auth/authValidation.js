import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const signInSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(1, "Password is required"),
  }),
});

export const signUpSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().max(255),
    password: strongPassword,
    phone: z.string().min(6).max(20).optional().or(z.literal("")),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    otp: z.string().length(6),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
  }),
});

export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(10).optional(),
    })
    .optional()
    .default({}),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    password: strongPassword,
  }),
});
