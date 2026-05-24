import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const payoutMethodEnum = z.enum(["bank", "bkash"]);

export const requestWithdrawalSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(1),
    method: payoutMethodEnum,
    note: z.string().trim().min(1).max(500).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const updateWithdrawalStatusSchema = z.object({
  params: z.object({
    withdrawalId: objectId,
  }),
  body: z.object({
    status: z.enum(["approved", "processing", "paid", "rejected", "cancelled"]),
    note: z.string().trim().max(500).optional(),
    reason: z.string().trim().optional(),
  }),
});

export const cancelMyWithdrawalSchema = z.object({
  params: z.object({
    withdrawalId: objectId,
  }),
  body: z.object({
    note: z.string().trim().max(500).optional(),
    reason: z.string().trim().max(500).optional(),
  }),
});

export const requestDepositSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(1),
    method: payoutMethodEnum,
    transactionId: z.string().trim().min(3).max(120),
    note: z.string().trim().min(1).max(500).optional(),
  }),
});

export const updateDepositStatusSchema = z.object({
  params: z.object({
    depositId: objectId,
  }),
  body: z.object({
    status: z.enum(["approved", "completed", "rejected", "cancelled"]),
    note: z.string().trim().max(500).optional(),
    reason: z.string().trim().optional(),
  }),
});
