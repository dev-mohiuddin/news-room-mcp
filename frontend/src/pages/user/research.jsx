import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, BookOpen, ArrowRight, Save, FileText, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import SourceCard from "@/components/user/SourceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations";
import { RESEARCH_SOURCES, RESEARCH_BRIEF } from "@/lib/mockData";

export default function ResearchPage() {
  const [topic, setTopic] = useState("SEO strategies 2026");
  const [keyword, setKeyword] = useState("seo strategies 2026");
  const [depth, setDepth] = useState("deep");
  const [searching, setSearching] = useState(false);
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [brief, setBrief] = useState(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const handleSearch = () => {
    setSearching(true);
    setBrief(null);
    setTimeout(() => {
      setSources(RESEARCH_SOURCES);
      setSelected([]);
      setSearching(false);
      toast.success(`Found ${RESEARCH_SOURCES.length} sources`);
    }, 1200);
  };

  const toggleSource = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGenerateBrief = () => {
    setGeneratingBrief(true);
    setTimeout(() => {
      setBrief(RESEARCH_BRIEF);
      setGeneratingBrief(false);
      toast.success("Research brief generated");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Research"
        title="Research Hub"
        subtitle="Search the web, score sources, and generate fact-backed research briefs in seconds."
      />

      {/* Input panel */}
      <GlassCard className="p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1.5 bg-transparent border-white/10" placeholder="e.g. AI content marketing" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Target keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="mt-1.5 bg-transparent border-white/10" placeholder="e.g. ai marketing" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Depth</Label>
            <Select value={depth} onValueChange={setDepth}>
              <SelectTrigger className="mt-1.5 bg-transparent border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick (3)</SelectItem>
                <SelectItem value="deep">Deep (10)</SelectItem>
                <SelectItem value="comprehensive">Full (20)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <GradientButton className="w-full" onClick={handleSearch} disabled={searching || !topic.trim()}>
              {searching ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Search sources
                </>
              )}
            </GradientButton>
          </div>
        </div>
      </GlassCard>

      {/* Results */}
      {sources.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sources list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">
                Sources <span className="text-muted-foreground text-sm font-normal">({sources.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {selected.length} selected
              </p>
            </div>

            <motion.div
              variants={staggerContainer(0.04)}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {sources.map((s) => (
                <motion.div key={s.id} variants={staggerItem}>
                  <SourceCard
                    source={s}
                    selected={selected.includes(s.id)}
                    onToggle={toggleSource}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <GlassCard className="p-5 sticky top-4">
              <h4 className="font-display text-base mb-3">Selected ({selected.length})</h4>
              {selected.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Check sources on the left to include them in your brief.
                </p>
              ) : (
                <ul className="space-y-1.5 mb-4">
                  {selected.map((id) => {
                    const s = sources.find((x) => x.id === id);
                    return (
                      <li key={id} className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full gradient-bg shrink-0" />
                        {s?.title}
                      </li>
                    );
                  })}
                </ul>
              )}

              <GradientButton
                className="w-full"
                size="md"
                onClick={handleGenerateBrief}
                disabled={selected.length === 0 || generatingBrief}
              >
                {generatingBrief ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate brief
                  </>
                )}
              </GradientButton>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Brief */}
      <AnimatePresence>
        {brief && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard glow="teal" className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl">Research Brief</h3>
                    <p className="text-xs text-muted-foreground">{brief.keyword} · {selected.length} sources</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="glass" size="sm" onClick={() => toast.success("Brief saved")}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Link to="/dashboard/new-article">
                    <Button variant="gradient" size="sm">
                      <FileText className="h-3.5 w-3.5" /> Use in article
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Thesis</h4>
                  <p className="text-sm leading-relaxed">{brief.thesis}</p>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Key facts</h4>
                  <ul className="space-y-2">
                    {brief.keyFacts.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Zap className="h-3.5 w-3.5 text-brand-teal mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Open questions</h4>
                  <ul className="space-y-2">
                    {brief.questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-brand-violet font-bold">?</span>
                        <span className="text-muted-foreground">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
