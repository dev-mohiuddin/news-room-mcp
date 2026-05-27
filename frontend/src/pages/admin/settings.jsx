import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Save, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { dateFormater } from "@/lib/utils";
import {
  fetchAdminSettings,
  patchSettingsSection,
  replaceFeatureFlags,
  toggleFeatureFlag,
  fetchPublicSettings,
} from "@/redux/slice/system-slice";

const FLAG_CATEGORIES = [
  { value: "core", label: "Core" },
  { value: "experimental", label: "Experimental" },
  { value: "integration", label: "Integration" },
  { value: "billing", label: "Billing" },
];

export default function AdminSettingsPage() {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.system.adminSettings);
  const isLoading = useSelector((s) => s.system.isLoading);
  const isMutating = useSelector((s) => s.system.isMutating);

  useEffect(() => {
    dispatch(fetchAdminSettings());
  }, [dispatch]);

  const updatedLabel = useMemo(
    () =>
      settings?.updatedAt
        ? dateFormater(settings.updatedAt, "MMM d, yyyy HH:mm")
        : null,
    [settings?.updatedAt]
  );

  if (isLoading && !settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="System"
          title="Platform settings"
          subtitle="Branding, email, integrations, and feature flags."
        />
        <GlassCard className="p-12 text-center text-sm text-muted-foreground">
          Loading…
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Platform settings"
        subtitle="Identity, branding, email, maintenance, and feature flags."
        actions={
          updatedLabel ? (
            <Badge variant="outline" className="text-[10px]">
              Last updated {updatedLabel}
            </Badge>
          ) : null
        }
      />

      <Tabs defaultValue="identity">
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <IdentitySection
            current={settings?.identity || {}}
            onSave={(p) =>
              saveSection(dispatch, "identity", p, isMutating)
            }
            saving={isMutating}
          />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingSection
            current={settings?.branding || {}}
            onSave={(p) => saveSection(dispatch, "branding", p, isMutating)}
            saving={isMutating}
          />
        </TabsContent>
        <TabsContent value="email">
          <EmailSection
            current={settings?.email || {}}
            onSave={(p) => saveSection(dispatch, "email", p, isMutating)}
            saving={isMutating}
          />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceSection
            current={settings?.maintenance || {}}
            onSave={(p) =>
              saveSection(dispatch, "maintenance", p, isMutating, () =>
                dispatch(fetchPublicSettings())
              )
            }
            saving={isMutating}
          />
        </TabsContent>
        <TabsContent value="flags">
          <FeatureFlagsSection
            flags={settings?.features || []}
            onToggle={(flagId, enabled, flag) =>
              dispatch(
                toggleFeatureFlag({
                  flagId,
                  payload: {
                    enabled,
                    label: flag.label,
                    description: flag.description,
                    category: flag.category,
                  },
                })
              ).then((res) => {
                if (toggleFeatureFlag.fulfilled.match(res)) {
                  toast.success(
                    enabled
                      ? `Enabled '${flag.label}'`
                      : `Disabled '${flag.label}'`
                  );
                } else {
                  toast.error(res.payload || "Could not toggle");
                }
              })
            }
            onReplace={(features) =>
              dispatch(replaceFeatureFlags(features)).then((res) => {
                if (replaceFeatureFlags.fulfilled.match(res)) {
                  toast.success("Feature flags saved");
                } else {
                  toast.error(res.payload || "Could not save flags");
                }
              })
            }
            saving={isMutating}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const saveSection = async (dispatch, section, payload, isMutating, after) => {
  if (isMutating) return;
  const res = await dispatch(patchSettingsSection({ section, payload }));
  if (patchSettingsSection.fulfilled.match(res)) {
    toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} saved`);
    if (after) after();
  } else {
    toast.error(res.payload || "Could not save");
  }
};

/* ──────────────────────────────────────────────────────────
 *  Sections
 * ────────────────────────────────────────────────────────── */

function IdentitySection({ current, onSave, saving }) {
  const [draft, setDraft] = useState({
    platformName: current.platformName || "",
    tagline: current.tagline || "",
    supportEmail: current.supportEmail || "",
    defaultTimezone: current.defaultTimezone || "UTC",
  });
  useEffect(() => {
    setDraft({
      platformName: current.platformName || "",
      tagline: current.tagline || "",
      supportEmail: current.supportEmail || "",
      defaultTimezone: current.defaultTimezone || "UTC",
    });
  }, [current.platformName, current.tagline, current.supportEmail, current.defaultTimezone]);

  return (
    <GlassCard className="p-6 space-y-5 max-w-3xl">
      <SectionHeading
        title="Platform identity"
        subtitle="Shown in browser tab, emails, invoices."
      />
      <Field
        label="Platform name"
        value={draft.platformName}
        onChange={(v) => setDraft((d) => ({ ...d, platformName: v }))}
        maxLength={80}
      />
      <Field
        label="Tagline"
        value={draft.tagline}
        onChange={(v) => setDraft((d) => ({ ...d, tagline: v }))}
        maxLength={160}
      />
      <Field
        type="email"
        label="Support email"
        value={draft.supportEmail}
        onChange={(v) => setDraft((d) => ({ ...d, supportEmail: v }))}
      />
      <Field
        label="Default user timezone"
        value={draft.defaultTimezone}
        onChange={(v) => setDraft((d) => ({ ...d, defaultTimezone: v }))}
        maxLength={60}
      />
      <SaveButton onClick={() => onSave(draft)} saving={saving} />
    </GlassCard>
  );
}

function BrandingSection({ current, onSave, saving }) {
  const [draft, setDraft] = useState({
    primaryColor: current.primaryColor || "#3B82F6",
    logoLightUrl: current.logoLightUrl || "",
    logoDarkUrl: current.logoDarkUrl || "",
    faviconUrl: current.faviconUrl || "",
  });
  useEffect(() => {
    setDraft({
      primaryColor: current.primaryColor || "#3B82F6",
      logoLightUrl: current.logoLightUrl || "",
      logoDarkUrl: current.logoDarkUrl || "",
      faviconUrl: current.faviconUrl || "",
    });
  }, [
    current.primaryColor,
    current.logoLightUrl,
    current.logoDarkUrl,
    current.faviconUrl,
  ]);

  return (
    <GlassCard className="p-6 space-y-5 max-w-3xl">
      <SectionHeading
        title="Visual identity"
        subtitle="Logo URLs, favicon, and primary brand color."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Field
            label="Primary brand color (hex)"
            value={draft.primaryColor}
            onChange={(v) =>
              setDraft((d) => ({ ...d, primaryColor: v.toUpperCase() }))
            }
            maxLength={20}
          />
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="h-5 w-5 rounded border border-white/20"
              style={{ background: draft.primaryColor }}
            />
            <span className="text-[10px] text-muted-foreground">
              Live preview
            </span>
          </div>
        </div>
        <Field
          label="Logo (light bg URL)"
          value={draft.logoLightUrl}
          onChange={(v) => setDraft((d) => ({ ...d, logoLightUrl: v }))}
          placeholder="https://…"
        />
        <Field
          label="Logo (dark bg URL)"
          value={draft.logoDarkUrl}
          onChange={(v) => setDraft((d) => ({ ...d, logoDarkUrl: v }))}
          placeholder="https://…"
        />
        <Field
          label="Favicon URL"
          value={draft.faviconUrl}
          onChange={(v) => setDraft((d) => ({ ...d, faviconUrl: v }))}
          placeholder="https://…"
        />
      </div>
      <SaveButton
        onClick={() =>
          onSave({
            primaryColor: draft.primaryColor || "#3B82F6",
            logoLightUrl: draft.logoLightUrl || null,
            logoDarkUrl: draft.logoDarkUrl || null,
            faviconUrl: draft.faviconUrl || null,
          })
        }
        saving={saving}
      />
    </GlassCard>
  );
}

function EmailSection({ current, onSave, saving }) {
  const [draft, setDraft] = useState({
    smtpHost: current.smtpHost || "",
    smtpPort: current.smtpPort ?? "",
    smtpUser: current.smtpUser || "",
    fromAddress: current.fromAddress || "",
    fromName: current.fromName || "",
  });
  useEffect(() => {
    setDraft({
      smtpHost: current.smtpHost || "",
      smtpPort: current.smtpPort ?? "",
      smtpUser: current.smtpUser || "",
      fromAddress: current.fromAddress || "",
      fromName: current.fromName || "",
    });
  }, [
    current.smtpHost,
    current.smtpPort,
    current.smtpUser,
    current.fromAddress,
    current.fromName,
  ]);

  return (
    <GlassCard className="p-6 space-y-5 max-w-3xl">
      <SectionHeading
        title="SMTP / Email"
        subtitle="Display-only metadata — actual SMTP credentials live in env vars (SMTP_HOST, SMTP_USER, SMTP_PASS, RESEND_API_KEY)."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="SMTP host"
          value={draft.smtpHost}
          onChange={(v) => setDraft((d) => ({ ...d, smtpHost: v }))}
        />
        <Field
          type="number"
          label="Port"
          value={draft.smtpPort}
          onChange={(v) => setDraft((d) => ({ ...d, smtpPort: v }))}
        />
        <Field
          label="Username"
          value={draft.smtpUser}
          onChange={(v) => setDraft((d) => ({ ...d, smtpUser: v }))}
        />
        <Field
          type="email"
          label="From address"
          value={draft.fromAddress}
          onChange={(v) => setDraft((d) => ({ ...d, fromAddress: v }))}
        />
        <Field
          label="From name"
          value={draft.fromName}
          onChange={(v) => setDraft((d) => ({ ...d, fromName: v }))}
        />
      </div>
      <SaveButton
        onClick={() =>
          onSave({
            smtpHost: draft.smtpHost || null,
            smtpPort:
              draft.smtpPort === "" || draft.smtpPort === null
                ? null
                : Number(draft.smtpPort),
            smtpUser: draft.smtpUser || null,
            fromAddress: draft.fromAddress || null,
            fromName: draft.fromName || null,
          })
        }
        saving={saving}
      />
    </GlassCard>
  );
}

function MaintenanceSection({ current, onSave, saving }) {
  const [draft, setDraft] = useState({
    enabled: !!current.enabled,
    message: current.message || "",
    allowAdminBypass: current.allowAdminBypass !== false,
  });
  useEffect(() => {
    setDraft({
      enabled: !!current.enabled,
      message: current.message || "",
      allowAdminBypass: current.allowAdminBypass !== false,
    });
  }, [current.enabled, current.message, current.allowAdminBypass]);

  return (
    <GlassCard className="p-6 space-y-5 max-w-3xl">
      <SectionHeading
        title="Maintenance mode"
        subtitle="Block tenant requests with HTTP 503. Admins keep access by default."
      />
      <div className="flex items-center justify-between p-3 rounded-lg glass border border-white/5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Enable maintenance mode</p>
            <p className="text-[11px] text-muted-foreground">
              Returns <code className="font-mono">503 + MAINTENANCE_MODE</code>{" "}
              to non-admin requests; the tenant UI shows an amber banner.
            </p>
          </div>
        </div>
        <Switch
          checked={draft.enabled}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
        />
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg glass border border-white/5">
        <div>
          <p className="text-sm font-medium">Allow admin bypass</p>
          <p className="text-[11px] text-muted-foreground">
            When enabled, super admins keep full access during maintenance.
          </p>
        </div>
        <Switch
          checked={draft.allowAdminBypass}
          onCheckedChange={(v) =>
            setDraft((d) => ({ ...d, allowAdminBypass: v }))
          }
        />
      </div>
      <div>
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Message shown to users
        </Label>
        <Textarea
          rows={3}
          maxLength={500}
          value={draft.message}
          onChange={(e) =>
            setDraft((d) => ({ ...d, message: e.target.value }))
          }
          className="mt-1.5"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          {draft.message.length} / 500
        </p>
      </div>
      <SaveButton onClick={() => onSave(draft)} saving={saving} />
    </GlassCard>
  );
}

function FeatureFlagsSection({ flags, onToggle, onReplace, saving }) {
  const [items, setItems] = useState(flags);
  useEffect(() => setItems(flags), [flags]);

  const addFlag = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `new_flag_${prev.length + 1}`,
        label: "New flag",
        description: "",
        enabled: false,
        category: "experimental",
      },
    ]);
  };

  const updateAt = (idx, patch) =>
    setItems((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const removeAt = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const isDirty = useMemo(() => {
    if (items.length !== flags.length) return true;
    return items.some(
      (f, i) =>
        f.id !== flags[i]?.id ||
        f.label !== flags[i]?.label ||
        f.description !== flags[i]?.description ||
        f.category !== flags[i]?.category
    );
  }, [items, flags]);

  return (
    <GlassCard className="p-6 space-y-3 max-w-4xl">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No feature flags yet.</p>
      )}
      {items.map((f, i) => {
        const original = flags.find((x) => x.id === f.id);
        const isExisting = !!original;
        return (
          <div
            key={`${f.id}-${i}`}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-lg glass border border-white/5"
          >
            <div className="md:col-span-3">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Flag ID
              </Label>
              <Input
                value={f.id}
                onChange={(e) => updateAt(i, { id: e.target.value })}
                disabled={isExisting}
                className="mt-1.5 font-mono text-xs"
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Label
              </Label>
              <Input
                value={f.label}
                onChange={(e) => updateAt(i, { label: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-4">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Description
              </Label>
              <Input
                value={f.description || ""}
                onChange={(e) => updateAt(i, { description: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Category
              </Label>
              <Select
                value={f.category || "core"}
                onValueChange={(v) => updateAt(i, { category: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-12 flex items-center justify-between pt-2 border-t border-white/5">
              <Switch
                checked={!!f.enabled}
                onCheckedChange={(v) =>
                  isExisting
                    ? onToggle(f.id, v, { ...f, enabled: v })
                    : updateAt(i, { enabled: v })
                }
                disabled={saving}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAt(i)}
                className="text-muted-foreground hover:text-destructive"
                title="Remove flag"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        <Button variant="glass" size="sm" onClick={addFlag} disabled={saving}>
          <Plus className="h-3.5 w-3.5" /> Add flag
        </Button>
        {isDirty && (
          <Button
            variant="default"
            size="sm"
            disabled={saving}
            onClick={() => onReplace(items)}
          >
            <Save className="h-4 w-4" /> Save flag list
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Tiny helpers
 * ────────────────────────────────────────────────────────── */

function SectionHeading({ title, subtitle }) {
  return (
    <div>
      <h3 className="font-display text-lg">{title}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, maxLength }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1.5"
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

function SaveButton({ onClick, saving }) {
  return (
    <div className="pt-2">
      <Button variant="default" size="sm" onClick={onClick} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
