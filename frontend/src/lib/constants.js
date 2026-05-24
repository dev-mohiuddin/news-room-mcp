// App-wide constants

export const APP_NAME = "Newsroom MCP";
export const APP_TAGLINE = "Publish Smarter. Write with AI. Reach Further.";
export const SUPPORT_EMAIL = "support@newsroommcp.com";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  USER: "user",
};

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    badge: null,
    description: "Try it out, no credit card.",
    cta: "Start Free",
    features: [
      "10 articles / month",
      "WordPress only",
      "1 user",
      "Basic SEO tools",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 19,
    yearlyPrice: 15,
    badge: "Most Popular",
    description: "For solo publishers.",
    cta: "Start Free Trial",
    highlight: true,
    features: [
      "50 articles / month",
      "WordPress + Ghost",
      "1 user",
      "Full SEO suite",
      "Priority email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    yearlyPrice: 39,
    badge: null,
    description: "For growing teams.",
    cta: "Start Free Trial",
    features: [
      "200 articles / month",
      "All CMS platforms",
      "5 users",
      "Brand voice profiles",
      "Team collaboration",
      "Analytics dashboard",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: 99,
    yearlyPrice: 79,
    badge: null,
    description: "For high-volume agencies.",
    cta: "Contact Sales",
    features: [
      "Unlimited articles",
      "All CMS + White label",
      "Unlimited users",
      "Custom AI models",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

export const FEATURES_LIST = [
  {
    icon: "Search",
    tag: "Research",
    title: "Deep Research, Instantly",
    desc: "Search across 20+ sources, summarize findings, and generate source-backed research briefs in seconds — not hours.",
  },
  {
    icon: "Sparkles",
    tag: "AI Writing",
    title: "From Brief to Full Draft",
    desc: "Claude Sonnet generates complete, publication-ready articles. Every paragraph, heading, and transition crafted for your audience.",
    highlight: true,
  },
  {
    icon: "TrendingUp",
    tag: "SEO",
    title: "Built-in SEO Intelligence",
    desc: "Auto-generate meta titles, descriptions, URL slugs, FAQ schema, and internal link suggestions. Publish ranking-ready content.",
  },
  {
    icon: "Globe",
    tag: "Publishing",
    title: "One-Click Publishing",
    desc: "Connect WordPress, Ghost, Contentful, Sanity, or Notion. Publish directly to your CMS as draft, live, or scheduled.",
  },
  {
    icon: "Mic",
    tag: "Brand Voice",
    title: "Your Voice, Amplified",
    desc: "Train the AI on your writing style. Upload 5 sample articles and every future draft will sound authentically like you.",
  },
  {
    icon: "Users",
    tag: "Teams",
    title: "Built for Teams",
    desc: "Writers, editors, and admins on one platform. Role-based access, approval workflows, and shared brand profiles.",
  },
];

export const HOW_IT_WORKS = [
  {
    n: 1,
    icon: "🔍",
    title: "Research",
    desc: "Enter your topic and target keyword. Our engine searches 20+ sources and builds a fact-backed research brief.",
  },
  {
    n: 2,
    icon: "📋",
    title: "Outline",
    desc: "AI generates a structured outline. Drag, drop, rename — make it yours before the draft is written.",
  },
  {
    n: 3,
    icon: "✍️",
    title: "Draft",
    desc: "Claude writes the full article. Use AI tools to rewrite, expand, or shorten any paragraph inline.",
  },
  {
    n: 4,
    icon: "📈",
    title: "SEO",
    desc: "Auto-generate meta title, description, slug, FAQs. See your SEO score update live as you optimize.",
  },
  {
    n: 5,
    icon: "🚀",
    title: "Publish",
    desc: "Choose your CMS, set featured image, pick publish time. Send to WordPress, Ghost, or Contentful in one click.",
  },
];

export const STATS = [
  { value: 2_400_000, suffix: "+", label: "Articles generated" },
  { value: 12_000, suffix: "+", label: "Publishers" },
  { value: 4.2, suffix: "h", label: "Saved per article" },
  { value: 91, suffix: "/100", label: "Avg SEO score" },
];

export const CMS_LOGOS = [
  "WordPress",
  "Ghost",
  "Notion",
  "Contentful",
  "Sanity",
  "Anthropic",
  "Claude",
  "Brave Search",
  "Firecrawl",
  "DataForSEO",
  "Cloudinary",
  "Stripe",
];

export const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Head of Content",
    company: "TechBuzz Media",
    quote:
      "We went from spending 8 hours on a single article to publishing 3 in a morning. The SEO scores are consistently better than what we were producing manually.",
  },
  {
    name: "Marcus Williams",
    role: "Founder",
    company: "The Daily Stack",
    quote:
      "The brand voice feature is a game-changer. Every article sounds like us, not like a robot. Our engagement metrics went up 40% since switching.",
  },
  {
    name: "Priya Nair",
    role: "Agency Director",
    company: "ContentForge",
    quote:
      "Finally a tool that handles research AND publishing in one place. Our agency manages 12 client blogs with a team of 3. Newsroom MCP made that possible.",
  },
];

export const FAQS = [
  {
    q: "What CMS platforms does Newsroom MCP support?",
    a: "WordPress, Ghost, Contentful, Sanity, and Notion are supported out of the box. We add new integrations every month based on customer demand.",
  },
  {
    q: "Do I need my own API keys to use the platform?",
    a: "No. Free and paid plans include hosted AI access. If you prefer to use your own Anthropic or research API keys for cost control, you can add them in Settings.",
  },
  {
    q: "How does the Brand Voice feature work?",
    a: "Upload 3–5 sample articles. We extract your tone, sentence rhythm, and vocabulary patterns into a profile. Every new draft is generated against that profile.",
  },
  {
    q: "Is there a free plan? What are the limits?",
    a: "Yes. The Free plan includes 10 articles per month, WordPress publishing, and basic SEO tools. No credit card required to start.",
  },
  {
    q: "Can I use Newsroom MCP for my team or agency?",
    a: "The Pro plan supports up to 5 users with role-based access. The Agency plan is unlimited users with white-label and SLA guarantees.",
  },
  {
    q: "How is the AI writing quality? Does it sound natural?",
    a: "We use Claude Sonnet for drafting plus your Brand Voice profile. Most customers publish drafts after a quick edit pass — readers cannot tell the difference.",
  },
  {
    q: "What happens if I exceed my monthly article limit?",
    a: "We will notify you near the limit. You can buy a small overage pack or upgrade in one click. We never publish over your limit silently.",
  },
  {
    q: "Is my data and CMS credentials secure?",
    a: "All credentials are encrypted at rest with AES-256. We are SOC 2 Type I certified, with Type II audit in progress.",
  },
];

/* ── Sidebar nav links ── */

export const SUPER_ADMIN_NAV = [
  { group: "Overview", items: [
    { label: "Dashboard", path: "/admin/dashboard", icon: "LayoutDashboard" },
    { label: "Analytics", path: "/admin/analytics", icon: "BarChart3" },
  ]},
  { group: "Users", items: [
    { label: "Users", path: "/admin/users", icon: "Users" },
    { label: "Plans", path: "/admin/plans", icon: "CreditCard" },
  ]},
  { group: "Content", items: [
    { label: "All Articles", path: "/admin/content", icon: "FileText" },
    { label: "Integrations", path: "/admin/integrations", icon: "Plug" },
  ]},
  { group: "Billing", items: [
    { label: "Billing", path: "/admin/billing", icon: "Wallet" },
  ]},
  { group: "System", items: [
    { label: "Notifications", path: "/admin/notifications", icon: "Bell" },
    { label: "Audit Logs", path: "/admin/logs", icon: "ScrollText" },
    { label: "Support", path: "/admin/support", icon: "LifeBuoy" },
    { label: "Settings", path: "/admin/settings", icon: "Settings" },
  ]},
];

export const USER_NAV = [
  { group: "Workspace", items: [
    { label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
    { label: "New Article", path: "/dashboard/new-article", icon: "Sparkles", highlight: true },
    { label: "Articles", path: "/dashboard/articles", icon: "FileText" },
  ]},
  { group: "Tools", items: [
    { label: "Research", path: "/dashboard/research", icon: "Search" },
    { label: "SEO Tools", path: "/dashboard/seo", icon: "TrendingUp" },
    { label: "CMS", path: "/dashboard/cms", icon: "Globe" },
    { label: "Brand Voice", path: "/dashboard/brand-voice", icon: "Mic" },
    { label: "Templates", path: "/dashboard/templates", icon: "LayoutTemplate" },
  ]},
  { group: "Account", items: [
    { label: "Analytics", path: "/dashboard/analytics", icon: "BarChart3" },
    { label: "Team", path: "/dashboard/team", icon: "Users" },
    { label: "API Keys", path: "/dashboard/api-keys", icon: "Key" },
    { label: "Billing", path: "/dashboard/billing", icon: "Wallet" },
    { label: "Settings", path: "/dashboard/settings", icon: "Settings" },
    { label: "Support", path: "/dashboard/support", icon: "LifeBuoy" },
  ]},
];
