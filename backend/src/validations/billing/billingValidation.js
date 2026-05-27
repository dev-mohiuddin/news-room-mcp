import { z } from "zod";

export const checkoutSchema = z.object({
  body: z.object({
    planCode: z.string().trim().min(2).max(40),
    billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  }),
});

export const portalSchema = z.object({
  body: z.object({}).optional(),
});

export const invoicesQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      status: z
        .enum(["paid", "failed", "refunded", "open", "void", "uncollectible", "draft"])
        .optional(),
    })
    .partial()
    .optional(),
});

export const adminInvoicesQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      status: z
        .enum(["paid", "failed", "refunded", "open", "void", "uncollectible", "draft"])
        .optional(),
      workspaceId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    })
    .partial()
    .optional(),
});
