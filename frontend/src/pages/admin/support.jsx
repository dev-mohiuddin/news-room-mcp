import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import GlassCard from "@/components/shared/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDebounce from "@/hooks/useDebounce";
import { dateFormater } from "@/lib/utils";
import {
  fetchAdminTickets,
  fetchAdminStats,
  fetchAdminTicket,
  replyAsStaff,
  adminChangeStatus,
  adminChangePriority,
  clearCurrentTicket,
} from "@/redux/slice/support-slice";
import TicketThread, {
  STATUS_STYLES,
  PRIORITY_STYLES,
} from "@/components/support/TicketThread";

export default function AdminSupportPage() {
  const dispatch = useDispatch();
  const tickets = useSelector((s) => s.support.adminTickets);
  const stats = useSelector((s) => s.support.adminStats);
  const current = useSelector((s) => s.support.adminCurrent);
  const isLoading = useSelector((s) => s.support.isLoading);
  const isMutating = useSelector((s) => s.support.isMutating);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeId, setActiveId] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const params = { perPage: 30 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter !== "all") params.status = statusFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;
    dispatch(fetchAdminTickets(params));
  }, [dispatch, debouncedSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  useEffect(() => {
    if (activeId) dispatch(fetchAdminTicket(activeId));
    else dispatch(clearCurrentTicket());
  }, [activeId, dispatch]);

  const refreshAfterMutation = () => {
    dispatch(fetchAdminStats());
  };

  const handleReply = async (body) => {
    if (!activeId) return;
    const res = await dispatch(replyAsStaff({ id: activeId, body }));
    if (replyAsStaff.fulfilled.match(res)) {
      toast.success("Reply sent");
      refreshAfterMutation();
    } else {
      toast.error(res.payload || "Could not reply");
    }
  };

  const handleStatus = async (status) => {
    if (!activeId) return;
    const res = await dispatch(adminChangeStatus({ id: activeId, status }));
    if (adminChangeStatus.fulfilled.match(res)) {
      toast.success(`Marked as ${status}`);
      refreshAfterMutation();
    } else {
      toast.error(res.payload || "Could not update status");
    }
  };

  const handlePriority = async (priority) => {
    if (!activeId) return;
    const res = await dispatch(
      adminChangePriority({ id: activeId, priority })
    );
    if (adminChangePriority.fulfilled.match(res)) {
      toast.success(`Priority set to ${priority}`);
    } else {
      toast.error(res.payload || "Could not update priority");
    }
  };

  // Thread mode
  if (activeId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Help desk"
          title="Ticket"
          subtitle="Reply, change priority, resolve, or close."
        />
        <TicketThread
          ticket={current}
          variant="admin"
          onBack={() => setActiveId(null)}
          onReply={handleReply}
          onChangeStatus={handleStatus}
          onChangePriority={handlePriority}
          isMutating={isMutating}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Help desk"
        title="Support tickets"
        subtitle="Triage user requests, reply, and close threads."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={LifeBuoy} label="All tickets" value={stats.total} />
        <KPICard
          icon={AlertCircle}
          label="Open"
          value={stats.open}
          glow="violet"
        />
        <KPICard icon={Clock} label="Pending reply" value={stats.pending} />
        <KPICard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.resolved}
          glow="teal"
        />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search subject, body, or customer email…"
        onReset={() => {
          setSearch("");
          setStatusFilter("all");
          setPriorityFilter("all");
        }}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading && tickets.length === 0 ? (
        <GlassCard className="p-12 text-center text-sm text-muted-foreground">
          Loading…
        </GlassCard>
      ) : (
        <DataTable
          data={tickets}
          onRowClick={(t) => setActiveId(t._id)}
          columns={[
            {
              key: "subject",
              header: "Subject",
              sortable: true,
              render: (t) => (
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.customerName || t.createdBy?.name || "—"}
                    {t.customerEmail || t.createdBy?.email
                      ? ` · ${t.customerEmail || t.createdBy?.email}`
                      : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "workspace",
              header: "Workspace",
              render: (t) => (
                <span className="text-xs">
                  {t.workspace?.name || "—"}
                </span>
              ),
            },
            {
              key: "priority",
              header: "Priority",
              render: (t) => (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[t.priority]}`}
                >
                  {t.priority}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (t) => (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[t.status]}`}
                >
                  {t.status}
                </span>
              ),
            },
            {
              key: "lastReplyAt",
              header: "Updated",
              sortable: true,
              render: (t) => (
                <span className="text-xs text-muted-foreground">
                  {dateFormater(
                    t.lastReplyAt || t.updatedAt,
                    "MMM d, HH:mm"
                  )}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
