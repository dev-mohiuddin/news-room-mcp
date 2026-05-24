import { useState } from "react";
import {
  Users,
  UserPlus,
  Send,
  MoreHorizontal,
  Crown,
  Edit,
  Trash2,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { MY_TEAM_MEMBERS, PENDING_INVITES } from "@/lib/mockData";

const ROLE_COLORS = {
  owner: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  editor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  writer: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  viewer: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export default function TeamPage() {
  const [members, setMembers] = useState(MY_TEAM_MEMBERS);
  const [invites, setInvites] = useState(PENDING_INVITES);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const changeRole = (id, role) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    toast.success("Role updated");
  };

  const removeMember = () => {
    if (removeTarget) {
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      toast.success("Member removed");
    }
    setRemoveTarget(null);
  };

  const handleInvite = (email, role) => {
    setInvites((prev) => [
      { id: `inv${prev.length + 1}`, email, role, sentAt: new Date().toISOString() },
      ...prev,
    ]);
    setInviteOpen(false);
    toast.success(`Invitation sent to ${email}`);
  };

  const cancelInvite = (id) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
    toast.success("Invitation cancelled");
  };

  const resendInvite = (id) => {
    setInvites((prev) =>
      prev.map((i) => (i.id === id ? { ...i, sentAt: new Date().toISOString() } : i))
    );
    toast.success("Invitation resent");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collaboration"
        title="Team"
        subtitle="Invite editors, writers, and reviewers to your workspace."
        actions={
          <GradientButton size="md" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite member
          </GradientButton>
        }
      />

      {/* Members */}
      <section>
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-violet" /> Members ({members.length})
        </h2>

        <motion.div
          variants={staggerContainer(0.05)}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {members.map((m) => (
            <motion.div key={m.id} variants={staggerItem}>
              <GlassCard className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>

                <span className="hidden md:inline text-xs text-muted-foreground tabular-nums">
                  {m.articles} articles
                </span>

                <span className="hidden md:inline text-xs text-muted-foreground">
                  Joined {dateFormater(m.joinedAt, "MMM yyyy")}
                </span>

                {m.role === "owner" ? (
                  <Badge variant="outline" className={ROLE_COLORS.owner + " border"}>
                    Owner
                  </Badge>
                ) : (
                  <Select
                    value={m.role}
                    onValueChange={(v) => changeRole(m.id, v)}
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
                )}

                {m.role !== "owner" && (
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
          ))}
        </motion.div>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" /> Pending invitations ({invites.length})
          </h2>

          <div className="space-y-2">
            {invites.map((inv) => (
              <GlassCard key={inv.id} className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted-foreground text-sm shrink-0">
                  <Send className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as <span className="capitalize">{inv.role}</span> · Sent{" "}
                    {dateFormater(inv.sentAt, "MMM d, HH:mm")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => resendInvite(inv.id)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Resend
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => cancelInvite(inv.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Role permissions info */}
      <GlassCard className="p-6">
        <h3 className="font-display text-lg mb-4">Role permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { role: "Owner", perms: "Full access — billing, settings, CMS, team" },
            { role: "Editor", perms: "Create, publish, manage all articles" },
            { role: "Writer", perms: "Create & edit own articles, submit for review" },
            { role: "Viewer", perms: "Read-only — view articles and analytics" },
          ].map((r) => (
            <div key={r.role} className="p-3 rounded-lg glass border border-white/5">
              <Badge variant="outline" className={ROLE_COLORS[r.role.toLowerCase()] + " border mb-2"}>
                {r.role}
              </Badge>
              <p className="text-xs text-muted-foreground">{r.perms}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Invite dialog */}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={handleInvite} />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={`Remove ${removeTarget?.name}?`}
        description="They will lose access to this workspace immediately."
        confirmLabel="Remove"
        destructive
        onConfirm={removeMember}
      />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onInvite }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("writer");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setEmail(""); setRole("writer"); } onOpenChange(o); }}>
      <DialogContent className="glass border border-white/10">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            They'll receive an email invitation to join your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="colleague@company.com" type="email" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="writer">Writer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <GradientButton size="sm" onClick={() => onInvite(email, role)} disabled={!email.trim()}>
            <Send className="h-4 w-4" /> Send invitation
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
