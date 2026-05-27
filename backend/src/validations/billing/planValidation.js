import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

const planCode = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, dashes, underscores");

const featureBullet = z.object({
  key: z.string().trim().max(40).optional().nullable(),
  label: z.string().trim().min(1).max(200),
  included: z.boolean().optional(),
});

/* Accept either cents (preferred) or USD float — service normalizes to cents. */
const priceFields = z
  .object({
    monthlyPriceCents: z.coerce.number().int().min(0).optional(),
    yearlyPriceCents: z.coerce.number().int().min(0).optional(),
    monthlyPriceUsd: z.coerce.number().min(0).optional(),
    yearlyPriceUsd: z.coerce.number().min(0).optional(),
  })
  .partial();

export const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

export const listPlansQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      isActive: z
        .union([z.literal("true"), z.literal("false"), z.boolean()])
        .optional()
        .transform((v) =>
          v === undefined ? undefined : v === true || v === "true"
        ),
    })
    .partial()
    .optional(),
});

export const createPlanSchema = z.object({
  body: z
    .object({
      code: planCode,
      displayName: z.string().trim().min(1).max(80),
      description: z.string().trim().max(500).optional().default(""),
      currency: z.string().trim().length(3).optional().default("USD"),
      articleLimit: z.coerce.number().int().min(-1),
      teamMembers: z.coerce.number().int().min(-1).default(1),
      features: z.array(featureBullet).max(20).optional().default([]),
      badge: z.string().trim().max(40).nullable().optional(),
      highlight: z.boolean().optional().default(false),
      cta: z.string().trim().max(60).nullable().optional(),
      isActive: z.boolean().optional().default(true),
      sortOrder: z.coerce.number().int().optional().default(0),
      stripePriceIdMonthly: z.string().trim().max(120).nullable().optional(),
      stripePriceIdYearly: z.string().trim().max(120).nullable().optional(),
    })
    .merge(priceFields),
});

export const updatePlanSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      displayName: z.string().trim().min(1).max(80).optional(),
      description: z.string().trim().max(500).optional(),
      currency: z.string().trim().length(3).optional(),
      articleLimit: z.coerce.number().int().min(-1).optional(),
      teamMembers: z.coerce.number().int().min(-1).optional(),
      features: z.array(featureBullet).max(20).optional(),
      badge: z.string().trim().max(40).nullable().optional(),
      highlight: z.boolean().optional(),
      cta: z.string().trim().max(60).nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.coerce.number().int().optional(),
      stripePriceIdMonthly: z.string().trim().max(120).nullable().optional(),
      stripePriceIdYearly: z.string().trim().max(120).nullable().optional(),
    })
    .merge(priceFields)
    .refine(
      (b) => Object.keys(b).length > 0,
      "Provide at least one field to update"
    ),
});

export const setActiveSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ isActive: z.boolean() }),
});
