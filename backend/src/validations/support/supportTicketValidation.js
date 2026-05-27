import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

const status = z.enum(["open", "pending", "resolved", "closed"]);
const priority = z.enum(["low", "medium", "high"]);

export const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

export const listQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      search: z.string().optional(),
      status: status.optional(),
      priority: priority.optional(),
    })
    .partial()
    .optional(),
});

export const adminListQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      search: z.string().optional(),
      status: status.optional(),
      priority: priority.optional(),
      workspaceId: objectId.optional(),
      assignedTo: objectId.optional(),
    })
    .partial()
    .optional(),
});

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(2).max(200),
    body: z.string().trim().min(2).max(5000),
    priority: priority.default("medium").optional(),
  }),
});

export const replySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    body: z.string().trim().min(1).max(5000),
  }),
});

export const statusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ status }),
});

export const prioritySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ priority }),
});

export const assignSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    assigneeId: objectId.nullable().optional(),
  }),
});
