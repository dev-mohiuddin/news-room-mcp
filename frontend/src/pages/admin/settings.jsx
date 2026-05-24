import { useState } from "react";
import { Save, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const FEATURE_FLAGS = [
  { id: "real_time_streaming", label: "Real-time generation streaming", desc: "Show progress while AI is drafting", enabled: true },
  { id: "version_history", label: "Article version history", desc: "Save snapshots on each auto-save", enabled: true },
  { id: "team_collab", label: "Team collaboration (Pro+)", desc: "Invite editors, writers, reviewers", enabled: true },
  { id: "ghost_integration", label: "Ghost CMS integration", desc: "Beta — Ghost publishing API", enabled: false },
  { id: "social_repurpose", label: "Social repurposing", desc: "Generate Twitter / LinkedIn from article", enabled: false },
];

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState(FEATURE_FLAGS);

  const onSave = () => toast.success("Settings saved");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Platform settings"
        subtitle="Branding, email, integrations, and feature flags."
        actions={
          <Button variant="gradient" onClick={onSave}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <GlassCard className="p-6 space-y-5 max-w-3xl">
            <Section title="Platform identity" subtitle="Shown in browser tab, emails, invoices.">
              <Field label="Platform name" defaultValue="Newsroom MCP" />
              <Field label="Tagline" defaultValue="Publish Smarter. Write with AI." />
              <Field label="Support email" type="email" defaultValue="support@newsroommcp.com" />
              <Field label="Default user timezone" defaultValue="UTC" />
            </Section>
          </GlassCard>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <GlassCard className="p-6 space-y-5 max-w-3xl">
            <Section
              title="Visual identity"
              subtitle="Logo, favicon, and primary brand color."
            >
              <div className="grid grid-cols-2 gap-4">
                <UploadField label="Logo (light bg)" />
                <UploadField label="Logo (dark bg)" />
                <UploadField label="Favicon" />
                <Field label="Primary brand color" defaultValue="#3B82F6" />
              </div>
            </Section>
          </GlassCard>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email">
          <GlassCard className="p-6 space-y-5 max-w-3xl">
            <Section title="SMTP" subtitle="Used for transactional emails and broadcasts.">
              <div className="grid grid-cols-2 gap-3">
                <Field label="SMTP host" defaultValue="smtp.resend.com" />
                <Field label="Port" type="number" defaultValue="587" />
                <Field label="Username" defaultValue="resend" />
                <Field label="API key / password" type="password" defaultValue="********" />
              </div>
              <Field label="From address" defaultValue="hello@newsroommcp.com" />
              <Field label="From name" defaultValue="Newsroom MCP" />
              <Button variant="glass" size="sm" className="w-fit">
                Send test email
              </Button>
            </Section>
          </GlassCard>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance">
          <GlassCard className="p-6 space-y-5 max-w-3xl">
            <Section
              title="Maintenance mode"
              subtitle="Show a maintenance page to all non-admin users."
            >
              <div className="flex items-center justify-between p-3 rounded-lg glass border border-white/5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm">Enable maintenance mode</span>
                </div>
                <Switch />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Maintenance message
                </Label>
                <Textarea
                  rows={3}
                  className="mt-1.5"
                  defaultValue="We're upgrading our infrastructure. Newsroom MCP will be back in about 30 minutes."
                />
              </div>
            </Section>
          </GlassCard>
        </TabsContent>

        {/* Feature flags */}
        <TabsContent value="flags">
          <GlassCard className="p-6 space-y-3 max-w-3xl">
            {flags.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-4 rounded-lg glass border border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(v) =>
                    setFlags((prev) =>
                      prev.map((x) =>
                        x.id === f.id ? { ...x, enabled: v } : x
                      )
                    )
                  }
                />
              </div>
            ))}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div>
      <h3 className="font-display text-lg">{title}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, type = "text", defaultValue }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input type={type} defaultValue={defaultValue} className="mt-1.5" />
    </div>
  );
}

function UploadField({ label }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5 h-24 rounded-lg glass border border-dashed border-white/15 flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-white/30 cursor-pointer">
        <Upload className="h-4 w-4 mb-1" />
        Click to upload
      </div>
    </div>
  );
}
