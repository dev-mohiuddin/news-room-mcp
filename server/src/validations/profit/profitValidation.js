import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const recordAssetProfitSchema = z.object({
  body: z.object({
    assetId: objectId,
    monthKey,
    amount: z.number().min(0.01),
    currency: z.string().optional(),
    type: z.enum(["base", "adjustment", "reversal"]).optional(),
  }),
});

export const recordAssetProfitAdjustmentSchema = z.object({
  body: z.object({
    assetId: objectId,
    monthKey,
    amount: z.number().min(0.01),
    currency: z.string().optional(),
    type: z.enum(["adjustment", "reversal"]),
  }),
});

export const listAssetProfitEntriesSchema = z.object({
  params: z.object({
    assetId: objectId,
    monthKey,
  }),
});

export const getAssetMonthPnlSchema = z.object({
  params: z.object({
    assetId: objectId,
    monthKey,
  }),
});

export const createProfitAdjustmentSchema = z.object({
  body: z.object({
    userId: objectId,
    assetId: objectId,
    shareAccountId: objectId,
    ledgerDate: dayKey,
    amount: z.number().min(0.01),
    type: z.enum(["adjustment", "reversal"]),
    currency: z.string().optional(),
    referenceLedgerId: objectId.optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});
