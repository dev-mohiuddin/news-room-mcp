import { z } from "zod";

const idParam = z.string().min(1, "User id is required");

export const changeRoleSchema = z.object({
  params: z.object({ id: idParam }),
  body: z.object({
    roleId: z.string().min(1, "Role id is required"),
  }),
});

export const setStatusSchema = z.object({
  params: z.object({ id: idParam }),
  body: z.object({
    isActive: z.boolean({ required_error: "isActive is required" }),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({ id: idParam }),
});
