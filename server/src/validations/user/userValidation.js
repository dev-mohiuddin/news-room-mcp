import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const approvalStatusEnum = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
  "on-hold",
]);

const payoutMethodEnum = z.enum(["bank", "bkash"]);

const payoutBankAccountSchema = z.object({
  bankName: z.string().trim().min(1).optional(),
  accountHolderName: z.string().trim().min(1).optional(),
  accountNumber: z.string().trim().min(4).optional(),
  routingNumber: z.string().trim().optional(),
  branchName: z.string().trim().optional(),
});

const payoutBkashSchema = z.object({
  number: z.string().trim().min(6).optional(),
  accountType: z.enum(["personal", "agent"]).optional(),
  accountHolderName: z.string().trim().min(1).optional(),
});

const payoutDetailsSchema = z
  .object({
    preferredMethod: payoutMethodEnum.optional(),
    bankAccount: payoutBankAccountSchema.optional(),
    bkash: payoutBkashSchema.optional(),
  })
  .optional();

export const createInvestorByAdminSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().min(6).optional().or(z.literal("")),
    country: z.string().min(2).optional().or(z.literal("")),
  }),
});

export const updateMeSchema = z.object({
  body: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
      country: z.string().optional(),
      profilePhoto: z
        .object({
          url: z.string().optional(),
          publicId: z.string().optional(),
        })
        .optional(),
      investorProfile: z
        .object({
          accreditationStatus: z
            .enum(["none", "accredited", "non_accredited"])
            .optional(),
          riskProfile: z.enum(["low", "medium", "high"]).optional(),
          onboardingCompleted: z.boolean().optional(),
          payoutDetails: payoutDetailsSchema,
        })
        .optional(),
    })
    .refine((val) => Object.keys(val).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const submitInvestorProfileSchema = z.object({
  body: z.object({
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
});

export const investorDocumentUploadSchema = z.object({
  body: z.object({
    docType: z.string().trim().min(1).max(50),
    docNumber: z.string().trim().max(100).optional().or(z.literal("")),
    category: z
      .enum(["identity", "other"])
      .optional(),
  }),
});

export const investorDocumentUploadByAdminSchema = z.object({
  params: z.object({
    investorId: objectId,
  }),
  body: z.object({
    docType: z.string().trim().min(1).max(50),
    docNumber: z.string().trim().max(100).optional().or(z.literal("")),
    category: z
      .enum(["identity", "other"])
      .optional(),
  }),
});

export const getInvestorByIdSchema = z.object({
  params: z.object({
    investorId: objectId,
  }),
});

export const listInvestorDocumentsSchema = z.object({
  params: z.object({
    investorId: objectId,
  }),
});

export const updateInvestorByAdminSchema = z.object({
  params: z.object({
    investorId: objectId,
  }),
  body: z
    .object({
      firstName: z.string().trim().min(1).max(50).optional(),
      lastName: z.string().trim().min(1).max(50).optional(),
      phone: z.string().trim().optional(),
      country: z.string().trim().optional(),
      isActive: z.boolean().optional(),
      investorProfile: z
        .object({
          kycStatus: z.enum(["pending", "verified", "rejected"]).optional(),
          accreditationStatus: z
            .enum(["none", "accredited", "non_accredited"])
            .optional(),
          riskProfile: z.enum(["low", "medium", "high"]).optional(),
          onboardingCompleted: z.boolean().optional(),
          approval: z
            .object({
              status: approvalStatusEnum.optional(),
              approvalNote: z.string().trim().max(500).optional(),
              rejectionReason: z.string().trim().max(500).optional(),
              holdReason: z.string().trim().max(500).optional(),
            })
            .optional(),
          payoutDetails: payoutDetailsSchema,
        })
        .optional(),
    })
    .refine((val) => Object.keys(val).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const updateInvestorStatusSchema = z.object({
  params: z.object({
    investorId: objectId,
  }),
  body: z.object({
    action: z.enum(["activate", "deactivate", "hold", "unhold"]),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  }),
});

export const reviewInvestorApprovalSchema = z
  .object({
    params: z.object({
      investorId: objectId,
    }),
    body: z.object({
      decision: z.enum(["approved", "rejected"]),
      approvalNote: z.string().trim().max(500).optional().or(z.literal("")),
      rejectionReason: z.string().trim().max(500).optional().or(z.literal("")),
    }),
  })
  .superRefine(({ body }, ctx) => {
    if (body.decision === "rejected" && !body.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "rejectionReason"],
        message: "Rejection reason is required",
      });
    }
  });

export const listMyTransactionsQuerySchema = z.object({
  query: z.object({
    type: z
      .enum(["deposit", "withdrawal", "profit", "adjustment", "reversal"])
      .optional(),
    startDate: dayKey.optional(),
    endDate: dayKey.optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    skip: z.coerce.number().int().min(0).optional(),
  }),
});
