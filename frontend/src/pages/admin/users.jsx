import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Eye,
  MoreHorizontal,
  Download,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import PlanBadge from "@/components/shared/PlanBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

import { dateFormater } from "@/lib/utils";
import useDebounce from "@/hooks/useDebounce";
import { MOCK_USERS } from "@/lib/mockData";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [users, setUsers] = useState(MOCK_USERS);

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !debouncedSearch ||
        u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesPlan = planFilter === "all" || u.plan === planFilter;
      const matchesStatus =
        statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [users, debouncedSearch, planFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const suspended = users.filter((u) => u.status === "suspended").length;
    const paying = users.filter((u) => u.plan !== "free").length;
    return { total, active, suspended, paying };
  }, [users]);

  const toggleStatus = (id) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "suspended" : "active" }
          : u
      )
    );
  };

  const columns = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-semibold">
            {u.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      render: (u) => <PlanBadge plan={u.plan} />,
    },
    {
      key: "articles",
      header: "Articles",
      sortable: true,
      render: (u) => <span className="text-sm tabular-nums">{u.articles}</span>,
    },
    {
      key: "mrr",
      header: "MRR",
      sortable: true,
      render: (u) => <span className="tabular-nums">${u.mrr}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={u.status === "active"}
            onCheckedChange={() => toggleStatus(u.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <span
            className={`text-xs ${
              u.status === "active" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {u.status}
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
                navigate(`/admin/users/${u.id}`);
              }}
            >
              <Eye className="h-3.5 w-3.5" /> View detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              Change plan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget(u);
              }}
            >
              {u.status === "active" ? "Suspend" : "Activate"} account
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
        title="Tenants"
        subtitle="View, filter, and manage every workspace on the platform."
        actions={
          <Button variant="glass">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total users" value={stats.total} />
        <KPICard
          icon={UserCheck}
          label="Active"
          value={stats.active}
          glow="teal"
        />
        <KPICard
          icon={UserX}
          label="Suspended"
          value={stats.suspended}
          glow="violet"
        />
        <KPICard
          icon={CreditCard}
          label="Paying customers"
          value={stats.paying}
        />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        onReset={() => {
          setSearch("");
          setPlanFilter("all");
          setStatusFilter("all");
        }}
      >
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
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
        data={filtered}
        pageSize={10}
        onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
        emptyTitle="No users match your filters"
        emptyDescription="Try resetting filters or searching with a different term."
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`${
          confirmTarget?.status === "active" ? "Suspend" : "Activate"
        } ${confirmTarget?.name}?`}
        description={
          confirmTarget?.status === "active"
            ? "The user will lose access to their workspace immediately."
            : "The user will regain access to their workspace."
        }
        confirmLabel={confirmTarget?.status === "active" ? "Suspend" : "Activate"}
        destructive={confirmTarget?.status === "active"}
        onConfirm={() => {
          if (confirmTarget) toggleStatus(confirmTarget.id);
          setConfirmTarget(null);
        }}
      />
    </div>
  );
}
