import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createAssetSchema = z.object({
  body: z
    .object({
      name: z.string().min(2),
      description: z.string().optional(),
      category: z.string().optional(),
      location: z.string().optional(),
      totalShares: z.number().int().min(1),
      sharePrice: z.number().min(0).optional(),
      totalAssetValue: z.number().min(0).optional(),
      totalSharePrice: z.number().min(0).optional(),
      availableShares: z.number().min(0).optional(),
      status: z.enum(["draft", "active", "paused", "closed"]).optional(),
      createdBy: objectId.optional(),
    })
    .refine((val) => val.totalAssetValue !== undefined || val.sharePrice !== undefined, {
      message: "Either totalAssetValue or sharePrice must be provided",
    }),
});

export const updateAssetSchema = z.object({
  params: z.object({
    assetId: objectId,
  }),
  body: z
    .object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      location: z.string().optional(),
      totalShares: z.number().int().min(1).optional(),
      sharePrice: z.number().min(0).optional(),
      totalAssetValue: z.number().min(0).optional(),
      totalSharePrice: z.number().min(0).optional(),
      availableShares: z.number().min(0).optional(),
      status: z.enum(["draft", "active", "paused", "closed"]).optional(),
    })
    .refine((val) => Object.keys(val).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const getAssetSchema = z.object({
  params: z.object({
    assetId: objectId,
  }),
});
