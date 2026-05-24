import { useState } from "react";
import { Send, Megaphone, Calendar, Users } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateFormater, formatNumber } from "@/lib/utils";
import { MOCK_BROADCAST_HISTORY } from "@/lib/mockData";

export default function AdminNotificationsPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [scheduleAt, setScheduleAt] = useState("");
  const [history, setHistory] = useState(MOCK_BROADCAST_HISTORY);

  const audienceMap = {
    all: { label: "All users", count: 12483 },
    paying: { label: "Paying customers", count: 7663 },
    pro: { label: "Pro + Agency", count: 4453 },
    free: { label: "Free plan", count: 4820 },
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    const item = {
      id: `b${history.length + 1}`,
      subject,
      audience: audienceMap[audience].label,
      recipients: audienceMap[audience].count,
      sentAt: new Date().toISOString(),
      openRate: 0,
    };
    setHistory((h) => [item, ...h]);
    setSubject("");
    setBody("");
    toast.success(scheduleAt ? "Broadcast scheduled" : "Broadcast sent");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Broadcasts"
        subtitle="Send platform-wide announcements, product updates, or maintenance alerts."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Composer */}
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-white" />
            </span>
            <div>
              <h3 className="font-display text-lg">New broadcast</h3>
              <p className="text-xs text-muted-foreground">
                Sent via email + in-app notification.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Subject
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. New CMS integration: Sanity"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Body
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement…"
                rows={8}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Markdown supported. {body.length} characters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Audience
                </Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(audienceMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label} ({formatNumber(v.count)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Schedule (optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground">
                Will reach{" "}
                <span className="text-foreground font-semibold">
                  {formatNumber(audienceMap[audience].count)}
                </span>{" "}
                recipients
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost">Save draft</Button>
                <GradientButton size="md" onClick={handleSend}>
                  <Send className="h-4 w-4" />
                  {scheduleAt ? "Schedule" : "Send now"}
                </GradientButton>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Tips */}
        <GlassCard className="p-6">
          <h3 className="font-display text-lg mb-4">Best practices</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
              Keep subject under 50 chars for mobile inbox previews.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
              Send between Tue–Thu, 10am–2pm user local time for best open rates.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
              Avoid sending more than 1 broadcast per week per audience.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
              Always include a clear call-to-action link.
            </li>
          </ul>
        </GlassCard>
      </div>

      {/* History */}
      <div>
        <h3 className="font-display text-lg mb-3">Broadcast history</h3>
        <DataTable
          data={history}
          columns={[
            {
              key: "subject",
              header: "Subject",
              render: (b) => <span className="font-medium">{b.subject}</span>,
            },
            { key: "audience", header: "Audience" },
            {
              key: "recipients",
              header: "Recipients",
              render: (b) => (
                <span className="tabular-nums">
                  {formatNumber(b.recipients)}
                </span>
              ),
            },
            {
              key: "openRate",
              header: "Open rate",
              render: (b) =>
                b.openRate ? (
                  <span className="tabular-nums text-emerald-400">
                    {b.openRate}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                ),
            },
            {
              key: "sentAt",
              header: "Sent",
              render: (b) => (
                <span className="text-xs text-muted-foreground">
                  {dateFormater(b.sentAt, "MMM d, HH:mm")}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
