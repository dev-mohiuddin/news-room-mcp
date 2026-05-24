import { useState } from "react";
import {
  Globe,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Star,
  Edit,
  Plug,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { MY_CMS_CONNECTIONS } from "@/lib/mockData";

const PLATFORM_COLORS = {
  WordPress: "from-blue-600 to-blue-400",
  Ghost: "from-slate-600 to-slate-400",
  Notion: "from-neutral-700 to-neutral-500",
  Contentful: "from-blue-500 to-cyan-400",
  Sanity: "from-red-500 to-orange-400",
};

export default function CMSPage() {
  const [connections, setConnections] = useState(MY_CMS_CONNECTIONS);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);

  const testConnection = (id) => {
    toast.loading("Testing connection…", { id });
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, lastSync: new Date().toISOString() } : c))
      );
      toast.success("Connection OK", { id });
    }, 800);
  };

  const setDefault = (id) => {
    setConnections((prev) =>
      prev.map((c) => ({ ...c, default: c.id === id }))
    );
    toast.success("Default CMS updated");
  };

  const handleDisconnect = () => {
    if (disconnectTarget) {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === disconnectTarget.id
            ? { ...c, status: "disconnected", siteUrl: "—", lastSync: null, default: false }
            : c
        )
      );
      toast.success(`${disconnectTarget.platform} disconnected`);
    }
    setDisconnectTarget(null);
  };

  const handleConnect = (platform, url, key) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, status: "connected", siteUrl: url, lastSync: new Date().toISOString() }
          : c
      )
    );
    setConnectOpen(false);
    toast.success(`${platform} connected`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="CMS Connections"
        subtitle="Connect your CMS accounts to publish articles directly from Newsroom MCP."
        actions={
          <GradientButton size="md" onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" /> Add connection
          </GradientButton>
        }
      />

      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {connections.map((c) => (
          <motion.div key={c.id} variants={staggerItem}>
            <GlassCard
              hover
              glow={c.status === "connected" ? "teal" : null}
              className={`p-5 h-full flex flex-col ${c.default ? "ring-2 ring-primary/30" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-11 w-11 rounded-xl bg-gradient-to-br ${PLATFORM_COLORS[c.platform]} flex items-center justify-center shadow-lg`}>
                    <Globe className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg leading-tight">{c.platform}</h3>
                      {c.default && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                    <Badge variant="glass" className="text-[9px] mt-1">{c.phase}</Badge>
                  </div>
                </div>
                {c.status === "connected" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs flex-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={c.status === "connected" ? "text-emerald-400" : "text-muted-foreground"}>
                    {c.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Site URL</span>
                  <span className="truncate ml-2 max-w-[160px]">{c.siteUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auth</span>
                  <span>{c.authMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last sync</span>
                  <span>{c.lastSync ? dateFormater(c.lastSync, "MMM d, HH:mm") : "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                {c.status === "connected" ? (
                  <>
                    <Button variant="glass" size="sm" className="flex-1" onClick={() => testConnection(c.id)}>
                      <RefreshCw className="h-3.5 w-3.5" /> Test
                    </Button>
                    {!c.default && (
                      <Button variant="ghost" size="sm" onClick={() => setDefault(c.id)}>
                        <Star className="h-3.5 w-3.5" /> Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDisconnectTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <GradientButton
                    size="sm"
                    className="w-full"
                    onClick={() => setConnectOpen(true)}
                  >
                    <Plug className="h-3.5 w-3.5" /> Connect
                  </GradientButton>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} onConnect={handleConnect} />

      <ConfirmDialog
        open={!!disconnectTarget}
        onOpenChange={(o) => !o && setDisconnectTarget(null)}
        title={`Disconnect ${disconnectTarget?.platform}?`}
        description="You won't be able to publish to this CMS until you reconnect."
        confirmLabel="Disconnect"
        destructive
        onConfirm={handleDisconnect}
      />
    </div>
  );
}

function ConnectDialog({ open, onOpenChange, onConnect }) {
  const [platform, setPlatform] = useState("WordPress");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setUrl(""); setKey(""); } onOpenChange(o); }}>
      <DialogContent className="glass border border-white/10">
        <DialogHeader>
          <DialogTitle>Connect CMS</DialogTitle>
          <DialogDescription>Enter your site URL and authentication credentials.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WordPress">WordPress</SelectItem>
                <SelectItem value="Ghost">Ghost</SelectItem>
                <SelectItem value="Notion">Notion</SelectItem>
                <SelectItem value="Contentful">Contentful</SelectItem>
                <SelectItem value="Sanity">Sanity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Site URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1.5" placeholder="https://blog.example.com" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              {platform === "WordPress" ? "Application Password" : platform === "Ghost" ? "Admin API Key" : "API Token"}
            </Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} className="mt-1.5 font-mono" type="password" placeholder="Paste your key…" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <GradientButton size="sm" onClick={() => onConnect(platform, url, key)} disabled={!url.trim() || !key.trim()}>
            <Plug className="h-4 w-4" /> Connect
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
