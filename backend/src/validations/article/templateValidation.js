import { z } from "zod";

const templateBody = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 chars").max(80),
  description: z.string().trim().max(2000).optional().default(""),
  category: z.string().trim().max(60).optional().default("General"),
  targetWordCount: z.coerce.number().int().min(200).max(6000).optional().default(1500),
});

export const createTemplateSchema = z.object({ body: templateBody });

export const updateTemplateSchema = z.object({
  body: templateBody.partial(),
  params: z.object({ id: z.string().min(1) }),
});

export const templateIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listTemplatesQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      perPage: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      category: z.string().optional(),
    })
    .partial()
    .optional(),
});
