import { z } from "zod";

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    scope: z.enum(["all", "read", "articles", "research"]).optional(),
  }),
});

export const apiKeyIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const SUPPORTED_PROVIDERS = ["anthropic", "openai", "brave"];

export const upsertProviderKeySchema = z.object({
  body: z.object({
    provider: z.enum(SUPPORTED_PROVIDERS),
    rawKey: z.string().min(10).max(512),
    label: z.string().trim().max(120).optional(),
  }),
});

export const providerParamSchema = z.object({
  params: z.object({
    provider: z.enum(SUPPORTED_PROVIDERS),
  }),
});
