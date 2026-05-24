import { useState } from "react";
import { Plus, Copy, Edit, Trash2, FileText, Clock, LayoutTemplate } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { TEMPLATES } from "@/lib/mockData";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState(TEMPLATES);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [creating, setCreating] = useState(false);

  const openCreate = () => {
    setCreating(true);
    setEditTarget({ id: "", name: "", description: "", category: "", words: 1500 });
  };

  const handleSave = (t) => {
    if (creating) {
      setTemplates((prev) => [
        { ...t, id: `t${prev.length + 1}`, uses: 0, lastUsed: new Date().toISOString() },
        ...prev,
      ]);
      toast.success("Template created");
    } else {
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...t } : x)));
      toast.success("Template updated");
    }
    setEditTarget(null);
    setCreating(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setTemplates((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      toast.success("Template deleted");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Templates"
        subtitle="Save and reuse article prompts and outlines. Start new articles faster."
        actions={
          <GradientButton size="md" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New template
          </GradientButton>
        }
      />

      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {templates.map((t) => (
          <motion.div key={t.id} variants={staggerItem}>
            <GlassCard hover glow="violet" className="p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                  <LayoutTemplate className="h-4 w-4 text-white" />
                </div>
                <Badge variant="glass" className="text-[10px]">
                  {t.category}
                </Badge>
              </div>

              <h3 className="font-display text-lg mt-4 leading-tight">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 flex-1">
                {t.description}
              </p>

              <div className="flex items-center gap-3 mt-4 text-[11px] text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" /> ~{t.words}w
                </span>
                <span className="inline-flex items-center gap-1">
                  <Copy className="h-3 w-3" /> {t.uses} uses
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {dateFormater(t.lastUsed, "MMM d")}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                <Button
                  variant="gradient"
                  size="sm"
                  className="flex-1"
                  onClick={() => toast.success("Starting new article from template…")}
                >
                  Use template
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setCreating(false);
                    setEditTarget(t);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Edit / Create dialog */}
      <TemplateDialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setEditTarget(null);
            setCreating(false);
          }
        }}
        template={editTarget}
        creating={creating}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This template will be permanently removed. Articles created from it are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function TemplateDialog({ open, onOpenChange, template, creating, onSave }) {
  const [draft, setDraft] = useState(template);
  if (template && (!draft || draft.id !== template.id)) setDraft(template);
  if (!draft) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>{creating ? "Create template" : "Edit template"}</DialogTitle>
          <DialogDescription>
            Define the structure and target length for this article template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Name</Label>
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5" placeholder="e.g. Listicle (Top 10)" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Category</Label>
            <Input value={draft.category} onChange={(e) => set("category", e.target.value)} className="mt-1.5" placeholder="e.g. List, Tutorial, Review" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Description / Prompt</Label>
            <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={4} className="mt-1.5" placeholder="Describe the structure, sections, and tone…" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Target word count</Label>
            <Input type="number" value={draft.words} onChange={(e) => set("words", Number(e.target.value))} className="mt-1.5" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange?.(false)}>Cancel</Button>
          <GradientButton size="sm" onClick={() => onSave(draft)}>
            {creating ? "Create" : "Save changes"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
