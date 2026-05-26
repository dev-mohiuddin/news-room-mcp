import { z } from "zod";

export const createWordpressConnectionSchema = z.object({
  body: z.object({
    siteUrl: z
      .string()
      .url("siteUrl must be a valid URL")
      .max(2048)
      .refine((u) => /^https:\/\//i.test(u), {
        message: "siteUrl must use https://",
      }),
    username: z.string().trim().min(1).max(60),
    applicationPassword: z.string().min(1).max(255),
    label: z.string().trim().max(80).optional(),
  }),
});

export const cmsIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "CMS connection id is required"),
  }),
});
