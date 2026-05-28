import { z } from "zod";
import { SUPPORTED_INTEGRATION_PROVIDERS } from "#models/integrationModel.js";

const providerEnum = z.enum(SUPPORTED_INTEGRATION_PROVIDERS);

/* Plain key/value bundle. Keys validated per-provider in the service.  */
const bundleSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export const upsertIntegrationSchema = z.object({
  body: z.object({
    provider: providerEnum,
    bundle: bundleSchema.refine((b) => Object.keys(b).length > 0, {
      message: "bundle must not be empty",
    }),
    label: z.string().trim().max(120).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const providerParamSchema = z.object({
  params: z.object({ provider: providerEnum }),
});

export const setActiveSchema = z.object({
  params: z.object({ provider: providerEnum }),
  body: z.object({ isActive: z.boolean() }),
});
