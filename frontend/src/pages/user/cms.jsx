import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Plug,
  AlertCircle,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  fetchCmsConnections,
  addWordpressConnection,
  testCms,
  deleteCms,
} from "@/redux/slice/cms-slice";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";

export default function CMSPage() {
  const dispatch = useDispatch();
  const { connections, isLoading } = useSelector((s) => s.cms);

  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    dispatch(fetchCmsConnections());
  }, [dispatch]);

  const onTest = async (id) => {
    setBusyId(id);
    try {
      await dispatch(testCms(id)).unwrap();
      toast.success("Connection verified");
    } catch (err) {
      toast.error(err || "Connection test failed");
    } finally {
      setBusyId(null);
    }
  };

  const onDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      await dispatch(deleteCms(disconnectTarget._id)).unwrap();
      toast.success(`${disconnectTarget.siteUrl} disconnected`);
    } catch (err) {
      toast.error(err || "Could not disconnect");
    } finally {
      setDisconnectTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="CMS Connections"
        subtitle="Connect your WordPress sites so Newsroom MCP can publish drafts on your behalf."
        actions={
          <GradientButton size="md" onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" /> Connect WordPress
          </GradientButton>
        }
      />

      {isLoading && connections.length === 0 ? (
        <ConnectionsSkeleton />
      ) : connections.length === 0 ? (
        <EmptyState onAdd={() => setConnectOpen(true)} />
      ) : (
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {connections.map((c) => (
            <motion.div key={c._id} variants={staggerItem}>
              <ConnectionCard
                connection={c}
                isBusy={busyId === c._id}
                onTest={() => onTest(c._id)}
                onDelete={() => setDisconnectTarget(c)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <ConnectWordpressDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onSuccess={() => {
          setConnectOpen(false);
          dispatch(fetchCmsConnections());
        }}
      />

      <ConfirmDialog
        open={!!disconnectTarget}
        onOpenChange={(o) => !o && setDisconnectTarget(null)}
        title="Disconnect this site?"
        description="Articles will no longer publish to this site until you reconnect."
        confirmLabel="Disconnect"
        destructive
        onConfirm={onDisconnect}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Connection card
 * ────────────────────────────────────────────────────────── */
function ConnectionCard({ connection, isBusy, onTest, onDelete }) {
  const isConnected = !!connection.lastTestedAt;
  return (
    <GlassCard
      hover
      glow={isConnected ? "teal" : null}
      className="p-5 h-full flex flex-col"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-11 w-11 rounded-xl bg-linear-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shrink-0">
            <Globe className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight capitalize">
              {connection.provider}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {connection.label || connection.siteUrl}
            </p>
          </div>
        </div>
        {isConnected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs flex-1">
        <Row label="Site URL" value={connection.siteUrl} mono />
        <Row label="User" value={connection.username} />
        <Row
          label="Last tested"
          value={
            connection.lastTestedAt
              ? dateFormater(connection.lastTestedAt, "MMM d, HH:mm")
              : "—"
          }
        />
        {connection.isDefault && (
          <Badge variant="outline" className="text-[9px]">
            Default
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
        <Button
          variant="glass"
          size="sm"
          className="flex-1"
          onClick={onTest}
          disabled={isBusy}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
          {isBusy ? "Testing…" : "Test"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </GlassCard>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`text-right truncate ${mono ? "font-mono text-[11px]" : ""}`}
        title={value}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Empty state
 * ────────────────────────────────────────────────────────── */
function EmptyState({ onAdd }) {
  return (
    <GlassCard className="p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-full glass border border-white/10 flex items-center justify-center mb-3">
        <Globe className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">No CMS connected yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Connect a WordPress site to push generated articles as drafts.
        We use HTTPS application passwords — credentials are encrypted at rest.
      </p>
      <GradientButton size="md" onClick={onAdd} className="mt-4">
        <Plus className="h-4 w-4" /> Connect WordPress
      </GradientButton>
    </GlassCard>
  );
}

function ConnectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <GlassCard key={i} className="p-5 h-44 animate-pulse" />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Connect WordPress dialog
 * ────────────────────────────────────────────────────────── */
function ConnectWordpressDialog({ open, onOpenChange, onSuccess }) {
  const dispatch = useDispatch();
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [applicationPassword, setApplicationPassword] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setSiteUrl("");
    setUsername("");
    setApplicationPassword("");
    setLabel("");
  };

  const submit = async () => {
    if (!siteUrl || !username || !applicationPassword) {
      toast.error("All fields except label are required");
      return;
    }
    if (!/^https:\/\//i.test(siteUrl)) {
      toast.error("Site URL must use https://");
      return;
    }
    setBusy(true);
    try {
      await dispatch(
        addWordpressConnection({
          siteUrl,
          username,
          applicationPassword,
          label: label || undefined,
        })
      ).unwrap();
      toast.success("WordPress site connected");
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error(err || "Could not connect site");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect WordPress</DialogTitle>
          <DialogDescription>
            Use an{" "}
            <a
              href="https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              application password
            </a>
            . Plain user passwords will not work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Site URL
            </Label>
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="mt-1.5"
              placeholder="https://blog.example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Username
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5"
                placeholder="wp_admin"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Label (optional)
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5"
                placeholder="My main blog"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Application Password
            </Label>
            <Input
              value={applicationPassword}
              onChange={(e) => setApplicationPassword(e.target.value)}
              className="mt-1.5 font-mono"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              We encrypt this with AES-256-GCM before storing it. The plain
              value is never returned by our API.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <GradientButton size="sm" onClick={submit} disabled={busy}>
            <Plug className="h-4 w-4" /> {busy ? "Verifying…" : "Connect site"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
