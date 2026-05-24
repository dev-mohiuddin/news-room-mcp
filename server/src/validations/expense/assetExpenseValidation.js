import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const lineItemSchema = z.object({
  itemName: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  quantity: z.number().min(0.0001),
  unitCost: z.number().min(0),
});

export const createAssetExpenseSchema = z.object({
  body: z.object({
    assetId: objectId,
    vendorName: z.string().min(2).max(120),
    description: z.string().max(1000).optional(),
    expenseDateTime: z.string().datetime().optional(),
    lineItems: z.array(lineItemSchema).min(1),
    currency: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const createAssetExpenseCorrectionSchema = z.object({
  body: z.object({
    assetId: objectId,
    vendorName: z.string().min(2).max(120).optional(),
    description: z.string().min(2).max(1000),
    expenseDateTime: z.string().datetime().optional(),
    lineItems: z.array(lineItemSchema).min(1),
    type: z.enum(["adjustment", "reversal"]),
    referenceExpenseId: objectId.optional(),
    currency: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const listAssetExpensesSchema = z.object({
  query: z.object({
    assetId: objectId.optional(),
    monthKey: monthKey.optional(),
    entryType: z.enum(["expense", "adjustment", "reversal"]).optional(),
  }),
});

export const getAssetMonthPnlSchema = z.object({
  params: z.object({
    assetId: objectId,
    monthKey,
  }),
});
