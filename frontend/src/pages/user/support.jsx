import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
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
import { fadeUp } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { USER_FAQS } from "@/lib/mockData";
import {
  fetchMyTickets,
  fetchMyTicketStats,
  fetchMyTicket,
  createTicket,
  replyToMyTicket,
  tenantChangeStatus,
  clearCurrentTicket,
} from "@/redux/slice/support-slice";
import TicketThread, {
  STATUS_STYLES,
  PRIORITY_STYLES,
} from "@/components/support/TicketThread";

export default function UserSupportPage() {
  const dispatch = useDispatch();
  const tickets = useSelector((s) => s.support.myTickets);
  const stats = useSelector((s) => s.support.myStats);
  const current = useSelector((s) => s.support.current);
  const isLoading = useSelector((s) => s.support.isLoading);
  const isMutating = useSelector((s) => s.support.isMutating);

  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    dispatch(fetchMyTickets({ perPage: 20 }));
    dispatch(fetchMyTicketStats());
  }, [dispatch]);

  useEffect(() => {
    if (activeId) dispatch(fetchMyTicket(activeId));
    else dispatch(clearCurrentTicket());
  }, [activeId, dispatch]);

  const handleCreate = async ({ subject, priority, body }) => {
    const res = await dispatch(createTicket({ subject, priority, body }));
    if (createTicket.fulfilled.match(res)) {
      toast.success("Ticket submitted — we'll respond within 24 hours.");
      setCreateOpen(false);
      dispatch(fetchMyTicketStats());
      dispatch(fetchMyTickets({ perPage: 20 }));
      const newId = res.payload?.data?._id;
      if (newId) setActiveId(newId);
    } else {
      toast.error(res.payload || "Could not submit ticket");
    }
  };

  const handleReply = async (body) => {
    if (!activeId) return;
    const res = await dispatch(replyToMyTicket({ id: activeId, body }));
    if (!replyToMyTicket.fulfilled.match(res)) {
      toast.error(res.payload || "Could not reply");
    } else {
      dispatch(fetchMyTicketStats());
    }
  };

  const handleStatus = async (status) => {
    if (!activeId) return;
    const res = await dispatch(tenantChangeStatus({ id: activeId, status }));
    if (tenantChangeStatus.fulfilled.match(res)) {
      toast.success(`Marked as ${status}`);
      dispatch(fetchMyTicketStats());
    } else {
      toast.error(res.payload || "Could not update status");
    }
  };

  // ── If a ticket is active, render the thread view in place
  if (activeId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Help"
          title="Ticket"
          subtitle="Conversation with our support team."
        />
        <TicketThread
          ticket={current}
          variant="user"
          onBack={() => setActiveId(null)}
          onReply={handleReply}
          onChangeStatus={handleStatus}
          isMutating={isMutating}
        />
      </div>
    );
  }

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
          value={stats.resolved + stats.closed}
          glow="teal"
        />
      </div>

      {/* My tickets */}
      <section>
        <h2 className="font-display text-xl mb-3">My tickets</h2>
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
                render: (t) => (
                  <span className="font-medium truncate">{t.subject}</span>
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
                key: "repliesCount",
                header: "Replies",
                render: (t) => (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {t.repliesCount || 0}
                  </span>
                ),
              },
              {
                key: "lastReplyAt",
                header: "Updated",
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
            emptyTitle="No tickets yet"
            emptyDescription="You haven't submitted any support tickets."
          />
        )}
      </section>

      {/* FAQ */}
      <section>
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <h2 className="font-display text-xl mb-1">
            Frequently asked questions
          </h2>
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

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        isMutating={isMutating}
      />
    </div>
  );
}

function CreateTicketDialog({ open, onOpenChange, onCreate, isMutating }) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [body, setBody] = useState("");

  const reset = () => {
    setSubject("");
    setPriority("medium");
    setBody("");
  };

  const submit = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    onCreate({ subject: subject.trim(), priority, body: body.trim() });
    reset();
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
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Subject
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5"
              placeholder="Brief summary of the issue"
              maxLength={200}
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Priority
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mt-1.5"
              placeholder="Describe what happened, steps to reproduce, and what you expected…"
              maxLength={5000}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {body.length} / 5000
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <GradientButton
            size="sm"
            onClick={submit}
            disabled={isMutating || !subject.trim() || !body.trim()}
          >
            <Send className="h-4 w-4" /> Submit ticket
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
