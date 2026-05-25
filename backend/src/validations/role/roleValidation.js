import { z } from "zod";
import { ROLE_SCOPES, ALL_PERMISSION_KEYS } from "#constants/roles.js";

const nameField = z
  .string({ required_error: "Role name is required" })
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name is too long")
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits, and underscores only")
  .transform((s) => s.trim().toLowerCase());

const displayNameField = z
  .string({ required_error: "Display name is required" })
  .min(2, "Display name must be at least 2 characters")
  .max(80, "Display name is too long")
  .trim();

const descriptionField = z.string().max(280, "Description is too long").trim().optional();

const permissionsField = z
  .array(z.enum(ALL_PERMISSION_KEYS, { errorMap: () => ({ message: "Unknown permission key" }) }))
  .min(1, "At least one permission is required");

const scopeField = z.enum(Object.values(ROLE_SCOPES), {
  errorMap: () => ({ message: "Scope must be platform or tenant" }),
});

/* ── Create platform role ── */
export const createRoleSchema = z.object({
  body: z.object({
    name: nameField,
    displayName: displayNameField,
    description: descriptionField,
    scope: scopeField.optional().default(ROLE_SCOPES.PLATFORM),
    permissions: permissionsField,
  }),
});

/* ── Update platform role ── */
export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Role id is required"),
  }),
  body: z.object({
    displayName: displayNameField.optional(),
    description: descriptionField,
    permissions: permissionsField.optional(),
  }),
});

/* ── Delete role ── */
export const deleteRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Role id is required"),
  }),
});

/* ── List query (page, perPage, search, scope) ── */
export const listRolesQuerySchema = z.object({
  query: z
    .object({
      scope: scopeField.optional(),
      search: z.string().optional(),
      page: z.string().optional(),
      perPage: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.string().optional(),
    })
    .optional(),
});
