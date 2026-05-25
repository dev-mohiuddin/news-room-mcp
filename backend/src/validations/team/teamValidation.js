import { z } from "zod";
import { ROLE_NAMES } from "#constants/roles.js";

const ALLOWED_INVITE_ROLES = [
  ROLE_NAMES.EDITOR,
  ROLE_NAMES.WRITER,
  ROLE_NAMES.VIEWER,
];

export const inviteSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email")
      .transform((s) => s.toLowerCase().trim()),
    roleName: z.enum(ALLOWED_INVITE_ROLES, {
      errorMap: () => ({
        message: `Role must be one of: ${ALLOWED_INVITE_ROLES.join(", ")}`,
      }),
    }),
  }),
});

export const inviteIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Invitation id is required"),
  }),
});

export const memberRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Member id is required"),
  }),
  body: z.object({
    roleName: z.enum(ALLOWED_INVITE_ROLES, {
      errorMap: () => ({ message: "Invalid role" }),
    }),
  }),
});

export const memberIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Member id is required"),
  }),
});

export const inviteTokenParamSchema = z.object({
  params: z.object({
    token: z.string().min(20, "Invalid token"),
  }),
});

export const acceptInviteSchema = z.object({
  params: z.object({
    token: z.string().min(20, "Invalid token"),
  }),
  body: z.object({
    name: z.string().min(2, "Name is required").optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  }),
});
