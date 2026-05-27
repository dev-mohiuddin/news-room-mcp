import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#([A-Fa-f0-9]{3}){1,2}$/, "Use a hex color like #3B82F6");

const urlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\//.test(v),
    "Use an absolute http(s) URL"
  )
  .nullable()
  .optional();

const identityPatch = z.object({
  platformName: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().trim().max(160).optional(),
  supportEmail: z.string().trim().email().max(200).optional(),
  defaultTimezone: z.string().trim().max(60).optional(),
});

const brandingPatch = z.object({
  primaryColor: hexColor.optional(),
  logoLightUrl: urlOrEmpty,
  logoDarkUrl: urlOrEmpty,
  faviconUrl: urlOrEmpty,
});

const emailPatch = z.object({
  smtpHost: z.string().trim().max(200).nullable().optional(),
  smtpPort: z.coerce.number().int().min(0).max(65535).nullable().optional(),
  smtpUser: z.string().trim().max(200).nullable().optional(),
  fromAddress: z
    .string()
    .trim()
    .email()
    .max(200)
    .nullable()
    .optional(),
  fromName: z.string().trim().max(100).nullable().optional(),
});

const maintenancePatch = z.object({
  enabled: z.boolean().optional(),
  message: z.string().trim().max(500).optional(),
  allowAdminBypass: z.boolean().optional(),
});

export const updateSectionSchema = z.object({
  params: z.object({
    section: z.enum(["identity", "branding", "email", "maintenance"]),
  }),
  body: z
    .union([identityPatch, brandingPatch, emailPatch, maintenancePatch])
    .refine((b) => Object.keys(b).length > 0, "Provide at least one field"),
});

const featureFlagSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase snake_case"),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional().default(""),
  enabled: z.boolean().default(false),
  category: z
    .enum(["core", "experimental", "integration", "billing"])
    .default("core"),
});

export const replaceFlagsSchema = z.object({
  body: z.object({
    features: z.array(featureFlagSchema).max(50),
  }),
});

export const toggleFlagSchema = z.object({
  params: z.object({
    flagId: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[a-z][a-z0-9_]*$/),
  }),
  body: z
    .object({
      enabled: z.boolean(),
      label: z.string().trim().max(120).optional(),
      description: z.string().trim().max(300).optional(),
      category: z
        .enum(["core", "experimental", "integration", "billing"])
        .optional(),
    })
    .partial({ label: true, description: true, category: true }),
});
