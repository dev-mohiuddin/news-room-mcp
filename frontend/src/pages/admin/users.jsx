import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Users as UsersIcon,
  UserCheck,
  UserX,
  Shield,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import {
  fetchUsers,
  setUserStatus,
  removeUser,
  changeUserRole,
} from "@/redux/slice/admin-slice";
import { fetchRoles } from "@/redux/slice/role-slice";
import { dateFormater } from "@/lib/utils";
import useDebounce from "@/hooks/useDebounce";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);
  const { users, usersPagination, isLoading } = useSelector((s) => s.admin);
  const { list: roles } = useSelector((s) => s.role);

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  /* ── Load on mount + when filters change ── */
  useEffect(() => {
    dispatch(
      fetchUsers({
        page,
        perPage: 10,
        search: debouncedSearch,
        ...(scopeFilter !== "all" ? { scope: scopeFilter } : {}),
        ...(statusFilter !== "all"
          ? { isActive: statusFilter === "active" }
          : {}),
      })
    );
  }, [dispatch, page, debouncedSearch, scopeFilter, statusFilter]);

  useEffect(() => {
    if (roles.length === 0) dispatch(fetchRoles({ perPage: 100 }));
  }, [dispatch, roles.length]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const suspended = total - active;
    const platform = users.filter((u) => u.roleId?.scope === "platform").length;
    return { total, active, suspended, platform };
  }, [users]);

  const handleToggleStatus = async (user) => {
    try {
      await dispatch(
        setUserStatus({ id: user._id, isActive: !user.isActive })
      ).unwrap();
      toast.success(
        `${user.name} ${!user.isActive ? "activated" : "suspended"}`
      );
    } catch (err) {
      toast.error(err || "Could not update status");
    }
  };

  const handleRoleChange = async (user, roleId) => {
    try {
      await dispatch(changeUserRole({ id: user._id, roleId })).unwrap();
      toast.success(`Role updated for ${user.name}`);
    } catch (err) {
      toast.error(err || "Could not change role");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await dispatch(removeUser(confirmDelete._id)).unwrap();
      toast.success(`${confirmDelete.name} deleted`);
    } catch (err) {
      toast.error(err || "Could not delete user");
    } finally {
      setConfirmDelete(null);
    }
  };

  const columns = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-semibold">
            {u.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <RoleSelector
          user={u}
          roles={roles}
          isSelf={u._id === currentUser?.id}
          onChange={(roleId) => handleRoleChange(u, roleId)}
        />
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (u) => (
        <Badge variant="outline" className="text-xs capitalize">
          {u.roleId?.scope || "—"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={u.isActive}
            disabled={u._id === currentUser?.id}
            onCheckedChange={() => handleToggleStatus(u)}
            onClick={(e) => e.stopPropagation()}
          />
          <span
            className={`text-xs ${
              u.isActive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {u.isActive ? "active" : "suspended"}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (u) => (
        <span className="text-xs text-muted-foreground">
          {dateFormater(u.createdAt, "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cellClassName: "text-right",
      render: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/users/${u._id}`);
              }}
            >
              <Eye className="h-3.5 w-3.5" /> View detail
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={u._id === currentUser?.id}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget(u);
              }}
            >
              {u.isActive ? "Suspend" : "Activate"} account
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={u._id === currentUser?.id}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(u);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User management"
        title="All users"
        subtitle="Manage every account on the platform — roles, status, and access."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={UsersIcon} label="Total users" value={stats.total} />
        <KPICard icon={UserCheck} label="Active" value={stats.active} glow="teal" />
        <KPICard icon={UserX} label="Suspended" value={stats.suspended} glow="violet" />
        <KPICard icon={Shield} label="Platform admins" value={stats.platform} />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        onReset={() => {
          setSearch("");
          setScopeFilter("all");
          setStatusFilter("all");
        }}
      >
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
            <SelectItem value="tenant">Tenant</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading && users.length === 0}
        pageSize={10}
        onRowClick={(u) => navigate(`/admin/users/${u._id}`)}
        emptyTitle="No users match your filters"
        emptyDescription="Try resetting filters or searching with a different term."
      />

      {usersPagination && usersPagination.totalPages > 1 && (
        <Pagination
          page={usersPagination.page}
          totalPages={usersPagination.totalPages}
          onChange={setPage}
        />
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`${
          confirmTarget?.isActive ? "Suspend" : "Activate"
        } ${confirmTarget?.name}?`}
        description={
          confirmTarget?.isActive
            ? "The user will lose access to their workspace immediately."
            : "The user will regain access to their workspace."
        }
        confirmLabel={confirmTarget?.isActive ? "Suspend" : "Activate"}
        destructive={confirmTarget?.isActive}
        onConfirm={() => {
          if (confirmTarget) handleToggleStatus(confirmTarget);
          setConfirmTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name}?`}
        description="This will permanently remove the user. This action cannot be undone."
        confirmLabel="Delete user"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Inline role selector
 * ────────────────────────────────────────────────────────── */
function RoleSelector({ user, roles, isSelf, onChange }) {
  const userScope = user.roleId?.scope;
  const sameScopeRoles = roles.filter((r) => r.scope === userScope);

  if (isSelf || sameScopeRoles.length === 0) {
    return (
      <Badge variant="outline" className="text-xs capitalize">
        {user.roleId?.displayName || user.roleId?.name || "—"}
      </Badge>
    );
  }

  return (
    <Select
      value={user.roleId?._id}
      onValueChange={(v) => onChange(v)}
    >
      <SelectTrigger
        className="h-7 text-xs w-[150px] bg-transparent border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sameScopeRoles.map((r) => (
          <SelectItem key={r._id} value={r._id}>
            {r.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums px-2">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
