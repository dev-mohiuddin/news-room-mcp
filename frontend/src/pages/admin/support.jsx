import { useMemo, useState } from "react";
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useDebounce from "@/hooks/useDebounce";
import { dateFormater } from "@/lib/utils";
import { MOCK_TICKETS } from "@/lib/mockData";

const PRIORITY_STYLES = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};
const STATUS_STYLES = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  closed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function AdminSupportPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTicket, setActiveTicket] = useState(null);

  const debounced = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return MOCK_TICKETS.filter((t) => {
      const matchesSearch =
        !debounced ||
        t.subject.toLowerCase().includes(debounced.toLowerCase()) ||
        t.user.toLowerCase().includes(debounced.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [debounced, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const open = MOCK_TICKETS.filter((t) => t.status === "open").length;
    const pending = MOCK_TICKETS.filter((t) => t.status === "pending").length;
    const closed = MOCK_TICKETS.filter((t) => t.status === "closed").length;
    return { open, pending, closed, total: MOCK_TICKETS.length };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Help desk"
        title="Support tickets"
        subtitle="Triage user requests, reply, and close threads."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={LifeBuoy} label="All tickets" value={stats.total} />
        <KPICard icon={AlertCircle} label="Open" value={stats.open} glow="violet" />
        <KPICard icon={Clock} label="Pending reply" value={stats.pending} />
        <KPICard icon={CheckCircle2} label="Closed" value={stats.closed} glow="teal" />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search subject or email…"
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

      <DataTable
        data={filtered}
        onRowClick={(t) => setActiveTicket(t)}
        columns={[
          {
            key: "subject",
            header: "Subject",
            sortable: true,
            render: (t) => (
              <div className="min-w-0">
                <p className="font-medium truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{t.user}</p>
              </div>
            ),
          },
          {
            key: "priority",
            header: "Priority",
            render: (t) => (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                  PRIORITY_STYLES[t.priority]
                }`}
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
                className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                  STATUS_STYLES[t.status]
                }`}
              >
                {t.status}
              </span>
            ),
          },
          {
            key: "updatedAt",
            header: "Updated",
            sortable: true,
            render: (t) => (
              <span className="text-xs text-muted-foreground">
                {dateFormater(t.updatedAt, "MMM d, HH:mm")}
              </span>
            ),
          },
        ]}
      />

      <TicketDialog
        ticket={activeTicket}
        onClose={() => setActiveTicket(null)}
      />
    </div>
  );
}

function TicketDialog({ ticket, onClose }) {
  if (!ticket) return null;
  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border border-white/10 max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle>{ticket.subject}</DialogTitle>
            <span
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                PRIORITY_STYLES[ticket.priority]
              }`}
            >
              {ticket.priority}
            </span>
            <span
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                STATUS_STYLES[ticket.status]
              }`}
            >
              {ticket.status}
            </span>
          </div>
          <DialogDescription>
            From {ticket.user} · {dateFormater(ticket.updatedAt, "MMM d, yyyy HH:mm")}
          </DialogDescription>
        </DialogHeader>

        {/* Mock thread */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          <Message
            from={ticket.user}
            time={ticket.updatedAt}
            body="Hey team, I'm running into an issue when I try to test my CMS connection. The button just spins and never returns. Could you take a look?"
          />
          <Message
            isAdmin
            from="Admin"
            time={ticket.updatedAt}
            body="Thanks for the report — I can see the failed request in our logs. Could you confirm which CMS platform you connected, and the URL of your site?"
          />
        </div>

        {/* Reply box */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <Textarea placeholder="Reply to this ticket…" rows={3} />
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm">
              Mark as pending
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Close ticket
              </Button>
              <Button size="sm">
                <Send className="h-4 w-4" /> Send reply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Message({ from, time, body, isAdmin = false }) {
  return (
    <div
      className={`p-3 rounded-lg glass border ${
        isAdmin ? "border-blue-500/20 bg-blue-500/5" : "border-white/5"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold ${
            isAdmin ? "text-brand-blue" : ""
          }`}
        >
          {from}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {dateFormater(time, "MMM d, HH:mm")}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{body}</p>
    </div>
  );
}
