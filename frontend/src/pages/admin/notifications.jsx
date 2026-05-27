import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import {
  sendBroadcast,
  fetchBroadcasts,
} from "@/redux/slice/notification-slice";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "paying", label: "Paying customers" },
  { value: "pro", label: "Pro + Agency" },
  { value: "free", label: "Free plan" },
];

const TYPE_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Critical" },
];

export default function AdminNotificationsPage() {
  const dispatch = useDispatch();
  const broadcasts = useSelector((s) => s.notifications.broadcasts);
  const isSending = useSelector((s) => s.notifications.isSendingBroadcast);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [type, setType] = useState("info");
  const [link, setLink] = useState("");

  useEffect(() => {
    dispatch(fetchBroadcasts({ perPage: 20 }));
  }, [dispatch]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    const payload = {
      subject: subject.trim(),
      body: body.trim(),
      audience,
      type,
      ...(link.trim() ? { link: link.trim() } : {}),
    };
    const res = await dispatch(sendBroadcast(payload));
    if (sendBroadcast.fulfilled.match(res)) {
      toast.success(
        `Broadcast sent to ${res.payload?.data?.recipients ?? 0} recipients`
      );
      setSubject("");
      setBody("");
      setLink("");
      dispatch(fetchBroadcasts({ perPage: 20 }));
    } else {
      toast.error(res.payload || "Could not send broadcast");
    }
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
                Sent as in-app notification + live socket toast.
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
                maxLength={200}
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
                maxLength={5000}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {body.length} / 5000 characters.
              </p>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                Optional link
              </Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="mt-1.5"
              />
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
                    {AUDIENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Severity
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground">
                Resolved by audience tier on send.
              </p>
              <div className="flex items-center gap-2">
                <GradientButton
                  size="md"
                  onClick={handleSend}
                  disabled={isSending}
                >
                  <Send className="h-4 w-4" />
                  {isSending ? "Sending…" : "Send now"}
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
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                1
              </span>
              Keep subject under 50 chars for mobile inbox previews.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                2
              </span>
              Send between Tue–Thu, 10am–2pm user local time for best read rates.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                3
              </span>
              Avoid sending more than 1 broadcast per week per audience.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                4
              </span>
              Always include a clear CTA link when applicable.
            </li>
          </ul>
        </GlassCard>
      </div>

      {/* History */}
      <div>
        <h3 className="font-display text-lg mb-3">Broadcast history</h3>
        <DataTable
          data={broadcasts}
          columns={[
            {
              key: "subject",
              header: "Subject",
              render: (b) => (
                <span className="font-medium">{b.subject || "(no subject)"}</span>
              ),
            },
            {
              key: "audience",
              header: "Audience",
              render: (b) => (
                <span className="capitalize">
                  {b.audience || "all"}
                </span>
              ),
            },
            {
              key: "recipients",
              header: "Recipients",
              render: (b) => (
                <span className="tabular-nums">
                  {formatNumber(b.recipients || 0)}
                </span>
              ),
            },
            {
              key: "readCount",
              header: "Read",
              render: (b) => {
                const total = b.recipients || 0;
                const read = b.readCount || 0;
                const pct = total ? Math.round((read / total) * 100) : 0;
                return (
                  <span className="tabular-nums text-emerald-400">
                    {read} ({pct}%)
                  </span>
                );
              },
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
