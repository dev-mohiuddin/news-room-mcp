import { useState } from "react";
import { Save, Upload, Shield, Bell, Globe, User } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserSettingsPage() {
  const onSave = () => toast.success("Settings saved");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Profile, security, notifications, and workspace preferences."
        actions={
          <GradientButton size="md" onClick={onSave}>
            <Save className="h-4 w-4" /> Save changes
          </GradientButton>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Workspace
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <GlassCard className="p-6 space-y-5 max-w-3xl">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-display shadow-lg">
                S
              </div>
              <div>
                <Button variant="glass" size="sm">
                  <Upload className="h-3.5 w-3.5" /> Upload avatar
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  JPG, PNG or WebP. Max 2MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full name" defaultValue="Sarah Chen" />
              <Field label="Email" type="email" defaultValue="user@newsroommcp.com" />
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">US Eastern</SelectItem>
                    <SelectItem value="pst">US Pacific</SelectItem>
                    <SelectItem value="gmt">GMT (London)</SelectItem>
                    <SelectItem value="cet">CET (Berlin)</SelectItem>
                    <SelectItem value="jst">JST (Tokyo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <GlassCard className="p-6 space-y-6 max-w-3xl">
            <Section title="Change password">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Current password" type="password" defaultValue="" placeholder="••••••••" />
                <div />
                <Field label="New password" type="password" defaultValue="" placeholder="••••••••" />
                <Field label="Confirm new password" type="password" defaultValue="" placeholder="••••••••" />
              </div>
              <Button variant="glass" size="sm" className="mt-3">Update password</Button>
            </Section>

            <Section title="Two-factor authentication">
              <div className="flex items-center justify-between p-4 rounded-lg glass border border-white/5">
                <div>
                  <p className="text-sm font-medium">Enable 2FA</p>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security with TOTP authenticator.
                  </p>
                </div>
                <Switch />
              </div>
            </Section>

            <Section title="Active sessions">
              <ul className="space-y-2">
                {[
                  { device: "Chrome · Windows", ip: "203.0.113.4", current: true },
                  { device: "Safari · macOS", ip: "198.51.100.12", current: false },
                ].map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg glass border border-white/5"
                  >
                    <div>
                      <p className="text-sm">{s.device}</p>
                      <p className="text-xs text-muted-foreground">IP: {s.ip}</p>
                    </div>
                    {s.current ? (
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400">
                        Current
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Revoke
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          </GlassCard>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <GlassCard className="p-6 space-y-4 max-w-3xl">
            <p className="text-xs text-muted-foreground mb-2">
              Choose how you want to be notified for each event type.
            </p>
            {[
              { label: "Article published", email: true, inApp: true },
              { label: "Article generation complete", email: false, inApp: true },
              { label: "Team member invited", email: true, inApp: true },
              { label: "Payment received", email: true, inApp: false },
              { label: "Plan limit approaching (80%)", email: true, inApp: true },
              { label: "Platform announcements", email: true, inApp: true },
              { label: "Weekly digest", email: true, inApp: false },
            ].map((n) => (
              <NotifRow key={n.label} {...n} />
            ))}
          </GlassCard>
        </TabsContent>

        {/* Workspace */}
        <TabsContent value="workspace">
          <GlassCard className="p-6 space-y-5 max-w-3xl">
            <Field label="Workspace name" defaultValue="TechBuzz Media" />
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Default brand voice</Label>
              <Select defaultValue="bv1">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bv1">Editorial — Default</SelectItem>
                  <SelectItem value="bv2">Casual Blog Voice</SelectItem>
                  <SelectItem value="bv3">Technical Docs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Default CMS</Label>
              <Select defaultValue="wordpress">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wordpress">WordPress — blog.example.com</SelectItem>
                  <SelectItem value="ghost">Ghost — newsletter.example.com</SelectItem>
                  <SelectItem value="contentful">Contentful — Space xy7k4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Default article length</Label>
              <Select defaultValue="1500">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">Short (~500 words)</SelectItem>
                  <SelectItem value="1000">Medium (~1,000 words)</SelectItem>
                  <SelectItem value="1500">Long (~1,500 words)</SelectItem>
                  <SelectItem value="2000">Deep-dive (~2,000 words)</SelectItem>
                  <SelectItem value="3000">Comprehensive (~3,000 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-lg mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, type = "text", defaultValue, placeholder }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Input type={type} defaultValue={defaultValue} placeholder={placeholder} className="mt-1.5" />
    </div>
  );
}

function NotifRow({ label, email: emailDefault, inApp: inAppDefault }) {
  const [email, setEmail] = useState(emailDefault);
  const [inApp, setInApp] = useState(inAppDefault);
  return (
    <div className="flex items-center justify-between p-3 rounded-lg glass border border-white/5">
      <p className="text-sm flex-1">{label}</p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <Switch checked={email} onCheckedChange={setEmail} /> Email
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <Switch checked={inApp} onCheckedChange={setInApp} /> In-app
        </label>
      </div>
    </div>
  );
}
