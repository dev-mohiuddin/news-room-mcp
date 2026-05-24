import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  Edit,
  TrendingUp,
  Rocket,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import SourceCard from "@/components/user/SourceCard";
import WizardStepper from "@/components/user/WizardStepper";
import EditorToolbar from "@/components/user/EditorToolbar";
import SeoScoreRing from "@/components/user/SeoScoreRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeUp } from "@/lib/animations";
import {
  RESEARCH_SOURCES,
  RESEARCH_BRIEF,
  SEO_CHECKS,
  META_TITLE_OPTIONS,
  FAQ_GENERATED,
  MY_CMS_CONNECTIONS,
} from "@/lib/mockData";

const STEPS = [
  { id: "research", label: "Research", hint: "Find sources", icon: Search },
  { id: "outline", label: "Outline", hint: "Structure", icon: FileText },
  { id: "draft", label: "Draft", hint: "AI writes", icon: Edit },
  { id: "seo", label: "SEO", hint: "Optimize", icon: TrendingUp },
  { id: "publish", label: "Publish", hint: "Go live", icon: Rocket },
];

export default function NewArticlePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => Math.min(5, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Create"
        title="New Article"
        subtitle="From research to published — 5 steps."
        actions={
          <Button variant="glass" size="sm" onClick={() => toast.success("Draft saved")}>
            <Save className="h-4 w-4" /> Save draft
          </Button>
        }
      />

      <WizardStepper steps={STEPS} current={step} onStepClick={setStep} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && <StepResearch />}
          {step === 2 && <StepOutline />}
          {step === 3 && <StepDraft />}
          {step === 4 && <StepSEO />}
          {step === 5 && <StepPublish onPublish={() => { toast.success("Article published!"); navigate("/dashboard/articles"); }} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Button variant="ghost" onClick={prev} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">Step {step} of 5</span>
        {step < 5 ? (
          <GradientButton size="md" onClick={next}>
            Next <ArrowRight className="h-4 w-4" />
          </GradientButton>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

/* ─── Step 1: Research ─── */
function StepResearch() {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [depth, setDepth] = useState("deep");
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [brief, setBrief] = useState(null);

  const search = () => { setSources(RESEARCH_SOURCES); setSelected([]); setBrief(null); toast.success("8 sources found"); };
  const genBrief = () => { setBrief(RESEARCH_BRIEF); toast.success("Brief generated"); };
  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1.5 bg-transparent border-white/10" placeholder="e.g. AI content marketing" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="mt-1.5 bg-transparent border-white/10" placeholder="target keyword" />
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
            <GradientButton className="w-full" onClick={search}><Search className="h-4 w-4" /> Search</GradientButton>
          </div>
        </div>
      </GlassCard>

      {sources.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {sources.map((s) => (
              <SourceCard key={s.id} source={s} selected={selected.includes(s.id)} onToggle={toggle} />
            ))}
          </div>
          <GlassCard className="p-5 h-fit sticky top-0">
            <p className="text-xs text-muted-foreground mb-3">{selected.length} sources selected</p>
            <GradientButton className="w-full" size="md" onClick={genBrief} disabled={!selected.length}>
              <Sparkles className="h-4 w-4" /> Generate brief
            </GradientButton>
            {brief && (
              <div className="mt-4 p-3 rounded-lg glass border border-white/5 text-xs space-y-2">
                <p className="font-semibold">{brief.title}</p>
                <p className="text-muted-foreground leading-relaxed">{brief.thesis}</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

/* ─── Step 2: Outline ─── */
function StepOutline() {
  const [sections, setSections] = useState([
    "Introduction — Hook + thesis",
    "1. Topical Authority Over Single Keywords",
    "2. AI Overview Optimization",
    "3. Internal Linking Architecture",
    "4. Content Freshness Signals",
    "5. Schema Markup (FAQ, HowTo, Article)",
    "6. E-E-A-T Signals",
    "7. Core Web Vitals",
    "8. Long-Form Depth + Readability",
    "9. Featured Snippet Targeting",
    "10. Consistent Publishing Cadence",
    "Conclusion — Summary + CTA",
  ]);
  const [wordCount, setWordCount] = useState("1500");
  const [tone, setTone] = useState("professional");

  const move = (i, dir) => {
    const arr = [...sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSections(arr);
  };
  const remove = (i) => setSections((s) => s.filter((_, idx) => idx !== i));
  const add = () => setSections((s) => [...s, "New section"]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-5 lg:col-span-2">
        <h3 className="font-display text-lg mb-4">Article outline</h3>
        <ul className="space-y-2">
          {sections.map((s, i) => (
            <li key={i} className="flex items-center gap-2 p-2.5 rounded-lg glass border border-white/5 group">
              <span className="text-xs text-muted-foreground w-6 text-center tabular-nums">{i + 1}</span>
              <Input value={s} onChange={(e) => { const arr = [...sections]; arr[i] = e.target.value; setSections(arr); }} className="flex-1 h-8 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 px-1" />
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === sections.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </li>
          ))}
        </ul>
        <Button variant="glass" size="sm" className="mt-3" onClick={add}><Plus className="h-3.5 w-3.5" /> Add section</Button>
      </GlassCard>

      <GlassCard className="p-5 h-fit space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Target word count</Label>
          <Select value={wordCount} onValueChange={setWordCount}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="500">~500 words</SelectItem>
              <SelectItem value="1000">~1,000 words</SelectItem>
              <SelectItem value="1500">~1,500 words</SelectItem>
              <SelectItem value="2000">~2,000 words</SelectItem>
              <SelectItem value="3000">~3,000 words</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Writing tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="journalistic">Journalistic</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <GradientButton className="w-full" onClick={() => toast.success("Generating draft…")}>
          <Sparkles className="h-4 w-4" /> Generate draft
        </GradientButton>
      </GlassCard>
    </div>
  );
}

/* ─── Step 3: Draft ─── */
function StepDraft() {
  return (
    <div className="space-y-4">
      <EditorToolbar />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 lg:col-span-3">
          <Input defaultValue="10 SEO Strategies That Work in 2026" className="text-xl font-display border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent mb-4" />
          <Textarea
            rows={22}
            className="border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent text-sm leading-relaxed resize-none"
            defaultValue={`Search engines have changed. Modern SEO is no longer about keyword stuffing or link farms. The strategies that move the needle today center on intent, depth, and AI-readable structure.\n\nIn this article, we walk through the ten approaches our team has measured across 800+ articles in the past 12 months.\n\n## 1. Topical Authority Over Single Keywords\n\nGoogle's algorithms now evaluate your site's expertise on a topic, not just individual page relevance. Building content clusters — a pillar page surrounded by supporting articles — signals depth.\n\n## 2. AI Overview Optimization\n\nWith AI overviews appearing on 38% of queries, structuring content for citation is critical. Use clear headings, factual statements, and schema markup.\n\n## 3. Internal Linking Architecture\n\nOur testing shows that adding 4-6 contextual internal links per article produces a measurable ranking lift within 2-3 weeks.\n\n## 4. Content Freshness Signals\n\nUpdating existing articles with new data, examples, and timestamps outperforms publishing new thin content.\n\n## 5. Schema Markup\n\nPages with FAQ schema see +27% AI overview inclusion. Article schema helps Google understand authorship.`}
          />
        </GlassCard>
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Live stats</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Words</dt><dd className="font-medium tabular-nums">1,420</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Reading time</dt><dd>6 min</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Flesch score</dt><dd>62 (Standard)</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Paragraphs</dt><dd className="tabular-nums">14</dd></div>
            </dl>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              Auto-saved 4s ago
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: SEO ─── */
function StepSEO() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-6 flex flex-col items-center justify-center">
        <SeoScoreRing score={94} />
        <p className="text-xs text-muted-foreground mt-3">{SEO_CHECKS.filter((c) => c.status === "pass").length}/{SEO_CHECKS.length} checks passed</p>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-2">
        <h3 className="font-display text-lg mb-3">Checklist</h3>
        <ul className="space-y-2">
          {SEO_CHECKS.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${c.status === "pass" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                {c.status === "pass" ? "✓" : "!"}
              </span>
              <span className={c.status === "pass" ? "text-muted-foreground" : ""}>{c.label}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-3">
        <h3 className="font-display text-lg mb-3">Meta title options (pick one)</h3>
        <div className="space-y-2">
          {META_TITLE_OPTIONS.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg glass border border-white/5 hover:border-primary/30 cursor-pointer transition-colors">
              <span className="h-6 w-6 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white font-bold">{i + 1}</span>
              <span className="text-sm flex-1">{t}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{t.length} chars</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-3">
        <h3 className="font-display text-lg mb-3">Generated FAQ ({FAQ_GENERATED.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FAQ_GENERATED.map((f, i) => (
            <div key={i} className="p-3 rounded-lg glass border border-white/5">
              <p className="text-sm font-medium">{f.q}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ─── Step 5: Publish ─── */
function StepPublish({ onPublish }) {
  const [cms, setCms] = useState("cms1");
  const [mode, setMode] = useState("now");
  const connected = MY_CMS_CONNECTIONS.filter((c) => c.status === "connected");

  const checks = [
    { label: "SEO score above 80", ok: true },
    { label: "Meta title set", ok: true },
    { label: "Meta description set", ok: true },
    { label: "Featured image set", ok: false },
    { label: "Word count > 1,000", ok: true },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassCard className="p-5 space-y-5">
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Publish to</Label>
          <Select value={cms} onValueChange={setCms}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {connected.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.platform} — {c.siteUrl}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Publish mode</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {[
              { v: "draft", l: "Draft", d: "Save as CMS draft" },
              { v: "now", l: "Publish now", d: "Go live immediately" },
              { v: "schedule", l: "Schedule", d: "Pick date & time" },
            ].map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setMode(m.v)}
                className={`p-3 rounded-lg text-left transition-all ${mode === m.v ? "glass border border-primary/40 ring-2 ring-primary/20" : "glass border border-white/10 hover:border-white/20"}`}
              >
                <p className="text-sm font-medium">{m.l}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.d}</p>
              </button>
            ))}
          </div>
        </div>

        {mode === "schedule" && (
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Schedule date & time
            </Label>
            <Input type="datetime-local" className="mt-1.5" />
          </div>
        )}

        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Featured image</Label>
          <div className="mt-1.5 h-32 rounded-xl glass border border-dashed border-white/15 flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-white/30 cursor-pointer">
            <Upload className="h-5 w-5 mb-2" />
            <p>Drop image or click to upload</p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <GlassCard className="p-5">
          <h3 className="font-display text-lg mb-4">Pre-publish checklist</h3>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${c.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {c.ok ? "✓" : "!"}
                </span>
                <span className={c.ok ? "text-muted-foreground" : ""}>{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            {checks.filter((c) => c.ok).length}/{checks.length} checks passed
          </p>
        </GlassCard>

        <GradientButton className="w-full" size="lg" onClick={onPublish}>
          <Rocket className="h-5 w-5" />
          {mode === "draft" ? "Save as draft" : mode === "schedule" ? "Schedule publish" : "Publish now"}
        </GradientButton>
      </div>
    </div>
  );
}
