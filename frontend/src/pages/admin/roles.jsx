import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Lock,
  Shield,
  ShieldCheck,
  Users as UsersIcon,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import PermissionPicker from "@/components/admin/PermissionPicker";

import {
  fetchRoles,
  fetchPermissionCatalog,
  createRole,
  updateRole,
  deleteRole,
} from "@/redux/slice/role-slice";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const SCOPE_TABS = [
  { value: "platform", label: "Platform Roles", icon: Shield },
  { value: "tenant", label: "Tenant Roles", icon: Briefcase },
];

export default function AdminRolesPage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { list, permissionCatalog, isLoading } = useSelector((s) => s.role);

  const [activeScope, setActiveScope] = useState("platform");
  const [editing, setEditing] = useState(null); // role being edited (or {} for create)
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSuperAdmin = hasPermission(user, "*");

  /* Load roles + catalog once */
  useEffect(() => {
    dispatch(fetchRoles({ perPage: 100 }));
    dispatch(fetchPermissionCatalog());
  }, [dispatch]);

  const filteredRoles = useMemo(
    () => list.filter((r) => r.scope === activeScope),
    [list, activeScope]
  );

  /* ── Save (create or update) ── */
  const handleSave = async (form) => {
    setBusy(true);
    try {
      if (form._id) {
        await dispatch(
          updateRole({
            id: form._id,
            payload: {
              displayName: form.displayName,
              description: form.description,
              permissions: form.permissions,
            },
          })
        ).unwrap();
        toast.success("Role updated");
      } else {
        await dispatch(
          createRole({
            name: form.name,
            displayName: form.displayName,
            description: form.description,
            scope: "platform", // only platform creatable
            permissions: form.permissions,
          })
        ).unwrap();
        toast.success("Role created");
      }
      setEditing(null);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await dispatch(deleteRole(deleting._id)).unwrap();
      toast.success(`Role '${deleting.displayName}' deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="Roles & permissions"
        subtitle="Define who can do what. Platform roles are dynamic — create custom ones for your team. Tenant roles are static, controlled by the codebase."
        actions={
          isSuperAdmin && activeScope === "platform" ? (
            <GradientButton
              size="md"
              onClick={() =>
                setEditing({
                  name: "",
                  displayName: "",
                  description: "",
                  permissions: [],
                  scope: "platform",
                })
              }
            >
              <Plus className="h-4 w-4" /> Create role
            </GradientButton>
          ) : null
        }
      />

      <Tabs value={activeScope} onValueChange={setActiveScope}>
        <TabsList className="grid w-fit grid-cols-2">
          {SCOPE_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SCOPE_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-5">
            {isLoading && filteredRoles.length === 0 ? (
              <RoleGridSkeleton />
            ) : filteredRoles.length === 0 ? (
              <EmptyRoleState scope={tab.value} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.map((role) => (
                  <RoleCard
                    key={role._id}
                    role={role}
                    canEdit={isSuperAdmin && !role.isStatic && role.scope === "platform"}
                    canDelete={
                      isSuperAdmin && !role.isStatic && !role.isSystem && role.scope === "platform"
                    }
                    onEdit={() => setEditing(role)}
                    onDelete={() => setDeleting(role)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit dialog */}
      <RoleFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        catalog={permissionCatalog}
        busy={busy}
        isSuperAdmin={isSuperAdmin}
        onSubmit={handleSave}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete role?"
        description={
          deleting
            ? `Are you sure you want to delete "${deleting.displayName}"? This cannot be undone. Users assigned to this role must be reassigned first.`
            : ""
        }
        confirmLabel="Delete role"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Role card
 * ────────────────────────────────────────────────────────── */
function RoleCard({ role, canEdit, canDelete, onEdit, onDelete }) {
  const isWildcard = role.permissions?.includes("*");
  const permCount = isWildcard ? "All permissions" : `${role.permissions?.length || 0} permissions`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard
        className={cn(
          "p-5 h-full flex flex-col gap-3 card-hover",
          role.isStatic && "ring-1 ring-white/5"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                isWildcard
                  ? "bg-linear-to-br from-violet-500 via-fuchsia-500 to-pink-500"
                  : role.scope === "platform"
                    ? "bg-linear-to-br from-blue-500 to-cyan-500"
                    : "bg-linear-to-br from-emerald-500 to-teal-500"
              )}
            >
              {isWildcard ? (
                <ShieldCheck className="h-4 w-4 text-white" />
              ) : role.scope === "platform" ? (
                <Shield className="h-4 w-4 text-white" />
              ) : (
                <UsersIcon className="h-4 w-4 text-white" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold leading-tight truncate">
                {role.displayName}
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                {role.name}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {role.isDefault && (
              <Badge variant="outline" className="text-[9px] tracking-widest">
                DEFAULT
              </Badge>
            )}
            {role.isStatic && (
              <Badge
                variant="outline"
                className="text-[9px] tracking-widest border-white/15"
              >
                <Lock className="h-2.5 w-2.5 mr-1" /> STATIC
              </Badge>
            )}
          </div>
        </div>

        {role.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {role.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[11px] text-muted-foreground">{permCount}</span>
          <div className="flex items-center gap-1">
            {canEdit ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-7 gap-1 text-xs"
              >
                <Edit className="h-3 w-3" /> Edit
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-7 gap-1 text-xs text-muted-foreground"
              >
                View
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Create/Edit dialog
 * ────────────────────────────────────────────────────────── */
function RoleFormDialog({
  open,
  onOpenChange,
  initial,
  catalog,
  busy,
  isSuperAdmin,
  onSubmit,
}) {
  const [form, setForm] = useState({
    _id: null,
    name: "",
    displayName: "",
    description: "",
    permissions: [],
    scope: "platform",
    isStatic: false,
  });

  useEffect(() => {
    if (!initial) return;
    setForm({
      _id: initial._id || null,
      name: initial.name || "",
      displayName: initial.displayName || "",
      description: initial.description || "",
      permissions: initial.permissions?.includes("*")
        ? [] // Wildcard handled visually; cannot edit super admin perms
        : initial.permissions || [],
      scope: initial.scope || "platform",
      isStatic: !!initial.isStatic,
      isSystem: !!initial.isSystem,
      isWildcard: initial.permissions?.includes("*"),
    });
  }, [initial]);

  const isEditing = !!form._id;
  const readOnly = form.isStatic || form.isWildcard;

  const handleNameInput = (raw) => {
    const slug = raw
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_/, "");
    setForm((f) => ({ ...f, name: slug }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (readOnly) {
      onOpenChange(false);
      return;
    }
    if (!form.name || !form.displayName) {
      toast.error("Name and display name are required");
      return;
    }
    if (!form.permissions.length) {
      toast.error("Pick at least one permission");
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {form.isWildcard
              ? `View role: ${form.displayName}`
              : isEditing
                ? readOnly
                  ? `View role: ${form.displayName}`
                  : `Edit role: ${form.displayName}`
                : "Create new platform role"}
          </DialogTitle>
          <DialogDescription>
            {form.isWildcard
              ? "Super admin has unrestricted access — its permissions cannot be modified."
              : readOnly
                ? "Static roles are controlled by the codebase. To change them, edit constants/roles.js and redeploy."
                : "Pick a name, then select the permissions this role should grant."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                placeholder="Finance Manager"
                disabled={readOnly}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="name">
                Slug{" "}
                <span className="text-muted-foreground text-xs">(lowercase, no spaces)</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameInput(e.target.value)}
                placeholder="finance_manager"
                disabled={readOnly || isEditing}
                className="mt-1.5 font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What this role is for…"
              disabled={readOnly}
              rows={2}
              className="mt-1.5"
            />
          </div>

          {form.isWildcard ? (
            <GlassCard className="p-4 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 inline-block mr-1.5 text-primary" />
              This role has the wildcard <code className="font-mono">*</code>{" "}
              permission — full unrestricted access to the entire platform.
            </GlassCard>
          ) : (
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                Permissions
              </Label>
              <PermissionPicker
                catalog={catalog}
                scope={form.scope}
                value={form.permissions}
                onChange={(next) => setForm({ ...form, permissions: next })}
                disabled={readOnly}
                isSuperAdminContext={isSuperAdmin}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <GradientButton type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Create role"}
              </GradientButton>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Empty + skeleton states
 * ────────────────────────────────────────────────────────── */
function EmptyRoleState({ scope }) {
  return (
    <GlassCard className="p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-full glass border border-white/10 flex items-center justify-center mb-3">
        <Shield className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">No {scope} roles yet</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {scope === "platform"
          ? "Create your first platform role with the button above."
          : "Tenant roles are seeded from the codebase. Check your initRoles seeder."}
      </p>
    </GlassCard>
  );
}

function RoleGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <GlassCard key={i} className="p-5 h-40 animate-pulse">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="h-3 w-48 bg-white/5 rounded mt-3" />
          <div className="h-3 w-40 bg-white/5 rounded mt-2" />
        </GlassCard>
      ))}
    </div>
  );
}
