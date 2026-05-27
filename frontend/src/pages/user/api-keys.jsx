import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater, copyToClipboard } from "@/lib/utils";
import {
  fetchApiKeys,
  issueApiKey,
  revokeApiKey as revokeApiKeyThunk,
  fetchProviderKeys,
  saveProviderKey,
  removeProviderKey,
  clearNewApiKeyToken,
} from "@/redux/slice/user-slice";

const SCOPE_OPTIONS = [
  { value: "all", label: "All endpoints" },
  { value: "read", label: "Read only" },
  { value: "articles", label: "Articles only" },
  { value: "research", label: "Research only" },
];

export default function APIKeysPage() {
  const dispatch = useDispatch();
  const { apiKeys, providerKeys, newApiKeyToken } = useSelector((s) => s.user);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editProvider, setEditProvider] = useState(null);

  useEffect(() => {
    dispatch(fetchApiKeys());
    dispatch(fetchProviderKeys());
  }, [dispatch]);

  const handleCreate = async (name, scope) => {
    const res = await dispatch(issueApiKey({ name, scope }));
    if (issueApiKey.fulfilled.match(res)) {
      toast.success("API key created");
      setCreateOpen(false);
    } else {
      toast.error(res.payload || "Could not create key");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await dispatch(revokeApiKeyThunk(deleteTarget.id));
    if (revokeApiKeyThunk.fulfilled.match(res)) {
      toast.success("Key revoked");
    } else {
      toast.error(res.payload || "Could not revoke key");
    }
    setDeleteTarget(null);
  };

  const handleProviderSave = async (provider, rawKey) => {
    if (!rawKey?.trim()) {
      const res = await dispatch(removeProviderKey(provider));
      if (removeProviderKey.fulfilled.match(res)) {
        toast.success("Provider key removed");
        setEditProvider(null);
      } else {
        toast.error(res.payload || "Could not remove provider key");
      }
      return;
    }
    const res = await dispatch(saveProviderKey({ provider, rawKey }));
    if (saveProviderKey.fulfilled.match(res)) {
      toast.success("Provider key saved");
      setEditProvider(null);
    } else {
      toast.error(res.payload || "Could not save provider key");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Developer"
        title="API Keys"
        subtitle="Manage personal API keys for programmatic access, and override platform provider keys."
      />

      {/* Provider overrides */}
      <section>
        <h2 className="font-display text-xl mb-4">Provider keys (overrides)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Plug in your own keys to bypass platform limits or use your own
          billing. Keys are encrypted with AES-256 at rest.
        </p>
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {providerKeys.map((p) => (
            <motion.div key={p.provider} variants={staggerItem}>
              <GlassCard className="p-5 h-full flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center">
                    <Plug className="h-4 w-4 text-white" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.description}
                    </p>
                  </div>
                  {p.connected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">
                    {p.masked}
                  </span>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => setEditProvider(p)}
                  >
                    {p.connected ? "Update" : "Connect"}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Personal API keys */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl">Personal API keys</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Use these to access the Newsroom MCP API programmatically.
            </p>
          </div>
          <GradientButton size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create key
          </GradientButton>
        </div>

        <DataTable
          data={apiKeys}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (k) => (
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-brand-violet" />
                  <span className="font-medium">{k.name}</span>
                </div>
              ),
            },
            {
              key: "key",
              header: "Key",
              render: (k) => (
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-muted-foreground">
                    {k.keyPrefix}
                    …
                  </code>
                </div>
              ),
            },
            {
              key: "scope",
              header: "Scope",
              render: (k) => (
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {k.scope}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (k) => (
                <span className="text-xs text-muted-foreground">
                  {dateFormater(k.createdAt, "MMM d, yyyy")}
                </span>
              ),
            },
            {
              key: "lastUsed",
              header: "Last used",
              render: (k) => (
                <span className="text-xs text-muted-foreground">
                  {k.lastUsedAt
                    ? dateFormater(k.lastUsedAt, "MMM d, HH:mm")
                    : "Never"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "w-12",
              render: (k) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(k);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      </section>

      {/* New key shown once — token cleared on dismiss */}
      {newApiKeyToken && (
        <NewKeyBanner
          keyValue={newApiKeyToken}
          onDismiss={() => dispatch(clearNewApiKeyToken())}
        />
      )}

      {/* Create dialog */}
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      {/* Provider edit dialog */}
      <ProviderEditDialog
        provider={editProvider}
        onClose={() => setEditProvider(null)}
        onSave={handleProviderSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Revoke "${deleteTarget?.name}" key?`}
        description="Any integrations using this key will stop working immediately."
        confirmLabel="Revoke key"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function NewKeyBanner({ keyValue, onDismiss }) {
  return (
    <GlassCard className="p-5 border border-emerald-500/30 bg-emerald-500/5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Your new API key</p>
          <p className="text-xs text-muted-foreground mt-1">
            Copy it now — you won't be able to see it again.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-black/30 rounded-md px-3 py-2 truncate">
              {keyValue}
            </code>
            <Button
              size="sm"
              variant="glass"
              onClick={() => {
                copyToClipboard(keyValue);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </GlassCard>
  );
}

function CreateKeyDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("all");

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setName("");
      setScope("all");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-white/10">
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Give it a name and choose the access scope.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Key name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Production"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Scope
            </Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <GradientButton
            size="sm"
            onClick={() => onCreate(name.trim(), scope)}
            disabled={!name.trim()}
          >
            Create key
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProviderEditDialog({ provider, onClose, onSave }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (provider) {
      setValue("");
      setShow(false);
    }
  }, [provider]);

  if (!provider) return null;

  return (
    <Dialog open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border border-white/10">
        <DialogHeader>
          <DialogTitle>
            {provider.connected ? "Update" : "Connect"} {provider.name}
          </DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            API key
          </Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={provider.placeholder}
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {provider.connected && (
            <p className="text-[11px] text-muted-foreground">
              Leave empty and click <strong>Remove</strong> to disconnect this
              provider override.
            </p>
          )}
        </div>
        <DialogFooter className="mt-4 gap-2">
          {provider.connected && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => onSave(provider.provider, "")}
            >
              Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <GradientButton
            size="sm"
            onClick={() => onSave(provider.provider, value)}
            disabled={!value.trim()}
          >
            Save key
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
