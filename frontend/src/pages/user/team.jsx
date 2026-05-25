import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Send,
  MoreHorizontal,
  Crown,
  Trash2,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import Can from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  fetchTeam,
  inviteMember,
  resendInvite,
  cancelInvite,
  changeMemberRole,
  removeMember,
} from "@/redux/slice/team-slice";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

const ROLE_COLORS = {
  workspace_owner: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  editor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  writer: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  viewer: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const ROLE_LABEL = {
  workspace_owner: "Owner",
  editor: "Editor",
  writer: "Writer",
  viewer: "Viewer",
};

export default function TeamPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);
  const { members, invites, isLoading } = useSelector((s) => s.team);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const canManage = hasPermission(currentUser, "tenant.team:manage");

  useEffect(() => {
    dispatch(fetchTeam());
  }, [dispatch]);

  const onChangeRole = async (id, roleName) => {
    try {
      await dispatch(changeMemberRole({ id, roleName })).unwrap();
      toast.success("Role updated");
    } catch (err) {
      toast.error(err || "Could not change role");
    }
  };

  const onRemove = async () => {
    if (!removeTarget) return;
    try {
      await dispatch(removeMember(removeTarget._id)).unwrap();
      toast.success(`${removeTarget.name} removed`);
    } catch (err) {
      toast.error(err || "Could not remove member");
    } finally {
      setRemoveTarget(null);
    }
  };

  const onInvite = async (email, roleName) => {
    try {
      const res = await dispatch(inviteMember({ email, roleName })).unwrap();
      toast.success(`Invitation sent to ${email}`);
      // In dev backend returns the URL — useful for testing without SMTP
      const url = res?.data?.inviteUrl;
      if (url) {
        toast.info("Dev: invite link copied", {
          description: url,
          duration: 8000,
        });
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* ignore */
        }
      }
      setInviteOpen(false);
    } catch (err) {
      toast.error(err || "Could not send invitation");
    }
  };

  const onResend = async (id) => {
    try {
      await dispatch(resendInvite(id)).unwrap();
      toast.success("Invitation resent");
    } catch (err) {
      toast.error(err || "Could not resend");
    }
  };

  const onCancel = async (id) => {
    try {
      await dispatch(cancelInvite(id)).unwrap();
      toast.success("Invitation cancelled");
    } catch (err) {
      toast.error(err || "Could not cancel");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collaboration"
        title="Team"
        subtitle="Invite editors, writers, and reviewers to your workspace."
        actions={
          <Can perm="tenant.team:manage">
            <GradientButton size="md" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite member
            </GradientButton>
          </Can>
        }
      />

      {/* Members */}
      <section>
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-violet" /> Members ({members.length})
        </h2>

        {isLoading && members.length === 0 ? (
          <MembersSkeleton />
        ) : (
          <motion.div
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {members.map((m) => {
              const isOwner = m.roleId?.name === "workspace_owner";
              const isSelf = m._id === currentUser?.id;
              return (
                <motion.div key={m._id} variants={staggerItem}>
                  <GlassCard className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {m.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        {isOwner && (
                          <Crown className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        {isSelf && (
                          <Badge variant="outline" className="text-[9px] tracking-widest">
                            YOU
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.email}
                      </p>
                    </div>

                    <span className="hidden md:inline text-xs text-muted-foreground">
                      Joined {dateFormater(m.createdAt, "MMM yyyy")}
                    </span>

                    {isOwner ? (
                      <Badge
                        variant="outline"
                        className={ROLE_COLORS.workspace_owner + " border"}
                      >
                        Owner
                      </Badge>
                    ) : canManage && !isSelf ? (
                      <Select
                        value={m.roleId?.name}
                        onValueChange={(v) => onChangeRole(m._id, v)}
                      >
                        <SelectTrigger className="h-8 w-[110px] text-xs bg-transparent border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="writer">Writer</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          (ROLE_COLORS[m.roleId?.name] || "") + " border capitalize"
                        }
                      >
                        {ROLE_LABEL[m.roleId?.name] || m.roleId?.name}
                      </Badge>
                    )}

                    {canManage && !isOwner && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRemoveTarget(m)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" /> Pending invitations ({invites.length})
          </h2>

          <div className="space-y-2">
            {invites.map((inv) => (
              <GlassCard key={inv._id} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="h-10 w-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted-foreground text-sm shrink-0">
                  <Send className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as{" "}
                    <span className="capitalize">
                      {inv.roleId?.displayName || inv.roleId?.name}
                    </span>{" "}
                    · Sent{" "}
                    {dateFormater(inv.createdAt, "MMM d, HH:mm")}
                  </p>
                </div>
                <Can perm="tenant.team:manage">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResend(inv._id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onCancel(inv._id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Can>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Role permissions reference */}
      <GlassCard className="p-6">
        <h3 className="font-display text-lg mb-4">Role permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            ["Owner", "workspace_owner", "Full access — billing, settings, CMS, team"],
            ["Editor", "editor", "Approve & publish articles, manage brand & templates"],
            ["Writer", "writer", "Create & edit own articles, use research/SEO"],
            ["Viewer", "viewer", "Read-only — view articles and analytics"],
          ].map(([role, key, perms]) => (
            <div key={key} className="p-3 rounded-lg glass border border-white/5">
              <Badge
                variant="outline"
                className={(ROLE_COLORS[key] || "") + " border mb-2"}
              >
                {role}
              </Badge>
              <p className="text-xs text-muted-foreground">{perms}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Invite dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={onInvite}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={`Remove ${removeTarget?.name}?`}
        description="They will lose access to this workspace immediately."
        confirmLabel="Remove"
        destructive
        onConfirm={onRemove}
      />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onInvite }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("writer");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await onInvite(email.trim(), role);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setEmail("");
          setRole("writer");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            They'll receive an email invitation to join your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Email address
            </Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              placeholder="colleague@company.com"
              type="email"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="writer">Writer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <GradientButton size="sm" onClick={submit} disabled={!email.trim() || busy}>
            <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send invitation"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <GlassCard key={i} className="p-4 h-16 animate-pulse" />
      ))}
    </div>
  );
}
