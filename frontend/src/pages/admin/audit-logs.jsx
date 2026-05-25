import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Activity, Download } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fetchAuditLogs } from "@/redux/slice/admin-slice";
import useDebounce from "@/hooks/useDebounce";
import { dateFormater } from "@/lib/utils";

const STATUS_STYLES = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

const CATEGORY_FILTERS = [
  "all",
  "auth",
  "user",
  "role",
  "team",
  "billing",
  "content",
  "system",
];

export default function AdminAuditLogsPage() {
  const dispatch = useDispatch();
  const { logs, logsPagination, isLoading } = useSelector((s) => s.admin);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const debounced = useDebounce(search, 300);

  useEffect(() => {
    dispatch(
      fetchAuditLogs({
        page,
        perPage: 20,
        search: debounced,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
      })
    );
  }, [dispatch, page, debounced, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Audit logs"
        subtitle="Every privileged action — who did what, when, and from where."
        actions={
          <Button variant="glass">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search action or actor email…"
        onReset={() => {
          setSearch("");
          setStatusFilter("all");
          setCategoryFilter("all");
        }}
      >
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Timeline */}
      <GlassCard className="p-2 md:p-4">
        <ul className="relative">
          <span className="absolute left-[26px] top-2 bottom-2 w-px gradient-bg opacity-20" />
          {isLoading && logs.length === 0 ? (
            <LogsSkeleton />
          ) : logs.length === 0 ? (
            <li className="text-center py-12 text-sm text-muted-foreground">
              No logs match the current filters.
            </li>
          ) : (
            logs.map((log) => (
              <li
                key={log._id}
                className="relative flex gap-4 p-3 rounded-lg hover:bg-white/2 transition-colors"
              >
                <span className="shrink-0 h-9 w-9 rounded-lg gradient-bg flex items-center justify-center z-10 mt-1">
                  <Activity className="h-4 w-4 text-white" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs px-2 py-0.5 rounded glass border border-white/10 text-foreground font-mono">
                      {log.action}
                    </code>
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        STATUS_STYLES[log.status] || STATUS_STYLES.success
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">
                      {log.category}
                    </span>
                  </div>
                  {(log.entityType || log.entityId) && (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Target:</span>{" "}
                      <span className="font-medium">
                        {log.entityType}
                        {log.entityId ? ` · ${log.entityId.slice(-6)}` : ""}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.actorEmail || (
                      <span className="text-brand-violet">System</span>
                    )}{" "}
                    · {dateFormater(log.createdAt, "MMM d, yyyy HH:mm")}
                    {log.ip ? ` · IP ${log.ip}` : ""}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </GlassCard>

      {logsPagination && logsPagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={logsPagination.page <= 1}
            onClick={() => setPage(logsPagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-2">
            Page {logsPagination.page} of {logsPagination.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={logsPagination.page >= logsPagination.totalPages}
            onClick={() => setPage(logsPagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function LogsSkeleton() {
  return Array.from({ length: 4 }).map((_, i) => (
    <li key={i} className="p-3 animate-pulse">
      <div className="flex gap-4">
        <div className="h-9 w-9 rounded-lg bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 bg-white/5 rounded" />
          <div className="h-2 w-64 bg-white/5 rounded" />
        </div>
      </div>
    </li>
  ));
}
