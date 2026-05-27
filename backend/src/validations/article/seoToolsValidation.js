import { z } from "zod";

export const metaSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(2).max(200),
    targetKeyword: z.string().trim().max(120).optional().nullable(),
  }),
});

export const slugSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
  }),
});

export const faqSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(2).max(200),
    targetKeyword: z.string().trim().max(120).optional().nullable(),
    context: z.string().trim().max(8000).optional().nullable(),
  }),
});

export const keywordSchema = z.object({
  body: z.object({
    keyword: z.string().trim().min(2).max(120),
  }),
});
