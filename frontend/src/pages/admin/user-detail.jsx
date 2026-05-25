import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Calendar,
  Activity,
  ShieldX,
  ShieldCheck,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import KPICard from "@/components/shared/KPICard";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  fetchUserById,
  setUserStatus,
  changeUserRole,
  removeUser,
} from "@/redux/slice/admin-slice";
import { fetchRoles } from "@/redux/slice/role-slice";
import { dateFormater } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const currentUser = useSelector((s) => s.auth.user);
  const user = useSelector((s) => s.admin.currentUser);
  const { list: roles } = useSelector((s) => s.role);

  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchUserById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (roles.length === 0) dispatch(fetchRoles({ perPage: 100 }));
  }, [dispatch, roles.length]);

  if (!user) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/users")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Button>
        <GlassCard className="p-8 animate-pulse">
          <div className="h-20 w-20 rounded-2xl bg-white/5" />
          <div className="h-4 w-40 bg-white/5 rounded mt-4" />
          <div className="h-3 w-56 bg-white/5 rounded mt-2" />
        </GlassCard>
      </div>
    );
  }

  const isSelf = user._id === currentUser?.id;
  const userScope = user.roleId?.scope;
  const sameScopeRoles = roles.filter((r) => r.scope === userScope);

  const onChangeRole = async (roleId) => {
    try {
      await dispatch(changeUserRole({ id: user._id, roleId })).unwrap();
      toast.success(`Role updated for ${user.name}`);
    } catch (err) {
      toast.error(err || "Could not change role");
    }
  };

  const onToggleStatus = async () => {
    try {
      await dispatch(
        setUserStatus({ id: user._id, isActive: !user.isActive })
      ).unwrap();
      toast.success(
        `${user.name} ${!user.isActive ? "activated" : "suspended"}`
      );
      setConfirmStatus(false);
    } catch (err) {
      toast.error(err || "Could not update status");
    }
  };

  const onDelete = async () => {
    try {
      await dispatch(removeUser(user._id)).unwrap();
      toast.success(`${user.name} deleted`);
      navigate("/admin/users");
    } catch (err) {
      toast.error(err || "Could not delete user");
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin/users")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Button>

      {isSelf && (
        <GlassCard className="p-3 px-4 flex items-center gap-2.5 border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <p className="text-sm">
            This is your own account. Some actions are disabled to prevent self-lockout.
          </p>
        </GlassCard>
      )}

      {/* Profile header */}
      <GlassCard className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-display shadow-[0_8px_30px_rgba(59,130,246,0.4)]">
            {user.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl">{user.name}</h1>
              <Badge variant="outline" className="text-xs capitalize">
                {user.roleId?.displayName || user.roleId?.name}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {user.roleId?.scope}
              </Badge>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  user.isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                {user.isActive ? "active" : "suspended"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Joined{" "}
              {dateFormater(user.createdAt, "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" size="sm">
              <KeyRound className="h-4 w-4" /> Reset password
            </Button>
            <Button
              variant={user.isActive ? "destructive" : "default"}
              size="sm"
              disabled={isSelf}
              onClick={() => setConfirmStatus(true)}
            >
              {user.isActive ? (
                <>
                  <ShieldX className="h-4 w-4" /> Suspend
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Activate
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isSelf}
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Activity}
          label="Last login"
          value={
            user.lastLoginAt
              ? dateFormater(user.lastLoginAt, "MMM d, HH:mm")
              : "Never"
          }
        />
        <KPICard
          icon={Calendar}
          label="Days active"
          value={Math.max(
            1,
            Math.round(
              (Date.now() - new Date(user.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )}
        />
        <KPICard
          icon={ShieldCheck}
          label="Verified"
          value={user.isVerified ? "Yes" : "No"}
        />
        <KPICard
          icon={Mail}
          label="Auth provider"
          value={user.authProvider || "local"}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="role">Role & permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <GlassCard className="p-6">
            <h3 className="font-display text-lg mb-4">Account details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ["User ID", user._id],
                ["Workspace", user.workspaceId || "—"],
                [
                  "Email verified",
                  user.isVerified ? "Yes" : "No, awaiting verification",
                ],
                ["Auth provider", user.authProvider || "local"],
                [
                  "Created",
                  dateFormater(user.createdAt, "MMM d, yyyy HH:mm"),
                ],
                [
                  "Updated",
                  dateFormater(user.updatedAt, "MMM d, yyyy HH:mm"),
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-white/5 pb-2"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium font-mono text-xs">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        </TabsContent>

        <TabsContent value="role" className="mt-4">
          <GlassCard className="p-6 space-y-5">
            <div>
              <h3 className="font-display text-lg">Assigned role</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a role within the same scope. Cross-scope changes (e.g.
                tenant → platform) are blocked at the API.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={user.roleId?._id}
                onValueChange={onChangeRole}
                disabled={isSelf}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sameScopeRoles.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      <span className="capitalize">{r.displayName}</span>{" "}
                      <span className="text-muted-foreground text-xs">
                        · {r.permissions.includes("*")
                          ? "all permissions"
                          : `${r.permissions.length} permissions`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs capitalize">
                Scope: {user.roleId?.scope}
              </Badge>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Granted permissions
              </p>
              {user.roleId?.permissions?.includes("*") ? (
                <Badge className="text-xs">All permissions (*)</Badge>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(user.roleId?.permissions || []).map((p) => (
                    <code
                      key={p}
                      className="text-[11px] font-mono px-2 py-0.5 rounded glass border border-white/10"
                    >
                      {p}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={`${user.isActive ? "Suspend" : "Activate"} ${user.name}?`}
        description={
          user.isActive
            ? "The user will lose access immediately."
            : "The user will regain access immediately."
        }
        destructive={user.isActive}
        confirmLabel={user.isActive ? "Suspend" : "Activate"}
        onConfirm={onToggleStatus}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${user.name}?`}
        description="This permanently removes the user account. The action cannot be undone."
        destructive
        confirmLabel="Delete user"
        onConfirm={onDelete}
      />
    </div>
  );
}
