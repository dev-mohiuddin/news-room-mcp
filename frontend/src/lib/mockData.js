// Centralized mock data — used across admin pages until real APIs are wired.

export const MOCK_USERS = [
  { id: "u1", name: "Sarah Chen", email: "sarah@techbuzz.io", plan: "pro", status: "active", articles: 142, mrr: 49, createdAt: "2026-04-12T08:32:00Z", avatar: null },
  { id: "u2", name: "Marcus Williams", email: "marcus@dailystack.co", plan: "starter", status: "active", articles: 38, mrr: 19, createdAt: "2026-04-21T14:11:00Z", avatar: null },
  { id: "u3", name: "Priya Nair", email: "priya@contentforge.com", plan: "agency", status: "active", articles: 612, mrr: 99, createdAt: "2026-03-09T11:01:00Z", avatar: null },
  { id: "u4", name: "Diego Alvarez", email: "diego@mediahaus.de", plan: "pro", status: "active", articles: 84, mrr: 49, createdAt: "2026-04-25T09:45:00Z", avatar: null },
  { id: "u5", name: "Aiko Tanaka", email: "aiko@kyoto-press.jp", plan: "starter", status: "suspended", articles: 12, mrr: 0, createdAt: "2026-05-01T07:00:00Z", avatar: null },
  { id: "u6", name: "Liam O'Connor", email: "liam@dublinblog.ie", plan: "free", status: "active", articles: 4, mrr: 0, createdAt: "2026-05-14T22:18:00Z", avatar: null },
  { id: "u7", name: "Fatima Hassan", email: "fatima@cairoreview.eg", plan: "pro", status: "active", articles: 96, mrr: 49, createdAt: "2026-04-03T16:42:00Z", avatar: null },
  { id: "u8", name: "Lukas Berg", email: "lukas@nordpress.no", plan: "starter", status: "active", articles: 27, mrr: 19, createdAt: "2026-05-08T13:09:00Z", avatar: null },
  { id: "u9", name: "Sophie Laurent", email: "sophie@parisledger.fr", plan: "agency", status: "active", articles: 380, mrr: 99, createdAt: "2026-02-21T10:22:00Z", avatar: null },
  { id: "u10", name: "Ravi Sharma", email: "ravi@indiapulse.in", plan: "free", status: "active", articles: 7, mrr: 0, createdAt: "2026-05-18T05:30:00Z", avatar: null },
  { id: "u11", name: "Emma Watson", email: "emma@brittech.uk", plan: "pro", status: "suspended", articles: 51, mrr: 0, createdAt: "2026-04-15T19:00:00Z", avatar: null },
  { id: "u12", name: "Carlos Mendes", email: "carlos@saopaulo-news.br", plan: "starter", status: "active", articles: 22, mrr: 19, createdAt: "2026-05-12T08:00:00Z", avatar: null },
];

export const MOCK_ARTICLES = [
  { id: "a1", title: "10 SEO Strategies That Work in 2026", workspace: "TechBuzz", author: "Sarah Chen", status: "published", words: 1820, cms: "WordPress", createdAt: "2026-05-22T11:00:00Z" },
  { id: "a2", title: "How to Pitch a Story to Major Outlets", workspace: "Daily Stack", author: "Marcus Williams", status: "draft", words: 950, cms: "Ghost", createdAt: "2026-05-23T09:14:00Z" },
  { id: "a3", title: "AI Editing Workflows for Newsrooms", workspace: "ContentForge", author: "Priya Nair", status: "scheduled", words: 1480, cms: "WordPress", createdAt: "2026-05-23T16:33:00Z" },
  { id: "a4", title: "Brand Voice for Technical Documentation", workspace: "MediaHaus", author: "Diego Alvarez", status: "published", words: 2100, cms: "Contentful", createdAt: "2026-05-21T07:42:00Z" },
  { id: "a5", title: "Why Your CMS Choice Matters in 2026", workspace: "Paris Ledger", author: "Sophie Laurent", status: "failed", words: 1340, cms: "Sanity", createdAt: "2026-05-22T22:08:00Z" },
  { id: "a6", title: "Data Storytelling for Journalists", workspace: "TechBuzz", author: "Sarah Chen", status: "published", words: 1675, cms: "WordPress", createdAt: "2026-05-20T13:55:00Z" },
  { id: "a7", title: "The State of Newsletter Publishing", workspace: "Daily Stack", author: "Marcus Williams", status: "draft", words: 720, cms: "Ghost", createdAt: "2026-05-23T05:20:00Z" },
  { id: "a8", title: "Schema Markup Made Simple", workspace: "Cairo Review", author: "Fatima Hassan", status: "published", words: 1900, cms: "WordPress", createdAt: "2026-05-19T18:01:00Z" },
];

export const MOCK_FAILED_PAYMENTS = [
  { id: "p1", user: "Aiko Tanaka", email: "aiko@kyoto-press.jp", amount: 19, attempts: 3, lastAttempt: "2026-05-22T10:00:00Z" },
  { id: "p2", user: "Emma Watson", email: "emma@brittech.uk", amount: 49, attempts: 2, lastAttempt: "2026-05-21T18:14:00Z" },
  { id: "p3", user: "Mateo Rossi", email: "mateo@romanote.it", amount: 99, attempts: 1, lastAttempt: "2026-05-23T03:00:00Z" },
];

export const MOCK_PAYMENTS = [
  { id: "pm1", user: "Sarah Chen", plan: "Pro", amount: 49, status: "paid", date: "2026-05-12T00:00:00Z", invoice: "INV-2451" },
  { id: "pm2", user: "Priya Nair", plan: "Agency", amount: 99, status: "paid", date: "2026-05-09T00:00:00Z", invoice: "INV-2450" },
  { id: "pm3", user: "Marcus Williams", plan: "Starter", amount: 19, status: "paid", date: "2026-05-21T00:00:00Z", invoice: "INV-2449" },
  { id: "pm4", user: "Aiko Tanaka", plan: "Starter", amount: 19, status: "failed", date: "2026-05-22T00:00:00Z", invoice: "INV-2448" },
  { id: "pm5", user: "Diego Alvarez", plan: "Pro", amount: 49, status: "paid", date: "2026-05-25T00:00:00Z", invoice: "INV-2447" },
  { id: "pm6", user: "Sophie Laurent", plan: "Agency", amount: 99, status: "refunded", date: "2026-05-18T00:00:00Z", invoice: "INV-2446" },
];

// 30 days new-user line chart
export const USER_GROWTH_30D = Array.from({ length: 30 }).map((_, i) => ({
  day: `${i + 1}`,
  users: Math.round(20 + Math.random() * 40 + i * 1.2),
}));

// 14 days articles per day
export const ARTICLES_14D = Array.from({ length: 14 }).map((_, i) => ({
  day: `D${i + 1}`,
  articles: Math.round(80 + Math.random() * 120),
}));

// Plan distribution donut
export const PLAN_DISTRIBUTION = [
  { name: "Free", value: 4820, color: "#64748B" },
  { name: "Starter", value: 3210, color: "#3B82F6" },
  { name: "Pro", value: 2940, color: "#8B5CF6" },
  { name: "Agency", value: 1513, color: "#2DD4BF" },
];

// 6 months revenue area
export const REVENUE_6M = [
  { month: "Dec", revenue: 22400 },
  { month: "Jan", revenue: 28100 },
  { month: "Feb", revenue: 31600 },
  { month: "Mar", revenue: 36900 },
  { month: "Apr", revenue: 42500 },
  { month: "May", revenue: 48720 },
];

export const MOCK_INTEGRATIONS = [
  { id: "anthropic", name: "Anthropic", desc: "Default Claude API key for content generation", status: "connected", masked: "sk-ant-…7Q9c", lastTested: "2026-05-23T09:00:00Z" },
  { id: "brave", name: "Brave Search", desc: "Web research source provider", status: "connected", masked: "BSA…2x4f", lastTested: "2026-05-22T14:00:00Z" },
  { id: "stripe", name: "Stripe", desc: "Subscription billing & invoicing", status: "connected", masked: "sk_live_…8mQ", lastTested: "2026-05-23T07:30:00Z" },
  { id: "smtp", name: "Email (SMTP)", desc: "Transactional email delivery", status: "connected", masked: "smtp.resend.com:587", lastTested: "2026-05-23T11:12:00Z" },
  { id: "cloudinary", name: "Cloudinary", desc: "Featured image hosting", status: "disconnected", masked: "—", lastTested: null },
  { id: "datafor", name: "DataForSEO", desc: "Keyword analysis enrichment", status: "disconnected", masked: "—", lastTested: null },
];

export const MOCK_AUDIT_LOGS = [
  { id: "l1", actor: "admin@newsroommcp.com", action: "user.suspend", target: "aiko@kyoto-press.jp", status: "success", time: "2026-05-23T11:42:00Z", ip: "203.0.113.4" },
  { id: "l2", actor: "admin@newsroommcp.com", action: "plan.update", target: "Pro plan", status: "success", time: "2026-05-23T10:01:00Z", ip: "203.0.113.4" },
  { id: "l3", actor: "system", action: "subscription.payment_failed", target: "emma@brittech.uk", status: "warning", time: "2026-05-22T18:14:00Z", ip: "—" },
  { id: "l4", actor: "admin@newsroommcp.com", action: "settings.update", target: "Email config", status: "success", time: "2026-05-22T13:00:00Z", ip: "203.0.113.4" },
  { id: "l5", actor: "system", action: "auth.login_failed", target: "unknown@x.com", status: "error", time: "2026-05-22T09:48:00Z", ip: "198.51.100.32" },
  { id: "l6", actor: "admin@newsroommcp.com", action: "user.activate", target: "diego@mediahaus.de", status: "success", time: "2026-05-21T14:23:00Z", ip: "203.0.113.4" },
  { id: "l7", actor: "system", action: "broadcast.sent", target: "All Pro users (2,940)", status: "success", time: "2026-05-21T11:00:00Z", ip: "—" },
  { id: "l8", actor: "admin@newsroommcp.com", action: "integrations.test", target: "Anthropic", status: "success", time: "2026-05-23T09:00:00Z", ip: "203.0.113.4" },
];

export const MOCK_TICKETS = [
  { id: "t1", subject: "Cannot connect WordPress site", user: "marcus@dailystack.co", priority: "high", status: "open", updatedAt: "2026-05-23T09:00:00Z" },
  { id: "t2", subject: "Refund for May invoice", user: "sophie@parisledger.fr", priority: "medium", status: "open", updatedAt: "2026-05-22T15:14:00Z" },
  { id: "t3", subject: "Brand voice not matching", user: "fatima@cairoreview.eg", priority: "low", status: "pending", updatedAt: "2026-05-21T10:08:00Z" },
  { id: "t4", subject: "API key not working", user: "diego@mediahaus.de", priority: "high", status: "pending", updatedAt: "2026-05-23T08:42:00Z" },
  { id: "t5", subject: "How do I upgrade?", user: "ravi@indiapulse.in", priority: "low", status: "closed", updatedAt: "2026-05-19T12:00:00Z" },
  { id: "t6", subject: "Article generation stuck", user: "lukas@nordpress.no", priority: "medium", status: "closed", updatedAt: "2026-05-18T07:00:00Z" },
];

export const MOCK_BROADCAST_HISTORY = [
  { id: "b1", subject: "🎉 Newsroom MCP v2 is here", audience: "All users", recipients: 12483, sentAt: "2026-05-21T11:00:00Z", openRate: 38.4 },
  { id: "b2", subject: "Scheduled maintenance — May 25", audience: "Pro + Agency", recipients: 4453, sentAt: "2026-05-18T09:00:00Z", openRate: 62.1 },
  { id: "b3", subject: "New CMS integration: Sanity", audience: "Pro + Agency", recipients: 4453, sentAt: "2026-05-10T14:00:00Z", openRate: 47.8 },
];


/* ============================================================
   USER PANEL MOCK DATA
   ============================================================ */

export const MY_ARTICLES = [
  { id: "ma1",  title: "10 SEO Strategies That Work in 2026",                    status: "published", words: 1820, readingTime: 7,  cms: "WordPress",  seoScore: 94, keyword: "seo strategies 2026",   tags: ["SEO", "Marketing"],     author: "You",            views: 12480, updatedAt: "2026-05-22T11:00:00Z", publishedAt: "2026-05-22T15:00:00Z" },
  { id: "ma2",  title: "How to Pitch a Story to Major Outlets",                  status: "draft",     words: 950,  readingTime: 4,  cms: "Ghost",       seoScore: 71, keyword: "media pitching",         tags: ["PR", "Media"],          author: "Sarah Chen",     views: 0,     updatedAt: "2026-05-23T09:14:00Z", publishedAt: null },
  { id: "ma3",  title: "AI Editing Workflows for Newsrooms",                     status: "scheduled", words: 1480, readingTime: 6,  cms: "WordPress",  seoScore: 88, keyword: "ai editing newsroom",    tags: ["AI", "Editorial"],     author: "You",            views: 0,     updatedAt: "2026-05-23T16:33:00Z", publishedAt: "2026-05-26T09:00:00Z" },
  { id: "ma4",  title: "Brand Voice for Technical Documentation",                status: "published", words: 2100, readingTime: 9,  cms: "Contentful", seoScore: 91, keyword: "technical brand voice",  tags: ["Brand", "Docs"],        author: "You",            views: 4820,  updatedAt: "2026-05-21T07:42:00Z", publishedAt: "2026-05-21T12:00:00Z" },
  { id: "ma5",  title: "Why Your CMS Choice Matters in 2026",                    status: "failed",    words: 1340, readingTime: 5,  cms: "Sanity",     seoScore: 79, keyword: "cms comparison",         tags: ["CMS"],                  author: "You",            views: 0,     updatedAt: "2026-05-22T22:08:00Z", publishedAt: null },
  { id: "ma6",  title: "Data Storytelling for Journalists",                      status: "published", words: 1675, readingTime: 7,  cms: "WordPress",  seoScore: 92, keyword: "data storytelling",      tags: ["Journalism", "Data"],   author: "You",            views: 8730,  updatedAt: "2026-05-20T13:55:00Z", publishedAt: "2026-05-20T16:00:00Z" },
  { id: "ma7",  title: "The State of Newsletter Publishing",                     status: "draft",     words: 720,  readingTime: 3,  cms: "Ghost",       seoScore: 64, keyword: "newsletter trends",      tags: ["Newsletters"],          author: "Marcus W.",      views: 0,     updatedAt: "2026-05-23T05:20:00Z", publishedAt: null },
  { id: "ma8",  title: "Schema Markup Made Simple",                              status: "published", words: 1900, readingTime: 8,  cms: "WordPress",  seoScore: 95, keyword: "schema markup guide",    tags: ["SEO", "Technical"],    author: "You",            views: 15920, updatedAt: "2026-05-19T18:01:00Z", publishedAt: "2026-05-19T20:00:00Z" },
  { id: "ma9",  title: "Repurposing Long-Form into Social",                      status: "draft",     words: 540,  readingTime: 2,  cms: "WordPress",  seoScore: 58, keyword: "content repurposing",    tags: ["Social", "Strategy"],   author: "You",            views: 0,     updatedAt: "2026-05-23T10:08:00Z", publishedAt: null },
  { id: "ma10", title: "Interview Techniques for Better Quotes",                 status: "published", words: 1280, readingTime: 5,  cms: "WordPress",  seoScore: 86, keyword: "interview techniques",   tags: ["Journalism"],          author: "You",            views: 3210,  updatedAt: "2026-05-18T14:00:00Z", publishedAt: "2026-05-18T16:00:00Z" },
  { id: "ma11", title: "How AI Changes the Editorial Workflow",                  status: "scheduled", words: 1560, readingTime: 6,  cms: "Ghost",       seoScore: 89, keyword: "ai editorial",           tags: ["AI", "Editorial"],     author: "You",            views: 0,     updatedAt: "2026-05-23T08:00:00Z", publishedAt: "2026-05-27T10:00:00Z" },
  { id: "ma12", title: "Writing Listicles That Don't Feel Cheap",                status: "published", words: 1100, readingTime: 4,  cms: "WordPress",  seoScore: 82, keyword: "listicle writing",       tags: ["Writing"],              author: "You",            views: 5640,  updatedAt: "2026-05-17T11:00:00Z", publishedAt: "2026-05-17T13:00:00Z" },
  { id: "ma13", title: "Localizing Content for Asian Markets",                   status: "draft",     words: 1820, readingTime: 7,  cms: "WordPress",  seoScore: 76, keyword: "asia content localization", tags: ["Localization"],     author: "Aiko T.",        views: 0,     updatedAt: "2026-05-22T03:00:00Z", publishedAt: null },
  { id: "ma14", title: "Featured Image Strategies That Convert",                 status: "published", words: 980,  readingTime: 4,  cms: "WordPress",  seoScore: 84, keyword: "featured image seo",     tags: ["SEO", "Images"],       author: "You",            views: 7180,  updatedAt: "2026-05-15T19:00:00Z", publishedAt: "2026-05-16T08:00:00Z" },
  { id: "ma15", title: "Headline Patterns That Drive Clicks Without Clickbait",  status: "published", words: 1340, readingTime: 5,  cms: "WordPress",  seoScore: 88, keyword: "headline patterns",      tags: ["Headlines", "Copy"],   author: "You",            views: 9420,  updatedAt: "2026-05-14T10:00:00Z", publishedAt: "2026-05-14T12:00:00Z" },
];

export const ARTICLE_TABS_COUNT = {
  all: MY_ARTICLES.length,
  draft: MY_ARTICLES.filter((a) => a.status === "draft").length,
  scheduled: MY_ARTICLES.filter((a) => a.status === "scheduled").length,
  published: MY_ARTICLES.filter((a) => a.status === "published").length,
  failed: MY_ARTICLES.filter((a) => a.status === "failed").length,
};

export const ARTICLE_VERSIONS = [
  { id: "v1", label: "Auto-saved", time: "2026-05-23T11:42:00Z", words: 1820, by: "You" },
  { id: "v2", label: "Draft saved", time: "2026-05-23T10:15:00Z", words: 1612, by: "You" },
  { id: "v3", label: "AI rewrite section", time: "2026-05-23T09:50:00Z", words: 1485, by: "Claude" },
  { id: "v4", label: "Initial draft", time: "2026-05-23T09:00:00Z", words: 1240, by: "Claude" },
];

export const RESEARCH_SOURCES = [
  { id: "s1", title: "The 2026 SEO Playbook by Search Engine Land",     url: "https://searchengineland.com/2026-seo-playbook",        domain: "searchengineland.com", score: 96, date: "2026-04-12", summary: "Comprehensive 2026 SEO trends from technical SEO, AI overviews, E-E-A-T, and internal linking strategies. Includes case studies from B2B and B2C publishers.", reading: "12 min" },
  { id: "s2", title: "Google Search Central — AI overviews update",     url: "https://developers.google.com/search/blog/2026/ai-overviews", domain: "developers.google.com", score: 94, date: "2026-03-28", summary: "Google's official guidance on optimizing for AI overviews. Schema markup, content depth, and citation patterns matter more than ever.", reading: "8 min" },
  { id: "s3", title: "Ahrefs study — what ranks in 2026",                url: "https://ahrefs.com/blog/2026-ranking-study",            domain: "ahrefs.com",             score: 92, date: "2026-04-02", summary: "Analysis of 1.2M ranking pages. Topical authority and content freshness emerge as the strongest signals.", reading: "15 min" },
  { id: "s4", title: "Backlinko's 2026 SEO experiment",                  url: "https://backlinko.com/seo-2026-experiment",             domain: "backlinko.com",          score: 90, date: "2026-03-15", summary: "Brian Dean's hands-on testing of 14 ranking factors. Internal linking and content updates produced biggest gains.", reading: "18 min" },
  { id: "s5", title: "Moz — local + AI search convergence",              url: "https://moz.com/blog/local-ai-search-2026",             domain: "moz.com",                score: 87, date: "2026-04-19", summary: "How local pack and AI answer engines are merging. Schema and reviews drive both surfaces simultaneously.", reading: "10 min" },
  { id: "s6", title: "Semrush content benchmark report",                 url: "https://semrush.com/blog/2026-content-benchmark",       domain: "semrush.com",            score: 84, date: "2026-04-08", summary: "Average word count, headings, and schema usage of top-10 ranking articles across 22 industries.", reading: "14 min" },
  { id: "s7", title: "HubSpot — pillar content strategy",                url: "https://hubspot.com/blog/pillar-content-2026",          domain: "hubspot.com",            score: 81, date: "2026-02-20", summary: "Pillar pages still work in 2026 if structured for AI overviews. Topic clusters with linked subpages outperform thin posts.", reading: "9 min" },
  { id: "s8", title: "Search Engine Journal — schema in the AI era",     url: "https://searchenginejournal.com/schema-ai-2026",        domain: "searchenginejournal.com", score: 78, date: "2026-04-25", summary: "Schema markup is no longer optional. Article, FAQ, and HowTo schemas dramatically improve AI overview inclusion rates.", reading: "11 min" },
];

export const RESEARCH_BRIEF = {
  title: "10 SEO Strategies That Work in 2026",
  keyword: "seo strategies 2026",
  thesis:
    "Modern SEO in 2026 has shifted from keyword stuffing to AI-readable, topical authority and schema-driven content. Pages that win combine depth, freshness, structured data, and internal linking — not gaming algorithms.",
  keyFacts: [
    "AI overviews now appear on 38% of search queries (Google, March 2026).",
    "Top-ranking pages average 1,847 words and 6+ headings (Semrush).",
    "Schema markup correlates with +27% AI overview inclusion rates.",
    "Internal linking + content freshness produce the largest ranking lifts.",
  ],
  questions: [
    "How should publishers structure articles for both AI overviews and traditional rankings?",
    "Which schema types matter most for editorial content?",
    "What's the ideal cadence for refreshing existing articles?",
  ],
};

export const BRAND_VOICES = [
  { id: "bv1", name: "Editorial — Default",         active: true,  description: "Authoritative editorial voice for tech and business articles.", samples: 5, tone: ["Professional", "Confident", "Concise"], avgSentence: 14, lastUsed: "2026-05-23T08:00:00Z", phrases: ["Here's what matters", "The bottom line is", "It's not just about"] },
  { id: "bv2", name: "Casual Blog Voice",            active: false, description: "Friendly, conversational tone for lifestyle and how-to posts.", samples: 4, tone: ["Friendly", "Witty", "Approachable"], avgSentence: 11, lastUsed: "2026-05-18T14:00:00Z", phrases: ["Honestly", "You'll love this", "Quick story"] },
  { id: "bv3", name: "Technical Docs",               active: false, description: "Precise, instructional tone for developer documentation.",     samples: 6, tone: ["Precise", "Instructional", "Direct"], avgSentence: 17, lastUsed: "2026-05-10T11:00:00Z", phrases: ["To configure this", "Note that", "The following example"] },
];

export const TEMPLATES = [
  { id: "t1", name: "Listicle (Top 10)",          description: "Numbered list article with strong intro, 10 items each with subhead + 2-3 paragraphs, and conclusion.", uses: 24, lastUsed: "2026-05-22T10:00:00Z", category: "List", words: 1500 },
  { id: "t2", name: "How-to Guide",                description: "Step-by-step tutorial with intro, prerequisites, numbered steps, troubleshooting, and FAQ.",            uses: 18, lastUsed: "2026-05-20T15:00:00Z", category: "Tutorial", words: 1800 },
  { id: "t3", name: "Product Comparison",          description: "Side-by-side comparison of 3-5 products: criteria table, pros/cons, recommendation.",                    uses: 12, lastUsed: "2026-05-15T09:00:00Z", category: "Review", words: 2200 },
  { id: "t4", name: "News Roundup",                description: "Weekly digest format with 5-7 short news items, each with link and 2-paragraph commentary.",            uses: 31, lastUsed: "2026-05-23T07:00:00Z", category: "News", words: 1100 },
  { id: "t5", name: "Case Study",                  description: "Customer success story: challenge, approach, results with metrics, and key takeaways.",                  uses: 8,  lastUsed: "2026-05-12T13:00:00Z", category: "Long-form", words: 1900 },
  { id: "t6", name: "Trend Analysis",              description: "Industry trend deep-dive with data, expert quotes, predictions, and actionable insights.",              uses: 14, lastUsed: "2026-05-19T17:00:00Z", category: "Analysis", words: 2400 },
];

export const MY_TEAM_MEMBERS = [
  { id: "tm1", name: "You",            email: "user@newsroommcp.com", role: "owner",  status: "active",  joinedAt: "2026-01-15T00:00:00Z", articles: 142 },
  { id: "tm2", name: "Marcus Williams", email: "marcus@dailystack.co", role: "editor", status: "active",  joinedAt: "2026-02-08T00:00:00Z", articles: 38  },
  { id: "tm3", name: "Aiko Tanaka",     email: "aiko@kyoto-press.jp",  role: "writer", status: "active",  joinedAt: "2026-03-22T00:00:00Z", articles: 27  },
  { id: "tm4", name: "Lukas Berg",      email: "lukas@nordpress.no",   role: "writer", status: "active",  joinedAt: "2026-04-11T00:00:00Z", articles: 14  },
  { id: "tm5", name: "Sophie Laurent",  email: "sophie@parisledger.fr", role: "viewer", status: "active",  joinedAt: "2026-04-25T00:00:00Z", articles: 0   },
];

export const PENDING_INVITES = [
  { id: "inv1", email: "diego@mediahaus.de",  role: "editor", sentAt: "2026-05-21T14:00:00Z" },
  { id: "inv2", email: "ravi@indiapulse.in",  role: "writer", sentAt: "2026-05-22T11:30:00Z" },
];

export const USER_API_KEYS = [
  { id: "k1", name: "Production",  key: "nrm_live_a8f3...x4Q9", createdAt: "2026-03-12T00:00:00Z", lastUsed: "2026-05-23T10:00:00Z", scope: "All endpoints" },
  { id: "k2", name: "Staging",     key: "nrm_live_b2k7...m3R8", createdAt: "2026-04-08T00:00:00Z", lastUsed: "2026-05-22T14:00:00Z", scope: "Read only" },
  { id: "k3", name: "Local dev",   key: "nrm_live_c9p4...n7T2", createdAt: "2026-05-01T00:00:00Z", lastUsed: "2026-05-20T09:00:00Z", scope: "Articles + Research" },
];

export const PROVIDER_KEYS = [
  { id: "anthropic", name: "Anthropic",   description: "Override platform key with your own Claude API key for cost control.", connected: true,  masked: "sk-ant-…7Q9c", placeholder: "sk-ant-..." },
  { id: "brave",     name: "Brave Search", description: "Plug in your own search API key to skip platform research limits.",     connected: false, masked: "—",            placeholder: "BSA..." },
  { id: "openai",    name: "OpenAI",      description: "Optional fallback model when Claude is rate-limited.",                   connected: false, masked: "—",            placeholder: "sk-..." },
];

export const USER_INVOICES = [
  { id: "i1", number: "INV-2451", date: "2026-05-12T00:00:00Z", amount: 49, status: "paid",   plan: "Pro", method: "•••• 4242" },
  { id: "i2", number: "INV-2380", date: "2026-04-12T00:00:00Z", amount: 49, status: "paid",   plan: "Pro", method: "•••• 4242" },
  { id: "i3", number: "INV-2305", date: "2026-03-12T00:00:00Z", amount: 49, status: "paid",   plan: "Pro", method: "•••• 4242" },
  { id: "i4", number: "INV-2228", date: "2026-02-12T00:00:00Z", amount: 19, status: "paid",   plan: "Starter", method: "•••• 4242" },
  { id: "i5", number: "INV-2151", date: "2026-01-12T00:00:00Z", amount: 19, status: "paid",   plan: "Starter", method: "•••• 4242" },
  { id: "i6", number: "INV-2079", date: "2025-12-12T00:00:00Z", amount: 19, status: "paid",   plan: "Starter", method: "•••• 4242" },
];

export const MY_TICKETS = [
  { id: "mt1", subject: "Cannot connect WordPress site",  priority: "high",   status: "open",    updatedAt: "2026-05-23T09:00:00Z", lastReply: "2026-05-23T11:14:00Z", replies: 2 },
  { id: "mt2", subject: "How to export article history?", priority: "low",    status: "pending", updatedAt: "2026-05-22T15:00:00Z", lastReply: "2026-05-22T17:00:00Z", replies: 3 },
  { id: "mt3", subject: "Brand voice not picking tone",   priority: "medium", status: "closed",  updatedAt: "2026-05-19T08:00:00Z", lastReply: "2026-05-20T10:00:00Z", replies: 5 },
  { id: "mt4", subject: "Billing question — proration",   priority: "low",    status: "closed",  updatedAt: "2026-05-15T13:00:00Z", lastReply: "2026-05-16T09:00:00Z", replies: 4 },
];

export const USER_FAQS = [
  { q: "How do I connect my WordPress site?",        a: "Go to CMS Connections → Add Connection → WordPress. You'll need your site URL and an Application Password (not your login password)." },
  { q: "Can I edit AI-generated drafts before publishing?", a: "Absolutely. Every draft lands in our editor with full AI tools. You can rewrite, expand, or shorten any paragraph inline before publishing." },
  { q: "What happens if I exceed my monthly article limit?", a: "We'll notify you at 80% usage. You can upgrade in one click, or buy a small overage pack from the Billing page." },
  { q: "How does Brand Voice training work?",        a: "Upload 3–5 sample articles in your style. We extract tone, vocabulary, and rhythm into a profile. Every new draft is generated against that profile." },
  { q: "Are my CMS credentials secure?",             a: "All credentials are encrypted with AES-256 at rest. We never store your password — only encrypted tokens." },
  { q: "Can I cancel my subscription anytime?",      a: "Yes. Cancel from Billing → Subscription. You'll keep access until the end of the current billing period." },
];

export const USER_DAILY_VIEWS = Array.from({ length: 30 }).map((_, i) => ({
  day: `${i + 1}`,
  views: Math.round(140 + Math.random() * 220 + i * 4),
}));

export const ARTICLE_PERFORMANCE_TRAFFIC = [
  { source: "Organic Search",   value: 58 },
  { source: "Direct",           value: 18 },
  { source: "Social",           value: 14 },
  { source: "Referral",         value: 7 },
  { source: "Email",            value: 3 },
];

export const SEO_CHECKS = [
  { id: "kw_density", label: "Keyword density 1.2%",          status: "pass" },
  { id: "kw_intro",   label: "Keyword in introduction",        status: "pass" },
  { id: "meta_title", label: "Meta title 58 chars",            status: "pass" },
  { id: "meta_desc",  label: "Meta description 152 chars",     status: "pass" },
  { id: "h_struct",   label: "Heading hierarchy valid",        status: "pass" },
  { id: "internal",   label: "Internal links 4 found",         status: "pass" },
  { id: "external",   label: "External authority links 3",     status: "pass" },
  { id: "alt_text",   label: "Image alt text",                 status: "warn" },
  { id: "schema",     label: "FAQ schema present",             status: "pass" },
  { id: "freshness",  label: "Date stamp & last updated",      status: "pass" },
];

export const META_TITLE_OPTIONS = [
  "10 SEO Strategies That Actually Work in 2026 (Tested)",
  "The 2026 SEO Playbook: 10 Strategies for Real Rankings",
  "What Works in SEO for 2026: 10 Proven Strategies",
];

export const FAQ_GENERATED = [
  { q: "What's the most important SEO change in 2026?",     a: "AI overviews now appear on 38% of queries. Optimizing for AI inclusion via schema markup and topical depth matters more than chasing the #1 organic spot." },
  { q: "Do keywords still matter in 2026?",                  a: "Yes, but the unit of relevance is the topic, not the keyword. Pages that cover a topic comprehensively outrank pages stuffed with the exact-match keyword." },
  { q: "How long should articles be in 2026?",               a: "Top-ranking pages average 1,847 words. Length isn't a ranking factor on its own — depth and originality are. Match the search intent's complexity." },
  { q: "Is link-building still effective?",                  a: "Quality links from topically-relevant sites still help. But internal linking inside your own content cluster delivers more reliable lifts than manual outreach in 2026." },
];

export const INTERNAL_LINK_SUGGESTIONS = [
  { title: "Schema Markup Made Simple",          slug: "/schema-markup-guide",        anchor: "schema markup" },
  { title: "Featured Image Strategies That Convert", slug: "/featured-image-strategies", anchor: "featured images" },
  { title: "Headline Patterns That Drive Clicks", slug: "/headline-patterns",          anchor: "compelling headlines" },
  { title: "Brand Voice for Technical Documentation", slug: "/brand-voice-tech-docs",   anchor: "brand voice training" },
];

/* CMS connections (per workspace) */
export const MY_CMS_CONNECTIONS = [
  { id: "cms1", platform: "WordPress",  status: "connected",    siteUrl: "https://blog.example.com",        lastSync: "2026-05-23T10:00:00Z", phase: "Phase 1", default: true,  authMethod: "App Password" },
  { id: "cms2", platform: "Ghost",      status: "connected",    siteUrl: "https://newsletter.example.com",  lastSync: "2026-05-22T14:00:00Z", phase: "Phase 2", default: false, authMethod: "Admin API Key" },
  { id: "cms3", platform: "Notion",     status: "disconnected", siteUrl: "—",                                 lastSync: null,                    phase: "Phase 2", default: false, authMethod: "OAuth2" },
  { id: "cms4", platform: "Contentful", status: "connected",    siteUrl: "Space xy7k4",                       lastSync: "2026-05-21T09:00:00Z", phase: "Phase 3", default: false, authMethod: "Management Token" },
  { id: "cms5", platform: "Sanity",     status: "disconnected", siteUrl: "—",                                 lastSync: null,                    phase: "Phase 3", default: false, authMethod: "API Token" },
];
