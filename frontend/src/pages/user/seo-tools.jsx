import { useState } from "react";
import { Sparkles, Type, Link2, HelpCircle, BarChart3, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { copyToClipboard } from "@/lib/utils";

export default function SEOToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Optimization"
        title="SEO Tools"
        subtitle="Generate meta titles, descriptions, slugs, and FAQ schema — powered by AI."
      />

      <Tabs defaultValue="meta">
        <TabsList>
          <TabsTrigger value="meta" className="gap-1.5"><Type className="h-3.5 w-3.5" /> Meta Generator</TabsTrigger>
          <TabsTrigger value="slug" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Slug</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> FAQ</TabsTrigger>
          <TabsTrigger value="keyword" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Keyword</TabsTrigger>
        </TabsList>

        <TabsContent value="meta"><MetaGenerator /></TabsContent>
        <TabsContent value="slug"><SlugGenerator /></TabsContent>
        <TabsContent value="faq"><FAQGenerator /></TabsContent>
        <TabsContent value="keyword"><KeywordAnalyzer /></TabsContent>
      </Tabs>
    </div>
  );
}

function MetaGenerator() {
  const [input, setInput] = useState("10 SEO Strategies That Work in 2026");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setResults({
        titles: [
          { text: "10 SEO Strategies That Actually Work in 2026 (Tested)", chars: 54 },
          { text: "The 2026 SEO Playbook: 10 Strategies for Real Rankings", chars: 55 },
          { text: "What Works in SEO for 2026: 10 Proven Strategies", chars: 49 },
        ],
        descriptions: [
          { text: "Discover the 10 SEO strategies that deliver real rankings in 2026. From AI overviews to schema markup — tested across 800+ articles.", chars: 138 },
          { text: "Modern SEO has changed. Learn the 10 approaches that move the needle in 2026, backed by data from 1.2M ranking pages.", chars: 121 },
        ],
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Article title or topic</Label>
        <div className="flex gap-3 mt-1.5">
          <Input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent border-white/10" placeholder="Paste your article title…" />
          <GradientButton size="md" onClick={generate} disabled={loading || !input.trim()}>
            {loading ? "Generating…" : <><Sparkles className="h-4 w-4" /> Generate</>}
          </GradientButton>
        </div>
      </GlassCard>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-3">Meta titles</h3>
            <div className="space-y-2">
              {results.titles.map((t, i) => (
                <ResultRow key={i} text={t.text} meta={`${t.chars} chars`} />
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-3">Meta descriptions</h3>
            <div className="space-y-2">
              {results.descriptions.map((d, i) => (
                <ResultRow key={i} text={d.text} meta={`${d.chars}/160 chars`} />
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function SlugGenerator() {
  const [input, setInput] = useState("10 SEO Strategies That Work in 2026");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setSlug("seo-strategies-2026");
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Article title</Label>
        <div className="flex gap-3 mt-1.5">
          <Input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent border-white/10" />
          <GradientButton size="md" onClick={generate} disabled={loading}>
            {loading ? "…" : <><Link2 className="h-4 w-4" /> Generate slug</>}
          </GradientButton>
        </div>
      </GlassCard>

      {slug && (
        <GlassCard className="p-5">
          <h3 className="font-display text-lg mb-3">Suggested slug</h3>
          <ResultRow text={`/${slug}`} meta="SEO-friendly, lowercase, hyphenated" />
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Alternatives:</p>
            <ResultRow text="/10-seo-strategies-that-work-2026" meta="Long-form" />
            <ResultRow text="/seo-strategies-guide-2026" meta="Compact" />
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function FAQGenerator() {
  const [input, setInput] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setFaqs([
        { q: "What's the most important SEO change in 2026?", a: "AI overviews now appear on 38% of queries. Optimizing for AI inclusion via schema markup and topical depth matters more than chasing the #1 organic spot." },
        { q: "Do keywords still matter in 2026?", a: "Yes, but the unit of relevance is the topic, not the keyword. Pages that cover a topic comprehensively outrank pages stuffed with the exact-match keyword." },
        { q: "How long should articles be in 2026?", a: "Top-ranking pages average 1,847 words. Length isn't a ranking factor on its own — depth and originality are." },
        { q: "Is link-building still effective?", a: "Quality links from topically-relevant sites still help. But internal linking delivers more reliable lifts than manual outreach." },
      ]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Paste article content (or topic)</Label>
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} className="mt-1.5 bg-transparent border-white/10" placeholder="Paste your article text here…" />
        <GradientButton size="md" className="mt-3" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : <><HelpCircle className="h-4 w-4" /> Generate FAQ</>}
        </GradientButton>
      </GlassCard>

      {faqs.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">Generated FAQ ({faqs.length})</h3>
            <Button variant="glass" size="sm" onClick={() => { copyToClipboard(JSON.stringify(faqs, null, 2)); }}>
              <Copy className="h-3.5 w-3.5" /> Copy schema
            </Button>
          </div>
          <ul className="space-y-3">
            {faqs.map((f, i) => (
              <li key={i} className="p-4 rounded-lg glass border border-white/5">
                <p className="text-sm font-medium">{f.q}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.a}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function KeywordAnalyzer() {
  const [keyword, setKeyword] = useState("seo strategies 2026");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = () => {
    setLoading(true);
    setTimeout(() => {
      setResult({
        keyword: keyword,
        volume: 14800,
        difficulty: 67,
        cpc: 4.20,
        intent: "Informational",
        related: ["seo tips 2026", "best seo practices", "google ranking factors 2026", "ai seo strategy", "content seo 2026"],
      });
      setLoading(false);
    }, 900);
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Keyword</Label>
        <div className="flex gap-3 mt-1.5">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="flex-1 bg-transparent border-white/10" />
          <GradientButton size="md" onClick={analyze} disabled={loading}>
            {loading ? "Analyzing…" : <><BarChart3 className="h-4 w-4" /> Analyze</>}
          </GradientButton>
        </div>
      </GlassCard>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-4">Metrics</h3>
            <dl className="space-y-3">
              <Metric label="Search volume" value={`${result.volume.toLocaleString()} / mo`} />
              <Metric label="Difficulty" value={`${result.difficulty}/100`} color={result.difficulty > 70 ? "text-red-400" : result.difficulty > 40 ? "text-amber-400" : "text-emerald-400"} />
              <Metric label="CPC" value={`$${result.cpc.toFixed(2)}`} />
              <Metric label="Intent" value={result.intent} />
            </dl>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-4">Related keywords</h3>
            <ul className="space-y-2">
              {result.related.map((r) => (
                <li key={r} className="flex items-center justify-between p-2.5 rounded-lg glass border border-white/5">
                  <span className="text-sm">{r}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setKeyword(r); analyze(); }}>
                    Analyze
                  </Button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function ResultRow({ text, meta }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg glass border border-white/5 hover:border-white/15 group">
      <span className="text-sm flex-1">{text}</span>
      <span className="text-[10px] text-muted-foreground shrink-0">{meta}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function Metric({ label, value, color = "" }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
