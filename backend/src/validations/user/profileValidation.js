import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      avatar: z.string().url().or(z.literal("")).optional(),
      timezone: z.string().trim().max(40).optional(),
      language: z.string().trim().max(10).optional(),
    })
    .strict(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(200),
  }),
});

export const updateNotificationsSchema = z.object({
  body: z
    .object({
      emailArticleReady: z.boolean().optional(),
      emailFailures: z.boolean().optional(),
      emailWeeklyDigest: z.boolean().optional(),
      inappArticleReady: z.boolean().optional(),
      inappFailures: z.boolean().optional(),
    })
    .strict(),
});

export const updateWorkspaceSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
    })
    .strict(),
});
