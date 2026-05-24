import { useState } from "react";
import {
  LifeBuoy,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { MY_TICKETS, USER_FAQS } from "@/lib/mockData";

const STATUS_STYLES = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  closed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};
const PRIORITY_STYLES = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export default function UserSupportPage() {
  const [tickets, setTickets] = useState(MY_TICKETS);
  const [createOpen, setCreateOpen] = useState(false);

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  const handleCreate = (subject, priority, body) => {
    const item = {
      id: `mt${tickets.length + 1}`,
      subject,
      priority,
      status: "open",
      updatedAt: new Date().toISOString(),
      lastReply: null,
      replies: 0,
    };
    setTickets((prev) => [item, ...prev]);
    setCreateOpen(false);
    toast.success("Ticket submitted — we'll respond within 24 hours.");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Help"
        title="Support"
        subtitle="Submit a ticket or browse frequently asked questions."
        actions={
          <GradientButton size="md" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </GradientButton>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard icon={AlertCircle} label="Open" value={stats.open} glow="violet" />
        <KPICard icon={Clock} label="Pending reply" value={stats.pending} />
        <KPICard icon={CheckCircle2} label="Resolved" value={stats.closed} glow="teal" />
      </div>

      {/* My tickets */}
      <section>
        <h2 className="font-display text-xl mb-3">My tickets</h2>
        <DataTable
          data={tickets}
          columns={[
            {
              key: "subject",
              header: "Subject",
              render: (t) => <span className="font-medium">{t.subject}</span>,
            },
            {
              key: "priority",
              header: "Priority",
              render: (t) => (
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[t.priority]}`}>
                  {t.priority}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (t) => (
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[t.status]}`}>
                  {t.status}
                </span>
              ),
            },
            {
              key: "replies",
              header: "Replies",
              render: (t) => (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> {t.replies}
                </span>
              ),
            },
            {
              key: "updatedAt",
              header: "Updated",
              render: (t) => (
                <span className="text-xs text-muted-foreground">
                  {dateFormater(t.updatedAt, "MMM d, HH:mm")}
                </span>
              ),
            },
          ]}
          emptyTitle="No tickets yet"
          emptyDescription="You haven't submitted any support tickets."
        />
      </section>

      {/* FAQ */}
      <section>
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <h2 className="font-display text-xl mb-1">Frequently asked questions</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Quick answers to common questions.
          </p>
        </motion.div>

        <GlassCard className="p-3 md:p-5">
          <Accordion type="single" collapsible className="w-full">
            {USER_FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="px-2">
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </section>

      {/* Create ticket dialog */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}

function CreateTicketDialog({ open, onOpenChange, onCreate }) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [body, setBody] = useState("");

  const reset = () => {
    setSubject("");
    setPriority("medium");
    setBody("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="glass border border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and we'll get back to you within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" placeholder="Brief summary of the issue" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Description</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="mt-1.5" placeholder="Describe what happened, steps to reproduce, and what you expected…" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <GradientButton
            size="sm"
            onClick={() => onCreate(subject || "Untitled", priority, body)}
            disabled={!subject.trim()}
          >
            <Send className="h-4 w-4" /> Submit ticket
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
