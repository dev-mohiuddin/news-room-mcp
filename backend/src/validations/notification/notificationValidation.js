import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParamSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export const listInboxQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      search: z.string().optional(),
      category: z
        .enum(["article", "team", "billing", "system", "broadcast", "support"])
        .optional(),
      unreadOnly: z
        .union([z.literal("true"), z.literal("false"), z.boolean()])
        .optional()
        .transform((v) => v === true || v === "true"),
    })
    .partial()
    .optional(),
});

export const sendBroadcastSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(1, "Subject is required").max(200),
    body: z.string().max(5000).optional().default(""),
    audience: z.enum(["all", "paying", "pro", "free"]).default("all"),
    type: z.enum(["info", "success", "warning", "error"]).default("info"),
    link: z
      .string()
      .url("Link must be a valid URL")
      .max(500)
      .nullable()
      .optional(),
  }),
});

export const listBroadcastsQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
    })
    .partial()
    .optional(),
});
