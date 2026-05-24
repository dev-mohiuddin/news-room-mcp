import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional();
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/).optional();

export const profitSummaryQuerySchema = z.object({
  query: z.object({
    monthKey,
    assetId: objectId,
  }),
});
