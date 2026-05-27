import { z } from "zod";

export const searchTopicSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(2).max(160),
    targetKeyword: z.string().trim().max(120).optional().nullable(),
    depth: z.enum(["quick", "deep", "comprehensive"]).optional().default("deep"),
  }),
});

export const summarizeSourcesSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(2).max(160),
    targetKeyword: z.string().trim().max(120).optional().nullable(),
    urls: z
      .array(z.string().url("Each entry must be a valid URL"))
      .min(1, "Select at least one source")
      .max(5, "At most 5 sources can be summarized at once"),
  }),
});
