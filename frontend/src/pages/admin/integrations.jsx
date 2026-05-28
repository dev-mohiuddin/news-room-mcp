import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Plug,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  KeyRound,
  AlertTriangle,
  Power,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { dateFormater } from "@/lib/utils";
import {
  fetchIntegrations,
  saveIntegration,
  toggleIntegrationActive,
  testIntegration,
} from "@/redux/slice/integration-slice";

/**
 * Admin Integrations — fully wired to /api/v1/admin/integrations.
 *
 *   - Each provider has a typed field schema (see PROVIDER_FIELDS).
 *   - "Test connection" calls the backend ping. Failures are
 *     surfaced as a toast + persisted on the integration record.
 *   - Active toggle soft-disables a provider without rotating the key.
 */

/* ──────────────────────────────────────────────────────────
 *  Provider field schema — drives the edit dialog UI.
 *  Must mirror PROVIDER_FIELDS in services/system/integrationService.js
 * ────────────────────────────────────────────────────────── */
const PROVIDER_FIELDS = {
  anthropic: [
    { key: "apiKey", label: "API Key", secret: true, placeholder: "sk-ant-..." },
  ],
  brave: [
    { key: "apiKey", label: "API Key", secret: true, placeholder: "BSA..." },
  ],
  exa: [
    { key: "apiKey", label: "API Key", secret: true, placeholder: "exa-..." },
  ],
  stripe: [
    { key: "secretKey", label: "Secret Key", secret: true, placeholder: "sk_live_..." },
    { key: "webhookSecret", label: "Webhook Secret", secret: true, placeholder: "whsec_..." },
    { key: "publishableKey", label: "Publishable Key (optional)", secret: false, placeholder: "pk_live_..." },
  ],
  cloudinary: [
    { key: "cloudName", label: "Cloud Name", secret: false },
    { key: "apiKey", label: "API Key", secret: false },
    { key: "apiSecret", label: "API Secret", secret: true },
  ],
  smtp: [
    { key: "host", label: "Host", secret: false, placeholder: "smtp.resend.com" },
    { key: "port", label: "Port", secret: false, placeholder: "587" },
    { key: "user", label: "Username", secret: false },
    { key: "pass", label: "Password", secret: true },
    { key: "from", label: "From address", secret: false, placeholder: "noreply@your-domain.com" },
  ],
  dataforseo: [
    { key: "login", label: "Login", secret: false },
    { key: "password", label: "Password", secret: true },
  ],
  firecrawl: [
    { key: "apiKey", label: "API Key", secret: true, placeholder: "fc-..." },
  ],
  jina: [
    { key: "apiKey", label: "API Key", secret: true, placeholder: "jina_..." },
  ],
};

export default function AdminIntegrationsPage() {
  const dispatch = useDispatch();
  const { list, isLoading, testingProvider } = useSelector(
    (s) => s.integrations
  );
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchIntegrations());
  }, [dispatch]);

  const onTest = async (provider) => {
    const toastId = `test-${provider}`;
    toast.loading("Testing connection…", { id: toastId });
    const res = await dispatch(testIntegration(provider));
    if (testIntegration.fulfilled.match(res)) {
      if (res.payload?.ok) {
        toast.success("Connection OK", { id: toastId });
      } else {
        toast.error(res.payload?.error || "Connection failed", { id: toastId });
      }
    } else {
      toast.error(res.payload || "Test failed", { id: toastId });
    }
  };

  const onToggleActive = async (item) => {
    if (!item.connected) return;
    const next = !item.isActive;
    const res = await dispatch(
      toggleIntegrationActive({ provider: item.provider, isActive: next })
    );
    if (toggleIntegrationActive.fulfilled.match(res)) {
      toast.success(next ? "Enabled" : "Disabled");
    } else {
      toast.error(res.payload || "Could not toggle");
    }
  };

  const onSave = async (provider, bundle) => {
    const res = await dispatch(saveIntegration({ provider, bundle }));
    if (saveIntegration.fulfilled.match(res)) {
      toast.success("Integration saved");
      setEditTarget(null);
    } else {
      toast.error(res.payload || "Could not save integration");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Integrations"
        subtitle="Manage global API keys for the AI providers, billing, email, and storage."
      />

      {isLoading && list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading integrations…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((it) => (
            <IntegrationCard
              key={it.provider}
              item={it}
              testing={testingProvider === it.provider}
              onEdit={() => setEditTarget(it)}
              onTest={() => onTest(it.provider)}
              onToggleActive={() => onToggleActive(it)}
            />
          ))}
        </div>
      )}

      <EditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={onSave}
      />
    </div>
  );
}

function IntegrationCard({ item, testing, onEdit, onTest, onToggleActive }) {
  const connected = item.connected && item.isActive;
  const usingEnv = !item.connected && item.envFallback;

  return (
    <GlassCard hover className="p-5 h-full flex flex-col">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
          <Plug className="h-4 w-4 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg leading-tight">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {item.description}
          </p>
        </div>
        <StatusPill connected={connected} fallback={usingEnv} />
      </div>

      <div className="mt-5 rounded-lg glass border border-white/5 p-3 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="uppercase tracking-widest">Key</span>
          <span className="font-mono text-foreground/90">{item.masked}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground mt-1.5">
          <span className="uppercase tracking-widest">Last tested</span>
          <span>
            {item.lastTestedAt
              ? `${dateFormater(item.lastTestedAt, "MMM d, HH:mm")} · ${item.lastTestStatus}`
              : "—"}
          </span>
        </div>
        {item.lastTestStatus === "failed" && item.lastTestError && (
          <div className="mt-2 text-[11px] text-amber-400 flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="break-words">{item.lastTestError}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 flex items-center gap-2">
        <Button variant="glass" size="sm" className="flex-1" onClick={onEdit}>
          <KeyRound className="h-3.5 w-3.5" />
          {item.connected ? "Rotate" : "Connect"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTest}
          disabled={testing || (!item.connected && !usingEnv)}
          className="text-brand-teal"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`}
          />
          Test
        </Button>
        {item.connected && (
          <button
            type="button"
            title={item.isActive ? "Disable" : "Enable"}
            onClick={onToggleActive}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <Power
              className={`h-3.5 w-3.5 ${item.isActive ? "text-emerald-400" : "text-muted-foreground/40"}`}
            />
          </button>
        )}
      </div>
    </GlassCard>
  );
}

function StatusPill({ connected, fallback }) {
  if (connected) {
    return (
      <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Connected
        </span>
      </span>
    );
  }
  if (fallback) {
    return (
      <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/30">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Env fallback
        </span>
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-widest border bg-red-500/10 text-red-400 border-red-500/30">
      <span className="inline-flex items-center gap-1">
        <XCircle className="h-3 w-3" /> Disconnected
      </span>
    </span>
  );
}

function EditDialog({ target, onClose, onSave }) {
  const fields = useMemo(
    () => (target ? PROVIDER_FIELDS[target.provider] || [] : []),
    [target]
  );
  const [values, setValues] = useState({});
  const [show, setShow] = useState({});

  useEffect(() => {
    if (target) {
      /* Pre-fill non-secret fields from publicMeta. Secret fields stay empty
       * — admin must re-enter them on every rotation. */
      const seed = {};
      for (const f of PROVIDER_FIELDS[target.provider] || []) {
        if (!f.secret && target.publicMeta?.[f.key]) {
          seed[f.key] = String(target.publicMeta[f.key]);
        } else {
          seed[f.key] = "";
        }
      }
      setValues(seed);
      setShow({});
    }
  }, [target]);

  if (!target) return null;

  const setField = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));
  const toggleShow = (k) =>
    setShow((prev) => ({ ...prev, [k]: !prev[k] }));

  const onSubmit = () => {
    /* Strip empty values — service merges with existing secrets so empty
     * fields don't wipe an existing key. */
    const bundle = {};
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "string" && v.trim() !== "") bundle[k] = v.trim();
    }
    if (Object.keys(bundle).length === 0) {
      toast.error("Provide at least one field to save");
      return;
    }
    onSave(target.provider, bundle);
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {target.connected ? "Rotate" : "Connect"} {target.name}
          </DialogTitle>
          <DialogDescription>{target.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {f.label}
              </Label>
              <div className="relative mt-1.5">
                <Input
                  type={f.secret && !show[f.key] ? "password" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={
                    f.secret && target.connected
                      ? "•••••••• (leave blank to keep current)"
                      : f.placeholder || ""
                  }
                  className={f.secret ? "pr-10 font-mono" : ""}
                />
                {f.secret && (
                  <button
                    type="button"
                    onClick={() => toggleShow(f.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {show[f.key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          {target.connected && (
            <p className="text-[11px] text-muted-foreground">
              Leave secret fields blank to keep the current value. New values
              are AES-256 encrypted before storage.
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <GradientButton size="sm" onClick={onSubmit}>
            Save
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
