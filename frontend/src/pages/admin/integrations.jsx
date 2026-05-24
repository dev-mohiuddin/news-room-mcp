import { useState } from "react";
import {
  Plug,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { dateFormater } from "@/lib/utils";
import { MOCK_INTEGRATIONS } from "@/lib/mockData";

export default function AdminIntegrationsPage() {
  const [items, setItems] = useState(MOCK_INTEGRATIONS);
  const [editTarget, setEditTarget] = useState(null);

  const onTest = (id) => {
    toast.loading("Testing connection…", { id });
    setTimeout(() => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, lastTested: new Date().toISOString() } : it
        )
      );
      toast.success("Connection OK", { id });
    }, 800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Integrations"
        subtitle="Manage global API keys for the AI providers, billing, email, and storage."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <IntegrationCard
            key={it.id}
            item={it}
            onEdit={() => setEditTarget(it)}
            onTest={() => onTest(it.id)}
          />
        ))}
      </div>

      <EditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(updated) => {
          setItems((prev) =>
            prev.map((it) => (it.id === updated.id ? updated : it))
          );
          setEditTarget(null);
          toast.success("Integration updated");
        }}
      />
    </div>
  );
}

function IntegrationCard({ item, onEdit, onTest }) {
  const connected = item.status === "connected";
  return (
    <GlassCard hover className="p-5 h-full flex flex-col">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
          <Plug className="h-4 w-4 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg leading-tight">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {item.desc}
          </p>
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-widest border ${
            connected
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          {connected ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Disconnected
            </span>
          )}
        </span>
      </div>

      <div className="mt-5 rounded-lg glass border border-white/5 p-3 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="uppercase tracking-widest">Key</span>
          <span className="font-mono text-foreground/90">{item.masked}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground mt-1.5">
          <span className="uppercase tracking-widest">Last tested</span>
          <span>
            {item.lastTested
              ? dateFormater(item.lastTested, "MMM d, HH:mm")
              : "—"}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4 flex items-center gap-2">
        <Button variant="glass" size="sm" className="flex-1" onClick={onEdit}>
          <KeyRound className="h-3.5 w-3.5" /> Edit key
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTest}
          className="text-brand-teal"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Test
        </Button>
      </div>
    </GlassCard>
  );
}

function EditDialog({ target, onClose, onSave }) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");

  if (!target) return null;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border border-white/10">
        <DialogHeader>
          <DialogTitle>Edit {target.name}</DialogTitle>
          <DialogDescription>
            Paste the new key. The old key is rotated immediately.
          </DialogDescription>
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
              placeholder={target.masked}
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
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the current key.
          </p>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                ...target,
                masked: value
                  ? `${value.slice(0, 4)}…${value.slice(-4)}`
                  : target.masked,
                status: "connected",
              })
            }
          >
            Save key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
