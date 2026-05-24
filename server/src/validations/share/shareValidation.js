import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const listShareAccountsSchema = z.object({
  params: z.object({
    assetId: objectId,
  }),
});

export const assignShareSchema = z.object({
  params: z.object({
    shareAccountId: objectId,
  }),
  body: z.object({
    userId: objectId,
    assignedAt: z.string().datetime().optional(),
  }),
});

export const recordSharePaymentSchema = z.object({
  params: z.object({
    shareAccountId: objectId,
  }),
  body: z.object({
    amount: z.number().min(0.01),
    paidAt: z.string().datetime().optional(),
    userId: objectId.optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const listSharePaymentsSchema = z.object({
  params: z.object({
    shareAccountId: objectId,
  }),
});

export const purchaseShareSchema = z.object({
  params: z.object({
    assetId: objectId,
  }),
  body: z.object({
    quantity: z.coerce.number().int().min(1).max(1000).optional().default(1),
  }),
});
