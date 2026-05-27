import { useEffect, useRef, useState } from "react";
import {
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  User as UserIcon,
  Settings as SettingsIcon,
  ArrowLeft,
} from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateFormater, cn } from "@/lib/utils";

export const STATUS_STYLES = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
export const PRIORITY_STYLES = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

/**
 * Self-contained ticket thread component used by both the user and admin
 * support pages. Receives the populated ticket + a set of action handlers;
 * doesn't talk to the API directly so it stays UI-only.
 */
export default function TicketThread({
  ticket,
  variant = "user", // "user" | "admin"
  onBack,
  onReply, // (body) => Promise
  onChangeStatus, // (newStatus) => Promise
  onChangePriority, // (priority) => Promise   (admin only)
  isMutating = false,
}) {
  const [body, setBody] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.replies?.length]);

  if (!ticket) {
    return (
      <GlassCard className="p-12 text-center text-sm text-muted-foreground">
        Loading ticket…
      </GlassCard>
    );
  }

  const closed = ticket.status === "closed";

  const handleSendReply = async () => {
    const text = body.trim();
    if (!text) return;
    await onReply?.(text);
    setBody("");
  };

  const headerEvents = buildThread(ticket);

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground -ml-2 mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            <h2 className="font-display text-xl truncate">{ticket.subject}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Opened {dateFormater(ticket.createdAt, "MMM d, yyyy HH:mm")}
              {variant === "admin" && ticket.workspace?.name && (
                <span className="ml-2">
                  ·{" "}
                  <span className="text-foreground">
                    {ticket.workspace.name}
                  </span>
                </span>
              )}
              {ticket.customerEmail && (
                <span className="ml-2">· {ticket.customerEmail}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-widest",
                STATUS_STYLES[ticket.status]
              )}
            >
              {ticket.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-widest",
                PRIORITY_STYLES[ticket.priority]
              )}
            >
              {ticket.priority}
            </Badge>
          </div>
        </div>

        {/* Admin extras */}
        {variant === "admin" && onChangePriority && (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">Priority:</span>
            <Select
              value={ticket.priority}
              onValueChange={(v) => onChangePriority?.(v)}
            >
              <SelectTrigger className="h-8 w-[120px] bg-transparent border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </GlassCard>

      {/* Thread */}
      <GlassCard className="p-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="p-4 md:p-5 space-y-3 max-h-[480px] overflow-y-auto"
        >
          {headerEvents.map((event) => (
            <ThreadRow key={event.key} event={event} variant={variant} />
          ))}
        </div>

        {!closed && (
          <div className="border-t border-white/10 p-3 md:p-4 bg-white/[0.02] space-y-2">
            <Textarea
              placeholder={
                variant === "admin"
                  ? "Reply as staff…"
                  : "Reply to the support team…"
              }
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {variant === "admin" ? (
                  <>
                    {ticket.status !== "resolved" && (
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => onChangeStatus?.("resolved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isMutating}
                      onClick={() => onChangeStatus?.("closed")}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Close
                    </Button>
                  </>
                ) : (
                  <>
                    {ticket.status !== "resolved" && (
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => onChangeStatus?.("resolved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                      </Button>
                    )}
                    {ticket.status === "resolved" && (
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => onChangeStatus?.("open")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                      </Button>
                    )}
                  </>
                )}
              </div>
              <GradientButton
                size="sm"
                onClick={handleSendReply}
                disabled={isMutating || !body.trim()}
              >
                <Send className="h-3.5 w-3.5" /> Send reply
              </GradientButton>
            </div>
          </div>
        )}

        {closed && (
          <div className="border-t border-white/10 p-4 text-center text-xs text-muted-foreground bg-white/[0.02]">
            This ticket is closed.{" "}
            {variant === "admin" && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => onChangeStatus?.("open")}
                disabled={isMutating}
              >
                Reopen
              </Button>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/**
 * Builds a flat list of timeline rows: the initial ticket body + every reply +
 * every status-change system entry. Each row gets a stable key.
 */
const buildThread = (ticket) => {
  const rows = [];
  rows.push({
    key: `head-${ticket._id}`,
    type: "message",
    authorKind: "customer",
    authorName: ticket.createdBy?.name || ticket.customerName || "Customer",
    authorEmail: ticket.createdBy?.email || ticket.customerEmail,
    body: ticket.body,
    createdAt: ticket.createdAt,
  });
  for (const r of ticket.replies || []) {
    if (r.statusChange?.from) {
      rows.push({
        key: `s-${r._id}`,
        type: "status",
        authorKind: r.authorKind,
        authorName: r.authorName,
        from: r.statusChange.from,
        to: r.statusChange.to,
        createdAt: r.createdAt,
      });
    } else if (r.body) {
      rows.push({
        key: `m-${r._id}`,
        type: "message",
        authorKind: r.authorKind,
        authorName: r.authorName,
        authorEmail: r.authorEmail,
        body: r.body,
        createdAt: r.createdAt,
      });
    }
  }
  return rows;
};

function ThreadRow({ event, variant }) {
  if (event.type === "status") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-1">
        <SettingsIcon className="h-3 w-3" />
        <span>
          <span className="text-foreground">
            {event.authorName || "system"}
          </span>{" "}
          changed status from{" "}
          <span className="px-1 py-0.5 rounded bg-white/5 text-foreground">
            {event.from}
          </span>{" "}
          →{" "}
          <span
            className={cn(
              "px-1 py-0.5 rounded border",
              STATUS_STYLES[event.to]
            )}
          >
            {event.to}
          </span>
        </span>
        <span className="ml-auto opacity-60">
          {dateFormater(event.createdAt, "MMM d, HH:mm")}
        </span>
      </div>
    );
  }

  const isStaff = event.authorKind === "staff";
  // Customer's own message (in user variant) right-align; admin sees them left-aligned
  const ownByCurrentUser = variant === "user" && event.authorKind === "customer";

  return (
    <div
      className={cn(
        "flex gap-2.5",
        ownByCurrentUser && "flex-row-reverse text-right"
      )}
    >
      <span
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border",
          isStaff
            ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
            : "bg-white/5 text-foreground border-white/10"
        )}
      >
        {isStaff ? (
          <ShieldCheck className="h-3.5 w-3.5" />
        ) : (
          <UserIcon className="h-3.5 w-3.5" />
        )}
      </span>
      <div
        className={cn(
          "rounded-lg p-3 max-w-[80%] border",
          isStaff
            ? "bg-blue-500/5 border-blue-500/20"
            : "bg-white/5 border-white/10"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-[11px] mb-1",
            ownByCurrentUser && "justify-end"
          )}
        >
          <span
            className={cn("font-semibold", isStaff && "text-blue-300")}
          >
            {event.authorName || (isStaff ? "Support" : "Customer")}
          </span>
          {event.authorEmail && variant === "admin" && !isStaff && (
            <span className="text-muted-foreground truncate">
              {event.authorEmail}
            </span>
          )}
          <span className="text-muted-foreground ml-auto">
            {dateFormater(event.createdAt, "MMM d, HH:mm")}
          </span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {event.body}
        </p>
      </div>
    </div>
  );
}
