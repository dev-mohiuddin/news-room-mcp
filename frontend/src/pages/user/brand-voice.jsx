import { useState } from "react";
import {
  Mic,
  Plus,
  Upload,
  CheckCircle2,
  Trash2,
  Edit,
  Sparkles,
  Quote,
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
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { BRAND_VOICES } from "@/lib/mockData";

export default function BrandVoicePage() {
  const [voices, setVoices] = useState(BRAND_VOICES);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const setActive = (id) => {
    setVoices((prev) =>
      prev.map((v) => ({ ...v, active: v.id === id }))
    );
    toast.success("Active brand voice updated");
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setVoices((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      toast.success("Brand voice deleted");
    }
    setDeleteTarget(null);
  };

  const handleCreate = (name) => {
    const item = {
      id: `bv${voices.length + 1}`,
      name,
      active: false,
      description: "Analyzing uploaded samples…",
      samples: 0,
      tone: ["Analyzing…"],
      avgSentence: 0,
      lastUsed: null,
      phrases: [],
    };
    setVoices((prev) => [...prev, item]);
    setCreateOpen(false);
    toast.success("Brand voice created — upload samples to train it.");
  };

  const activeVoice = voices.find((v) => v.active);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Personalization"
        title="Brand Voice"
        subtitle="Train the AI to write in your style. Upload sample articles and every future draft will sound like you."
        actions={
          <GradientButton size="md" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New voice profile
          </GradientButton>
        }
      />

      {/* Active voice highlight */}
      {activeVoice && (
        <GlassCard glow="violet" className="p-6 relative overflow-hidden">
          <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest gradient-bg text-white px-2 py-0.5 rounded-full">
            Active
          </span>
          <div className="flex items-start gap-4">
            <span className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg shrink-0">
              <Mic className="h-5 w-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl">{activeVoice.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeVoice.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {activeVoice.tone.map((t) => (
                  <Badge key={t} variant="glass">{t}</Badge>
                ))}
              </div>
              {activeVoice.phrases.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeVoice.phrases.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full glass border border-white/10"
                    >
                      <Quote className="h-3 w-3 text-brand-violet/60" />
                      "{p}"
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{activeVoice.samples} sample articles</span>
                <span>Avg sentence: {activeVoice.avgSentence} words</span>
                {activeVoice.lastUsed && (
                  <span>Last used: {dateFormater(activeVoice.lastUsed, "MMM d")}</span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* All profiles */}
      <section>
        <h2 className="font-display text-xl mb-4">All voice profiles</h2>
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {voices.map((v) => (
            <motion.div key={v.id} variants={staggerItem}>
              <GlassCard
                hover
                className={`p-5 h-full flex flex-col ${
                  v.active ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                  {v.active && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  )}
                </div>

                <h3 className="font-display text-lg mt-4">{v.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">
                  {v.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {v.tone.map((t) => (
                    <Badge key={t} variant="glass" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-4 text-[11px] text-muted-foreground">
                  <span>{v.samples} samples</span>
                  <span>·</span>
                  <span>
                    {v.lastUsed
                      ? `Used ${dateFormater(v.lastUsed, "MMM d")}`
                      : "Never used"}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  {!v.active ? (
                    <Button
                      variant="gradient"
                      size="sm"
                      className="flex-1"
                      onClick={() => setActive(v.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Set active
                    </Button>
                  ) : (
                    <Button variant="glass" size="sm" className="flex-1" disabled>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(v)}
                    disabled={v.active}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Create dialog */}
      <CreateVoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This voice profile and its training data will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CreateVoiceDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setName(""); onOpenChange(o); }}>
      <DialogContent className="glass border border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>New brand voice profile</DialogTitle>
          <DialogDescription>
            Name your voice profile, then upload 3–5 sample articles to train it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Profile name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="e.g. Our Blog Voice" />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Sample articles</Label>
            <div className="mt-1.5 h-32 rounded-xl glass border border-dashed border-white/15 flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-white/30 cursor-pointer transition-colors">
              <Upload className="h-5 w-5 mb-2" />
              <p>Drop 3–5 articles here (TXT, DOCX, or paste URLs)</p>
              <p className="text-[10px] mt-1">We'll analyze tone, vocabulary, and rhythm</p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <GradientButton size="sm" onClick={() => onCreate(name || "Untitled Voice")} disabled={!name.trim()}>
            <Sparkles className="h-4 w-4" /> Create & analyze
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
