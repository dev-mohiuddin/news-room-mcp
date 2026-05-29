import { z } from "zod";

const STAGE_PARAM = z.enum(["research", "outline", "draft", "seo", "publish"]);
const RUNNABLE_STAGE_PARAM = z.enum(["research", "outline", "draft", "seo"]);

export const wizardStartSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(1).max(200),
    targetKeyword: z.string().trim().min(1).max(100),
    tone: z.enum(["Professional", "Casual", "Journalistic", "Academic"]).optional(),
    targetWordCount: z.number().int().min(300).max(5000).optional(),
    additionalKeywords: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
    /** ObjectId hex strings — accepted as opaque strings, controller
        validates ownership before persisting. */
    brandVoiceProfileId: z.string().trim().length(24).optional().nullable(),
    templateId: z.string().trim().length(24).optional().nullable(),
  }),
});

export const stageRunParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    stage: RUNNABLE_STAGE_PARAM,
  }),
});

export const stageParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    stage: STAGE_PARAM,
  }),
});

export const briefSelectionsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    selectedCanonicalUrls: z
      .array(z.string().url())
      .min(3, "Select at least 3 sources")
      .max(50, "Select at most 50 sources"),
  }),
});

const outlineSectionShape = z.object({
  heading: z.string().trim().min(1).max(200),
  subPoints: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  estimatedWordCount: z.number().int().min(50).max(2000),
});

export const outlinePatchSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    outline: z.array(outlineSectionShape).min(1).max(20),
    tone: z.enum(["Professional", "Casual", "Journalistic", "Academic"]).optional(),
    targetWordCount: z.number().int().min(300).max(5000).optional(),
  }),
});

export const outlineSectionAppendSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: outlineSectionShape.partial({
    heading: true,
    subPoints: true,
    estimatedWordCount: true,
  }).extend({
    heading: z.string().trim().min(1).max(200).optional(),
  }),
});

export const outlineSectionRemoveParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    idx: z.string().regex(/^\d+$/),
  }),
});

export const chunkReplayQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1),
    stage: RUNNABLE_STAGE_PARAM,
  }),
  query: z.object({
    since: z.string().regex(/^-?\d+$/).optional(),
  }).optional(),
});
