import { useState } from "react";
import {
  Sparkles,
  Type,
  Link2,
  HelpCircle,
  BarChart3,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { copyToClipboard } from "@/lib/utils";
import {
  generateMeta,
  generateSlug,
  generateFAQ,
  analyzeKeyword,
} from "@/api/seo/seo";

/**
 * SEO Tools page — fully wired to /api/v1/seo/*.
 *   - Meta:    POST /seo/meta     → { titles[], descriptions[] }
 *   - Slug:    POST /seo/slug     → { primary, alternatives[] } (deterministic)
 *   - FAQ:     POST /seo/faq      → { faqs[] }
 *   - Keyword: POST /seo/keyword  → { volume, difficulty, cpc, intent, related[], aiEstimated }
 *
 * Every call surfaces a friendly toast on failure. The standard
 * backend envelope { success, data, message } is honoured.
 */

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
          <TabsTrigger value="meta" className="gap-1.5">
            <Type className="h-3.5 w-3.5" /> Meta Generator
          </TabsTrigger>
          <TabsTrigger value="slug" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Slug
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> FAQ
          </TabsTrigger>
          <TabsTrigger value="keyword" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Keyword
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <MetaGenerator />
        </TabsContent>
        <TabsContent value="slug">
          <SlugGenerator />
        </TabsContent>
        <TabsContent value="faq">
          <FAQGenerator />
        </TabsContent>
        <TabsContent value="keyword">
          <KeywordAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Meta Generator
 * ────────────────────────────────────────────────────────── */
function MetaGenerator() {
  const [topic, setTopic] = useState("10 SEO Strategies That Work in 2026");
  const [keyword, setKeyword] = useState("seo strategies 2026");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await generateMeta({
        topic: topic.trim(),
        targetKeyword: keyword.trim() || undefined,
      });
      if (!res?.success) {
        toast.error(res?.message || "Could not generate meta");
        return;
      }
      setResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Article title or topic
          </Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1.5 bg-transparent border-white/10"
            placeholder="Paste your article title…"
          />
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Target keyword (optional)
            </Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-1.5 bg-transparent border-white/10"
              placeholder="e.g. seo strategies 2026"
            />
          </div>
          <GradientButton
            size="md"
            onClick={generate}
            disabled={loading || !topic.trim()}
          >
            {loading ? "Generating…" : (
              <>
                <Sparkles className="h-4 w-4" /> Generate
              </>
            )}
          </GradientButton>
        </div>
      </GlassCard>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-3">Meta titles</h3>
            <div className="space-y-2">
              {results.titles?.map((t, i) => (
                <ResultRow key={i} text={t.text} meta={`${t.chars} chars`} />
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <h3 className="font-display text-lg mb-3">Meta descriptions</h3>
            <div className="space-y-2">
              {results.descriptions?.map((d, i) => (
                <ResultRow key={i} text={d.text} meta={`${d.chars}/160 chars`} />
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Slug Generator (deterministic — instant)
 * ────────────────────────────────────────────────────────── */
function SlugGenerator() {
  const [title, setTitle] = useState("10 SEO Strategies That Work in 2026");
  const [primary, setPrimary] = useState("");
  const [alts, setAlts] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await generateSlug({ title: title.trim() });
      if (!res?.success) {
        toast.error(res?.message || "Could not generate slug");
        return;
      }
      setPrimary(res.data?.primary || "");
      setAlts(res.data?.alternatives || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Article title
        </Label>
        <div className="flex gap-3 mt-1.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent border-white/10"
          />
          <GradientButton size="md" onClick={generate} disabled={loading}>
            {loading ? "…" : (
              <>
                <Link2 className="h-4 w-4" /> Generate slug
              </>
            )}
          </GradientButton>
        </div>
      </GlassCard>

      {primary && (
        <GlassCard className="p-5">
          <h3 className="font-display text-lg mb-3">Suggested slug</h3>
          <ResultRow
            text={`/${primary}`}
            meta="SEO-friendly, lowercase, hyphenated"
          />
          {alts.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Alternatives:</p>
              {alts.map((alt, i) => (
                <ResultRow key={i} text={`/${alt}`} meta="" />
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  FAQ Generator
 * ────────────────────────────────────────────────────────── */
function FAQGenerator() {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await generateFAQ({
        topic: topic.trim(),
        targetKeyword: keyword.trim() || undefined,
      });
      if (!res?.success) {
        toast.error(res?.message || "Could not generate FAQ");
        return;
      }
      setFaqs(res.data?.faqs || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Topic
          </Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1.5 bg-transparent border-white/10"
            placeholder="e.g. SEO strategies for 2026"
          />
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Target keyword (optional)
            </Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-1.5 bg-transparent border-white/10"
            />
          </div>
          <GradientButton
            size="md"
            onClick={generate}
            disabled={loading || !topic.trim()}
          >
            {loading ? "Generating…" : (
              <>
                <HelpCircle className="h-4 w-4" /> Generate FAQ
              </>
            )}
          </GradientButton>
        </div>
      </GlassCard>

      {faqs.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">
              Generated FAQ ({faqs.length})
            </h3>
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                copyToClipboard(JSON.stringify(faqs, null, 2));
                toast.success("FAQ JSON copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy schema
            </Button>
          </div>
          <ul className="space-y-3">
            {faqs.map((f, i) => (
              <li
                key={i}
                className="p-4 rounded-lg glass border border-white/5"
              >
                <p className="text-sm font-medium">{f.q}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {f.a}
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Keyword Analyzer
 * ────────────────────────────────────────────────────────── */
function KeywordAnalyzer() {
  const [keyword, setKeyword] = useState("seo strategies 2026");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async (kw) => {
    const trimmed = (kw ?? keyword).trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    setLoading(true);
    try {
      const res = await analyzeKeyword({ keyword: trimmed });
      if (!res?.success) {
        toast.error(res?.message || "Could not analyze keyword");
        return;
      }
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Keyword
        </Label>
        <div className="flex gap-3 mt-1.5">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 bg-transparent border-white/10"
          />
          <GradientButton size="md" onClick={() => analyze()} disabled={loading}>
            {loading ? "Analyzing…" : (
              <>
                <BarChart3 className="h-4 w-4" /> Analyze
              </>
            )}
          </GradientButton>
        </div>
      </GlassCard>

      {result && (
        <>
          {result.aiEstimated && (
            <p className="text-[11px] text-muted-foreground italic">
              Metrics are AI estimates — calibrate against your own analytics
              before relying on them.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <h3 className="font-display text-lg mb-4">Metrics</h3>
              <dl className="space-y-3">
                <Metric
                  label="Search volume"
                  value={`${(result.volume || 0).toLocaleString()} / mo`}
                />
                <Metric
                  label="Difficulty"
                  value={`${result.difficulty || 0}/100`}
                  color={
                    result.difficulty > 70
                      ? "text-red-400"
                      : result.difficulty > 40
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                />
                <Metric
                  label="CPC"
                  value={`$${Number(result.cpc || 0).toFixed(2)}`}
                />
                <Metric label="Intent" value={result.intent || "—"} />
              </dl>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="font-display text-lg mb-4">Related keywords</h3>
              {result.related?.length ? (
                <ul className="space-y-2">
                  {result.related.map((r) => (
                    <li
                      key={r}
                      className="flex items-center justify-between p-2.5 rounded-lg glass border border-white/5"
                    >
                      <span className="text-sm">{r}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => analyze(r)}
                      >
                        Analyze
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No related keywords returned.
                </p>
              )}
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Shared bits
 * ────────────────────────────────────────────────────────── */
function ResultRow({ text, meta }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg glass border border-white/5 hover:border-white/15 group">
      <span className="text-sm flex-1 break-all">{text}</span>
      {meta ? (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {meta}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

function Metric({ label, value, color = "" }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${color}`}>
        {value}
      </dd>
    </div>
  );
}
