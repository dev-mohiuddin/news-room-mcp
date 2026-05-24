import { useMemo, useState } from "react";
import { Download, Activity } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import GlassCard from "@/components/shared/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import useDebounce from "@/hooks/useDebounce";
import { dateFormater } from "@/lib/utils";
import { MOCK_AUDIT_LOGS } from "@/lib/mockData";

const STATUS_STYLES = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");

  const debounced = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((l) => {
      const matchesSearch =
        !debounced ||
        l.action.toLowerCase().includes(debounced.toLowerCase()) ||
        l.target.toLowerCase().includes(debounced.toLowerCase()) ||
        l.actor.toLowerCase().includes(debounced.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesActor =
        actorFilter === "all" ||
        (actorFilter === "system" && l.actor === "system") ||
        (actorFilter === "admin" && l.actor !== "system");
      return matchesSearch && matchesStatus && matchesActor;
    });
  }, [debounced, statusFilter, actorFilter]);

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
        searchPlaceholder="Search action, actor, or target…"
        onReset={() => {
          setSearch("");
          setStatusFilter("all");
          setActorFilter("all");
        }}
      >
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

        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Timeline */}
      <GlassCard className="p-2 md:p-4">
        <ul className="relative">
          <span className="absolute left-[26px] top-2 bottom-2 w-px gradient-bg opacity-20" />
          {filtered.length === 0 ? (
            <li className="text-center py-12 text-sm text-muted-foreground">
              No logs match the current filters.
            </li>
          ) : (
            filtered.map((log) => (
              <li
                key={log.id}
                className="relative flex gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
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
                        STATUS_STYLES[log.status]
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Target:</span>{" "}
                    <span className="font-medium">{log.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.actor === "system" ? (
                      <span className="text-brand-violet">System</span>
                    ) : (
                      log.actor
                    )}{" "}
                    · {dateFormater(log.time, "MMM d, yyyy HH:mm")} · IP{" "}
                    {log.ip}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </GlassCard>
    </div>
  );
}
