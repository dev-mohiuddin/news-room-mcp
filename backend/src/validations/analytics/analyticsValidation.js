import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const trackViewSchema = z.object({
  body: z.object({
    articleId: objectId,
    referrer: z.string().trim().max(500).optional(),
    /* `slug` is accepted as a hint but never trusted — backend resolves
       the article by id. Keeping it lets the public pixel send it without
       making the contract stricter. */
    slug: z.string().trim().max(200).optional(),
  }),
});

export const rangeQuerySchema = z.object({
  query: z
    .object({
      range: z.enum(["7d", "30d", "90d"]).optional(),
    })
    .partial()
    .optional(),
});
