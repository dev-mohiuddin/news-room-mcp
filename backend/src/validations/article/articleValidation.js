import { z } from "zod";
import { ARTICLE_STATUS_VALUES } from "#constants/articleStatus.js";

export const generateArticleSchema = z.object({
  body: z.object({
    topic: z
      .string({ required_error: "topic is required" })
      .trim()
      .min(1, "topic is required")
      .max(200, "topic too long"),
    targetKeyword: z
      .string({ required_error: "targetKeyword is required" })
      .trim()
      .min(1, "targetKeyword is required")
      .max(100, "targetKeyword too long"),
    tone: z.enum(["Professional", "Casual", "Journalistic", "Academic"]).optional(),
    targetWordCount: z.number().int().min(300).max(5000).optional(),
    additionalKeywords: z
      .array(z.string().trim().min(1).max(100))
      .max(10)
      .optional(),
  }),
});

export const articleIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Article id is required"),
  }),
});

export const updateArticleSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(180).optional(),
      contentHtml: z.string().optional(),
      seo: z
        .object({
          metaTitle: z.string().min(1).max(80).optional(),
          metaDescription: z.string().min(1).max(160).optional(),
          slug: z.string().min(1).max(75).optional(),
        })
        .partial()
        .optional(),
      tags: z.array(z.string().min(1).max(40)).optional(),
      featuredImage: z
        .object({
          url: z.string().url(),
          alt: z.string().optional(),
          source: z.enum(["unsplash", "upload", "ai"]),
          sourceAttribution: z.any().optional(),
        })
        .optional(),
    })
    .strict(), // refuse unknown fields per Req 18.3
});

export const listArticlesQuerySchema = z.object({
  query: z
    .object({
      status: z.enum(ARTICLE_STATUS_VALUES).optional(),
      search: z.string().optional(),
      tag: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.string().optional(),
      perPage: z.string().optional(),
    })
    .optional(),
});

export const publishArticleSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      cmsConnectionId: z.string().min(1, "cmsConnectionId is required"),
      confirmAutoPublish: z.boolean().optional(),
      scheduledAt: z.string().datetime().optional(),
    })
    .strict(),
});

export const retryArticleSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      from: z.enum(["research", "outline", "draft"]).optional(),
    })
    .strict()
    .optional(),
});

export const exportArticleSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  query: z
    .object({
      format: z.enum(["markdown", "json", "html"]).optional(),
    })
    .optional(),
});
