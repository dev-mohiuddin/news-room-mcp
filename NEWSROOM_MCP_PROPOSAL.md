# Newsroom MCP

## AI-Powered Content Publishing Platform — Project Proposal

---

**Prepared for:** [Client Name]
**Document version:** 1.0
**Date:** May 2026
**Status:** Frontend Complete • Backend Boilerplate Ready • Ready for Demo

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [Product Vision](#3-product-vision)
4. [Technology Architecture](#4-technology-architecture)
5. [Public-Facing Experience](#5-public-facing-experience)
6. [Authentication System](#6-authentication-system)
7. [Super Admin Panel — Complete Walkthrough](#7-super-admin-panel--complete-walkthrough)
8. [User Panel — Complete Walkthrough](#8-user-panel--complete-walkthrough)
9. [AI Agent Architecture](#9-ai-agent-architecture)
10. [End-to-End Workflows](#10-end-to-end-workflows)
11. [Security, Privacy & Compliance](#11-security-privacy--compliance)
12. [Pricing & Business Model](#12-pricing--business-model)
13. [Project Delivery Status](#13-project-delivery-status)
14. [Demo Access](#14-demo-access)
15. [Roadmap](#15-roadmap)

---

## 1. Executive Summary

**Newsroom MCP** is a production-grade Software-as-a-Service (SaaS) platform that connects AI assistants to the complete article publishing workflow — from topic research to live CMS publication. The platform empowers publishers, bloggers, agencies, and newsrooms to compress what previously took 6 to 8 hours of work into approximately 30 minutes, without compromising editorial quality or brand voice consistency.

The system has been designed and developed as a multi-tenant SaaS platform with two distinct operational interfaces: a **Super Admin Panel** for platform owners to manage the entire ecosystem, and a **User Panel** for paying customers (tenants) who use the platform to create and publish content. A premium glassmorphism design language unifies both interfaces, providing an experience comparable to industry-leading SaaS products such as Linear, Vercel, and Stripe.

### Current Delivery Status

| Layer | Status | Coverage |
|---|---|---|
| **Public Landing Page** | ✅ Complete | All 11 sections animated |
| **Authentication System** | ✅ Complete | Login, register, forgot/reset, demo accounts |
| **Super Admin Panel** | ✅ Complete | All 12 pages fully designed and functional |
| **User Panel** | ✅ Complete | All 15 pages including 5-step article wizard |
| **Design System** | ✅ Complete | Dark + Light mode, glassmorphism, gradient palette |
| **Backend Boilerplate** | ✅ Complete | Scalable folder structure, utilities, middlewares |
| **AI Agent Integration** | 🔄 Next phase | Architecture designed, ready for implementation |
| **Database & API logic** | 🔄 Next phase | Schemas designed in system document |

The frontend is fully demoable today. The client can experience every screen, interact with every form, and walk through the complete user journey. Mock data is intelligently embedded so that every page demonstrates real-world scenarios.

---

## 2. The Problem We're Solving

Modern content publishing is fragmented across too many tools and manual steps. A single article typically requires:

1. **Research** — Opening 10-20 browser tabs, reading sources, taking notes, manually summarizing findings
2. **Outlining** — Structuring sections, deciding on depth and angle
3. **Writing** — Producing 1,500 to 3,000 words of original, on-brand content
4. **SEO Optimization** — Crafting meta titles, descriptions, slugs, FAQ schema, internal links
5. **CMS Publishing** — Switching to WordPress or Ghost, formatting, uploading images, scheduling

This workflow consumes 6-8 hours per article for skilled writers. For publishers running multiple blogs or newsrooms producing daily content, the bottleneck is severe. Existing AI writing tools handle one or two of these steps but force users to coordinate the rest manually.

### The market gap

| Existing tool category | What it does | What it misses |
|---|---|---|
| AI writers (Jasper, Copy.ai) | Generate text | No research, no SEO, no CMS connection |
| SEO tools (Surfer, Frase) | Optimize for search | No writing, no publishing |
| Research tools (Perplexity) | Find sources | No structured output for publishing |
| CMS plugins (Yoast) | Format & publish | No AI content generation |

**Newsroom MCP unifies all five steps into a single, AI-orchestrated workflow.**

---

## 3. Product Vision

### Tagline

> Publish Smarter. Write with AI. Reach Further.

### Core promise

A publisher logs in, types a topic, and within 30 minutes has a researched, written, SEO-optimized article live on their WordPress, Ghost, Contentful, Sanity, or Notion site — all matched to their unique brand voice, with quality indistinguishable from human-written content.

### Target audience

| Segment | Profile | Plan fit |
|---|---|---|
| **Solo bloggers** | Hobbyist or part-time content creators | Free / Starter |
| **Independent publishers** | Small newsletter or niche blog operators | Starter / Pro |
| **Content agencies** | Manage 3-15 client blogs | Pro / Agency |
| **Newsrooms** | Editorial teams producing daily content | Pro / Agency |
| **Enterprise content teams** | Brand publications, corporate blogs | Agency |

### Value propositions by segment

- **Solo publisher:** Reduce article production time from 8 hours to 30 minutes; maintain consistent quality
- **Agency:** Manage multiple client brand voices from one dashboard; scale content output 10x without hiring
- **Newsroom:** Free editorial staff from research and SEO formatting to focus on high-value journalism
- **Enterprise:** Centralize content production with role-based workflow, audit logs, and compliance tracking

---

## 4. Technology Architecture

### Frontend Stack

| Technology | Purpose |
|---|---|
| **React 19** | Modern UI framework with concurrent features |
| **Vite 6** | Lightning-fast development and build tooling |
| **Redux Toolkit + Persist** | Global state management with session persistence |
| **React Router v7** | Nested routing with role-based guards |
| **Shadcn UI + Radix Primitives** | Accessible, composable component library |
| **Tailwind CSS v4** | Utility-first styling with custom design tokens |
| **Framer Motion** | Production-grade animations and page transitions |
| **React Hook Form + Zod** | Type-safe form handling with validation |
| **Recharts** | Data visualization for analytics dashboards |
| **Axios** | HTTP client with interceptors and automatic auth |
| **Sonner** | Beautiful toast notifications |


### Backend Stack

| Technology | Purpose |
|---|---|
| **Node.js 20 LTS** | Server runtime |
| **Express.js 5** | REST API framework |
| **MongoDB + Mongoose** | Document database with ODM |
| **Socket.io** | Real-time updates for AI generation streaming |
| **JWT + bcrypt** | Authentication and password hashing |
| **Winston** | Structured logging with file rotation |
| **Redis + BullMQ** | Background job queue for async AI tasks |
| **Anthropic Claude API** | Primary AI engine (Sonnet + Haiku) |
| **Cloudinary** | Featured image storage and CDN delivery |
| **Stripe** | Subscription billing |

### Architectural Layers

The platform follows a strict separation of concerns:

```
┌─────────────────────────────────────────────────┐
│  Presentation Layer (React SPA)                 │
│  ├─ Public Landing                              │
│  ├─ Auth Surface                                │
│  ├─ Super Admin Panel                           │
│  └─ User Panel (multi-tenant)                   │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│  API Layer (Express REST + WebSocket)           │
│  ├─ Routes → Controllers → Services             │
│  ├─ Repositories → Models                       │
│  ├─ Smart response handler (auto-pagination)    │
│  └─ Role-based authorization middleware         │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│  Data Layer (MongoDB)                           │
│  ├─ Tenant-isolated collections                 │
│  ├─ Workspace-scoped queries                    │
│  └─ Audit trail for all critical actions        │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│  AI Orchestration Layer                         │
│  ├─ Research Agent → Web search + scraping      │
│  ├─ Writing Agent → Claude Sonnet drafting      │
│  ├─ SEO Agent → Meta, slug, FAQ generation      │
│  ├─ Brand Voice Agent → Style profile matching  │
│  └─ Quality Reviewer Agent → Fact-check         │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│  External Integrations                          │
│  ├─ CMS APIs (WordPress, Ghost, Contentful…)    │
│  ├─ Search APIs (Brave Search, Exa)             │
│  ├─ Scraping APIs (Firecrawl, Jina)             │
│  └─ Stripe webhook handler                      │
└─────────────────────────────────────────────────┘
```

### Multi-tenancy model

Every paying customer gets an isolated workspace. All article, brand voice, CMS connection, and team data is scoped by `workspaceId`. Tenants cannot access each other's data. The Super Admin can monitor across tenants but cannot create content within a tenant's workspace.

---

## 5. Public-Facing Experience

### The Landing Page (`/`)

The landing page is the first impression for prospective customers. It has been designed as a single, scrollable experience with eleven distinct sections, each animated and responsive.

#### Section 1 — Navigation Bar
A fixed top navigation that begins fully transparent and gracefully transitions into a glass surface as the visitor scrolls. The logo on the left, navigation links in the center (Features, How It Works, Pricing, FAQ), and a theme toggle plus authentication buttons on the right. On mobile devices, the menu collapses into an animated slide-in drawer.

#### Section 2 — Hero Section
The opening visual statement. A large headline reading "Publish Smarter. Write with AI. Reach Further." appears with the middle line in a gradient blue-violet-teal. Behind the text, three large gradient orbs (blue, violet, teal) float in slow motion, creating depth without distraction. A pulsing announcement badge sits above the headline ("✦ Introducing AI-Powered Publishing — Now in Beta"). Below the subheading, two call-to-action buttons appear: a gradient "Start for Free" and a glass "Watch Demo." Five overlapping circular avatars below indicate "Trusted by 2,400+ publishers and agencies."

The hero closes with a floating mockup of the actual product dashboard — a glass card showing an article being written, with live SEO score indicator, brand voice match percentage, and CMS publishing status. This mockup floats gently using subtle vertical animation.

#### Section 3 — Logo Marquee
An infinite scrolling row of supported integrations and tools: WordPress, Ghost, Notion, Contentful, Sanity, Anthropic, Claude, Brave Search, Firecrawl, DataForSEO, Cloudinary, Stripe. Two rows scroll in opposite directions with edge fade masks for visual polish.

#### Section 4 — Stats Section
Four key metrics displayed in glass cards with animated number counters that count up from zero when the section enters the viewport: 2.4M+ articles generated, 12,000+ publishers, 4.2 hours saved per article, 91/100 average SEO score.

#### Section 5 — Features Section
A 3×2 grid showcasing six core features, each in a glass card with hover lift and gradient border:

1. **Research Engine** — Search 20+ sources, summarize findings, generate source-backed briefs
2. **AI Writing** (highlighted card spanning two rows) — Claude Sonnet drafts publication-ready articles
3. **SEO Intelligence** — Auto-generated meta, slugs, FAQ schema, internal links
4. **One-Click Publishing** — Direct integration with five major CMS platforms
5. **Brand Voice** — AI trained on user's existing content
6. **Team Collaboration** — Role-based workflows for agencies and newsrooms

#### Section 6 — How It Works
A horizontal timeline of five steps connected by an animated gradient line: Research → Outline → Draft → SEO → Publish. Each step displays an icon, step number, title, and brief description. As the user scrolls, steps reveal sequentially.

#### Section 7 — Pricing Section
Four plan cards (Free, Starter, Pro, Agency) with a monthly/yearly toggle that animates the price values. The Starter plan is visually highlighted as "Most Popular" with a gradient border and elevated scale. Each card lists features with green check icons and ends with a plan-specific call-to-action.

#### Section 8 — Testimonials
Three customer testimonials displayed in glass cards with star ratings, quote icons, and author attributions including name, role, and company.

#### Section 9 — Call-to-Action Section
A full-width gradient-overlay section with a large headline, supporting text, two buttons, and animated background orbs. Designed to be a high-conversion moment near the end of the page.

#### Section 10 — FAQ Section
Eight frequently asked questions inside a glass card using an accordion component with smooth open/close animations. Covers CMS support, API key requirements, brand voice training, plan limits, security, and team usage.

#### Section 11 — Footer
A four-column footer with brand information, product links, company links, and legal/support links. A bottom bar displays copyright and a decorative tagline.

---

## 6. Authentication System

### Login & Registration (`/auth/login` and `/auth/register`)

Authentication uses a unified tab-based interface. Users see a single page with two tabs (Sign In / Sign Up) that swap content with smooth Framer Motion transitions. Switching tabs updates the URL so deep links continue to work.

The page is split into two halves on desktop:
- **Left panel:** Marketing showcase with a headline, three feature highlights with icons, and a customer testimonial
- **Right panel:** The active form inside a glass card with violet glow and gradient border accent

On mobile, only the right panel is shown to maximize form usability.

### Demo Login System

Above the regular login form, two prominent glass cards offer one-click demo access:

| Card | What it does |
|---|---|
| **Super Admin** | Logs the visitor in as Alex Morgan (admin role), redirects to `/admin/dashboard` |
| **Publisher** | Logs the visitor in as Sarah Chen (user role), redirects to `/dashboard` |

Each card shows a gradient-stripe accent on the left edge, an icon, label, and description. A pulse animation runs while the demo is being prepared. This system allows prospects (and the client during this proposal review) to instantly experience either panel without account creation.

### Form Validation

Every authentication form uses React Hook Form combined with Zod schemas:
- **Login:** Email format, password minimum 6 characters
- **Register:** Name required, valid email, 8-character password with strength meter showing 4 levels (Weak, Fair, Good, Strong), password confirmation matching, terms acceptance
- **Forgot password:** Single email input → animated success state with "Check your inbox"
- **Reset password:** New password + confirmation with validation, success state with countdown redirect

### Security features

- HTTP-only cookies for refresh tokens (CSRF resistance)
- Bcrypt hashing with 12 salt rounds
- JWT access tokens (15 minutes) + refresh tokens (7 days) with automatic renewal
- Rate limiting on all auth endpoints (5 attempts per 15 minutes for login)
- Email verification flow ready for activation

---

## 7. Super Admin Panel — Complete Walkthrough

The Super Admin Panel is the platform owner's command center. All routes are prefixed with `/admin/`, protected by role-based access control. Only users with the `SuperAdmin` role can access these routes.

### Layout Architecture

A persistent left sidebar (collapsible to icon-only mode), a top bar with search, notifications, theme toggle, and profile dropdown, and a main content area with smooth page transitions. A bottom footer shows platform version, system operational status, and a support link. On mobile, the sidebar becomes an overlay drawer accessible via a hamburger button.

### Page 1 — Admin Dashboard (`/admin/dashboard`)

The overview hub of the entire platform.

**Top section:** Four KPI cards displaying:
- Total users (with month-over-month trend)
- Active subscriptions
- Articles generated platform-wide
- Monthly Recurring Revenue (MRR)

Each card uses an animated counter, an icon in a gradient square, and a green/red trend pill showing the percentage change.

**Charts row:**
- Revenue trend (last 6 months) — area chart with violet gradient fill
- Plan distribution — donut chart showing Free / Starter / Pro / Agency split
- New users (last 30 days) — line chart
- Articles per day (last 14 days) — bar chart

**Lower section:**
- Recent signups list (last 6 users with avatars, plan badges, dates)
- Recent articles list (cross-tenant, with status badges)
- Failed payments alert card (red border, list of overdue accounts with retry buttons)

### Page 2 — Users Management (`/admin/users`)

The Super Admin's interface to monitor and manage every paying customer (tenant) on the platform.

**Top stats:** Four small KPI cards (Total users, Active, Suspended, Paying customers).

**Filter bar:** Live search input, plan filter dropdown (All / Free / Starter / Pro / Agency), status filter (All / Active / Suspended), and a reset button.

**Data table:** Sortable columns including avatar with name and email, plan badge, article count, MRR contribution, status toggle, joined date, and an actions dropdown menu. The actions menu offers View detail, Reset password, Change plan, and Suspend/Activate (with destructive confirmation dialog).

The table supports pagination (10 rows per page), sortable headers (click to toggle ascending/descending), and clicking any row navigates to that user's detail page.

### Page 3 — User Detail (`/admin/users/:id`)

A comprehensive view of a single tenant.

**Header card:** Large gradient avatar, user name, plan badge, status pill, email, join date, and action buttons (Reset password, Suspend/Activate).

**KPI row:** Articles created, MRR, API calls in last 30 days, days active.

**Tabbed content area:**
- **Overview tab:** Workspace details (workspace ID, member count, CMS connections, brand voices) plus a usage section with progress bars for articles, research queries, and storage
- **Articles tab:** Data table of all articles by this user with status, word count, CMS, and creation date
- **Subscription tab:** Current plan details, MRR, billing period dates, and a "Change plan" action
- **Audit logs tab:** All system actions related to this user with action codes, status pills (success/warning/error), timestamps, and IP addresses

### Page 4 — Plans Management (`/admin/plans`)

The pricing tier control center.

Plan cards displayed in a 4-column grid (Free, Starter, Pro, Agency). Each card shows the plan name, description, monthly and yearly prices, full feature list with check icons, an Edit button, and a Delete button (with destructive confirmation).

A "Create plan" button at the top opens a modal dialog with a complete form:
- Plan name and slug
- Description
- Monthly and yearly pricing
- Feature list editor (add, remove, reorder features inline)
- "Highlight as featured" toggle (adds the gradient border and "Most Popular" badge)

This means the Super Admin can launch new pricing tiers without developer intervention.

### Page 5 — Billing & Payments (`/admin/billing`)

Platform-wide financial operations.

**Top KPIs:** MRR, ARR (Annual Recurring Revenue), churn rate, failed payments count.

**Revenue chart:** Area chart of last 6 months of net revenue from Stripe.

**Failed payments alert:** A prominent red-bordered glass card listing all customers with overdue balances, displaying name, email, amount, attempt count, and a Retry button per row.

**Payment history table:** Complete invoice list with invoice number, customer, plan, amount, status badge (Paid / Failed / Refunded), payment date, and payment method. Sortable, paginated, with a "Download all" CSV export action.

### Page 6 — Integrations (`/admin/integrations`)

Where the Super Admin configures all platform-wide third-party services.

A grid of integration cards for each service:
1. **Anthropic** — Claude API key for AI generation
2. **Brave Search** — Web research provider
3. **Stripe** — Subscription billing
4. **Email (SMTP/Resend)** — Transactional email delivery
5. **Cloudinary** — Featured image hosting
6. **DataForSEO** — Keyword analysis enrichment

Each card displays:
- Service icon and name
- Connection status indicator (green check or red X)
- Masked key preview (e.g., `sk-ant-…7Q9c`)
- Last tested timestamp
- "Edit key" button (opens modal with masked input and show/hide toggle)
- "Test" button (runs a live test, shows toast with result)

### Page 7 — Content Monitor (`/admin/content`)

Cross-tenant article visibility for moderation and platform health monitoring.

**Top stats:** Total articles platform-wide, published count, draft count, failed count.

**Filter bar:** Search by title or workspace, status filter, CMS platform filter, reset button.

**Articles table:** Lists every article across every tenant, showing title and workspace and author, status badge, target CMS, word count, and creation timestamp. Each row has an actions dropdown with View on CMS, Flag for review, and Hide article (destructive).

This page protects the platform from abuse: spam content, policy violations, broken articles can be detected and acted upon centrally.

### Page 8 — Analytics (`/admin/analytics`)

Platform-wide engagement and growth metrics.

**Date range selector:** Switch between 7 days, 30 days, 90 days, or 1 year.

**KPI row:** Monthly Active Users, Daily Active Users, Articles per day, Average platform SEO score.

**Charts:**
- User growth (line chart) — daily new signups
- Articles per day (bar chart) — output across all tenants
- Revenue trend (area chart) — 6-month financial picture
- Plan distribution (donut)

**Top tenants leaderboard:** A horizontal bar list of the five tenants generating the most articles, with their workspace name and article count.

### Page 9 — Notifications / Broadcasts (`/admin/notifications`)

The platform-wide announcement system.

**Composer card** (left, taking 2/3 width):
- Subject input
- Body textarea (Markdown supported)
- Audience selector dropdown (All users, Paying customers, Pro + Agency, Free plan only)
- Schedule date-time input (optional)
- Recipient count display ("Will reach 12,483 recipients")
- Save draft and Send buttons

**Best practices card** (right, taking 1/3 width): Four UX tips for high-engagement broadcasts.

**Broadcast history table** below: All previous announcements with subject, audience, recipient count, sent timestamp, and open rate percentage.

### Page 10 — Platform Settings (`/admin/settings`)

Five tabs for global configuration:

1. **General:** Platform name, tagline, support email, default user timezone
2. **Branding:** Logo upload (light + dark backgrounds), favicon, primary brand color
3. **Email:** SMTP host, port, credentials, from address, from name, plus a "Send test email" button
4. **Maintenance:** Toggle to enable maintenance mode (shows maintenance page to all non-admin users), customizable maintenance message
5. **Feature flags:** Granular toggles for individual platform features (real-time streaming, version history, team collaboration, Ghost integration, social repurposing)

### Page 11 — Audit Logs (`/admin/logs`)

Compliance and forensic visibility.

**Filter bar:** Search across actions/actors/targets, status filter (Success / Warning / Error), actor filter (Admin / System).

**Timeline view:** All privileged actions displayed as a vertical timeline with a gradient connecting line. Each entry shows an icon, action code in monospace formatting, status pill, target description, actor identification, timestamp, and source IP address.

**Export CSV button:** For compliance audits or external review.

### Page 12 — Support Tickets (`/admin/support`)

Help desk management.

**KPIs:** All tickets, Open, Pending reply, Closed.

**Filter bar:** Search by subject or email, status filter, priority filter.

**Tickets table:** Subject and submitter, priority badge (high/medium/low), status badge (open/pending/closed), reply count, last update timestamp.

**Ticket detail dialog:** Clicking any row opens a modal showing the full thread (alternating user and admin messages with timestamps), a reply textarea, and action buttons (Mark as pending, Close ticket, Send reply).

---

## 8. User Panel — Complete Walkthrough

The User Panel is where paying customers (tenants) actually use the platform. All routes are prefixed with `/dashboard/`. Multi-tenant isolation ensures each user sees only their own workspace data.

### Layout Architecture

Identical structure to Super Admin: collapsible sidebar, top bar, main content, footer. The sidebar shows tenant-specific navigation grouped into Workspace, Tools, and Account sections. The top bar includes a credits-remaining pill (e.g., "47/200 articles") that warns when nearing plan limit.

### Page 1 — User Dashboard (`/dashboard`)

The workspace home page.

**Greeting:** Personalized header with the user's name and a "New article" button as the primary call-to-action.

**KPI row:** Articles this month, hours saved, average SEO score, credits remaining (with low warning if under 20%).

**Usage card:** Three progress bars for articles, research queries, and storage with a "Manage plan" link.

**Two-column section:**
- **Left (recent articles):** Last 5 articles with title, word count, CMS, status badge, view count for published items
- **Right (quick actions + tip):** A 2×2 grid of links to Research, SEO Tools, CMS, and Brand Voice; below, a teal-bordered tip card suggesting Brand Voice setup

**Activity chart:** A bar chart showing articles created in the last 14 days.

### Page 2 — New Article (5-Step Wizard) — `/dashboard/new-article`

The flagship feature. A guided wizard that walks the user from idea to published article.

**Wizard stepper:** Five circles connected by an animated gradient progress line. Each step has a label (Research, Outline, Draft, SEO, Publish) and hint. Completed steps show a checkmark, the active step has a glowing ring, future steps are dim.

**Step 1 — Research:**
The user enters a topic, target keyword, and selects search depth (Quick — 3 sources, Deep — 10 sources, Comprehensive — 20 sources). Clicking "Search sources" triggers the AI Research Agent, which populates a list of source cards. Each source card displays:
- Title and domain
- Publication date and reading time
- Relevance score (color-coded badge: green for 90+, blue for 80-89, amber below)
- Two-line summary
- "Open source" external link
- Selection checkbox

A right-side panel shows selected sources count and a "Generate brief" button. Clicking generates a structured research brief (thesis statement, key facts, open questions) that becomes the foundation for the article.

**Step 2 — Outline:**
The AI Writing Agent generates a structured outline based on the brief. The user sees a list of sections (introduction, numbered body sections, conclusion) that can be:
- Reordered with up/down arrows
- Renamed by editing inline
- Removed individually
- New sections added

A right-side panel offers target word count selector (500, 1000, 1500, 2000, 3000) and writing tone selector (Professional, Casual, Journalistic, Academic). Clicking "Generate draft" sends the outline + brief + tone to Claude Sonnet for full article generation.

**Step 3 — Draft Editor:**
A rich text editor occupies the main column. The toolbar at the top includes formatting controls (bold, italic, underline, headings, lists, quotes, code, links) and an inline AI toolbar with five powerful actions: Rewrite selection, Improve clarity, Expand paragraph, Shorten paragraph, Fix grammar.

A right sidebar shows live statistics: word count, reading time, Flesch readability score, paragraph count. Below it, an auto-save indicator pulses green ("Saved 4s ago"), confirming changes are persistent. Version history is accessible from a separate panel showing all auto-save snapshots with timestamps and user/AI attribution.

**Step 4 — SEO Optimization:**
Three primary panels:

- **SEO Score Ring:** A large animated SVG ring displaying the current score (0-100) that smoothly fills in. Color shifts: amber below 70, gradient blue-violet for 70-89, green-teal for 90+.
- **Checklist:** Ten SEO checks (keyword density, keyword in introduction, meta title length, meta description length, heading hierarchy, internal links, external authority links, alt text, FAQ schema, freshness signals) each with pass (green check) or warning (amber exclamation) icons.
- **Meta Title Options:** Three AI-generated options with character counts, click any to select. Editable field for custom override.
- **Generated FAQ:** Four questions with answers, ready to inject as schema markup. Copy as JSON-LD button.
- **Internal Links:** Suggestions based on the user's existing published articles, each with title, slug, and recommended anchor text.

**Step 5 — Publish:**
The final step. A two-column layout:

- **Left column (publishing controls):**
  - CMS picker dropdown (lists only connected CMS accounts)
  - Publish mode (3 cards): Draft / Publish now / Schedule
  - If Schedule is selected, a date-time picker appears
  - Featured image upload zone (drag-and-drop or click to browse)

- **Right column (pre-publish checklist):**
  - SEO score above 80 ✓
  - Meta title set ✓
  - Meta description set ✓
  - Featured image set (warning if missing)
  - Word count > 1,000 ✓
  - X/5 checks passed counter

Below the checklist, a large gradient "Publish now" / "Save as draft" / "Schedule publish" button (label changes based on mode). Clicking it triggers the CMS Agent which posts the complete article to the selected CMS via official API.

### Page 3 — My Articles (`/dashboard/articles`)

A complete inventory of the user's content.

**Status tabs:** All / Drafts / Scheduled / Published / Failed, each showing a count.

**Filter bar:** Search by title, CMS filter dropdown, view toggle (Grid / Table).

**Grid view:** Card-based with thumbnail, status badge, CMS tag, title, two-line tag list, footer stats (word count, reading time, view count for published), and an actions menu.

**Table view:** Sortable data table with columns for title, status, CMS, words, SEO score, views, last updated, and actions.

Each row's action menu offers: Edit, Duplicate (creates a new draft copy), View on CMS (opens the live URL for published items), Delete (with confirmation).

### Page 4 — Article Detail (`/dashboard/articles/:id`)

The full editing surface for a specific article.

**Header card:** Status badge, CMS tag, all article tags, title, and stats line (word count, reading time, SEO score, view count for published, last updated). Action buttons on the right: AI Improve, Publish/Update.

**Four tabs:**
- **Editor tab:** Full editor with toolbar, title input, content textarea, sidebar with stats, auto-save indicator, and AI tools quick-access list
- **SEO tab:** SEO score ring, complete checklist, three meta title options, generated FAQ, internal link suggestions
- **Versions tab:** Vertical timeline of all version history entries with restore buttons (current version is non-restorable)
- **Performance tab:** For published articles only — total views, SEO score, average time on page, traffic sources breakdown bars

### Page 5 — Research Hub (`/dashboard/research`)

Standalone research tool, decoupled from article creation.

**Input panel:** Topic, target keyword, depth selector, search button (with loading spinner state).

**Results layout:** Two-column when sources arrive:
- **Left (2/3 width):** Scrollable list of source cards with selection checkboxes
- **Right (1/3 width):** Sticky panel showing selected source count and "Generate brief" button

**Brief output:** When generated, appears below as a glass card with teal glow, displaying thesis, key facts list (with lightning icons), and open questions list. Two action buttons: Save brief or Use in new article (jumps to wizard).

This page allows users to do research-only sessions for content planning, then convert briefs into articles later.

### Page 6 — SEO Tools (`/dashboard/seo`)

A standalone SEO toolkit with four tabs:

1. **Meta Generator:** Paste a title or topic → AI generates 3 meta title variants and 2 meta description variants, each with character counts and copy buttons
2. **Slug Generator:** Title input → primary slug + 2 alternative slugs with descriptive labels (Long-form, Compact)
3. **FAQ Generator:** Paste article content → generates 4 schema-ready FAQ pairs with a "Copy schema" JSON-LD export button
4. **Keyword Analyzer:** Keyword input → returns search volume, difficulty score (color-coded), CPC, intent classification, and 5 related keyword suggestions, each with their own "Analyze" button for chained research

### Page 7 — CMS Connections (`/dashboard/cms`)

Where users connect and manage their target publishing destinations.

A 3-column grid of CMS cards: WordPress, Ghost, Notion, Contentful, Sanity. Each card shows:
- Platform icon with brand-colored gradient
- Platform name and phase badge (Phase 1 MVP / Phase 2 / Phase 3)
- Connection status (green check / dim X)
- Site URL (or "—" if disconnected)
- Authentication method
- Last sync timestamp
- Action buttons: Test, Set as Default, Disconnect (for connected) or Connect (for disconnected)

The default CMS gets a star indicator and a primary ring border. New articles auto-target the default unless changed in the wizard.

**Add connection dialog:** Platform dropdown, site URL input, credentials input (label changes per platform: "Application Password" for WordPress, "Admin API Key" for Ghost, "API Token" for others). Connect button validates and saves.

### Page 8 — Brand Voice (`/dashboard/brand-voice`)

The differentiating feature.

**Active voice highlight card** (top): A large prominent glass card with violet glow showing the currently active voice profile. Displays:
- Name and "Active" badge
- Description
- Tone badges (Professional, Confident, Concise, etc.)
- Sample signature phrases (e.g., "Here's what matters", "The bottom line is")
- Stats: sample article count, average sentence length, last used date

**All profiles grid:** Card layout for every voice profile the user has created. Each card shows similar information at smaller scale, with a "Set active" button (or "Active" disabled state) and edit/delete icons.

**New voice profile dialog:** Name input + drag-and-drop upload zone for 3-5 sample articles (TXT, DOCX, or pasted URLs). The Brand Voice Agent then analyzes tone, vocabulary, sentence rhythm, and characteristic phrases to build the profile.

### Page 9 — Templates (`/dashboard/templates`)

Reusable article structures.

A 3-column grid of template cards. Six built-in templates ship by default: Listicle (Top 10), How-to Guide, Product Comparison, News Roundup, Case Study, Trend Analysis. Each card shows:
- Icon and category badge
- Name
- Description / prompt
- Stats line (target word count, use count, last used)
- "Use template" gradient button (jumps to article wizard pre-filled)
- Edit and delete icons

**Custom template creation dialog:** Name, category, description with prompt structure, target word count.

### Page 10 — Analytics (`/dashboard/analytics`)

Article performance metrics for the user's own content.

**Date range selector:** 7 / 30 / 90 days.

**KPI row:** Total views, average SEO score, published count, top performer (with view count).

**Charts:**
- Views over time (large area chart on left, taking 2/3)
- Traffic sources (donut on right, showing Organic Search, Direct, Social, Referral, Email)

**Top performing articles table:** Sortable list of all published articles ranked by views, showing title, status, view count, SEO score, word count, and publish date.

### Page 11 — Team (`/dashboard/team`)

Multi-user collaboration (Pro / Agency plans).

**Members section:** List of all current team members with avatar, name and email, article count, join date, role dropdown (Owner is locked, others can change between Editor / Writer / Viewer), and a remove icon (with confirmation).

**Pending invitations section:** Any unaccepted invites with email, role, sent timestamp, resend, and cancel buttons.

**Role permissions card:** A 4-column reference showing what each role can do (Owner: full access, Editor: create/publish/manage all, Writer: own articles only with submit-for-review workflow, Viewer: read-only).

**Invite dialog:** Email input + role selector. Sends an invitation email with a join link.

### Page 12 — API Keys (`/dashboard/api-keys`)

Two-section page.

**Provider Keys (Overrides) section:** Three cards for Anthropic, Brave Search, OpenAI. Each shows description, connection status, masked key preview, and a "Connect" or "Update" button. When a user provides their own API keys, AI generation costs are billed directly to their provider account, bypassing the platform's monthly limit.

**Personal API Keys section:** A "Create key" button at the top opens a dialog asking for key name and scope (All endpoints / Read only / Articles + Research). On creation, the full key is shown once in an emerald success card with a Copy button. The key is then stored in a table showing name, masked key, scope, creation date, last used, and a revoke action.

These personal keys allow developers to build custom integrations: bulk import scripts, Notion-to-Newsroom MCP automation, mobile apps, browser extensions, or Zapier/Make/n8n workflows.

### Page 13 — Billing (`/dashboard/billing`)

Personal plan and payment management.

**Top section** (3-column):
- **Current plan card** (2 columns): Plan name in gradient text, monthly price, renewal date, four usage progress bars (articles, research queries, storage, team members), action buttons (Cancel subscription, Switch to yearly)
- **Payment method card** (1 column): Card brand and last four digits, expiry, "Update card" button

**Plan comparison section:** All four plans displayed with monthly/yearly toggle, feature lists, and contextual buttons ("Current plan" disabled for active, "Upgrade"/"Downgrade" gradient buttons for others).

**Invoice history table:** All past invoices with number, date, plan, amount, status badge, payment method, and download icon.

### Page 14 — Settings (`/dashboard/settings`)

Personal preferences across four tabs:

1. **Profile:** Avatar upload (with size guidance), full name, email, timezone selector, language selector
2. **Security:** Change password form (current + new + confirm), Two-factor authentication toggle, active sessions list with revoke buttons for non-current sessions
3. **Notifications:** Seven event types (Article published, Article generation complete, Team member invited, Payment received, Plan limit approaching, Platform announcements, Weekly digest) each with separate Email and In-app toggles
4. **Workspace:** Workspace name, default brand voice selector, default CMS selector, default article length

### Page 15 — Support (`/dashboard/support`)

Help desk for tenant issues.

**Top KPIs:** Open, Pending reply, Resolved counts.

**My tickets table:** All tickets the user has submitted with subject, priority badge, status badge, reply count, last updated.

**FAQ accordion:** Six common questions answered (CMS connection, article editing, plan limits, brand voice training, security, cancellation).

**New ticket dialog:** Subject, priority selector, description textarea.



---

## 9. AI Agent Architecture

The Newsroom MCP system orchestrates **seven specialized AI agents** working together, each with a single clear responsibility. This design follows the agent pattern proven by Claude Agent SDK and the [agency-agents](https://github.com/msitarzewski/agency-agents) reference architecture: each agent operates in an isolated context window, processes its specific input, and hands off structured output to the next stage. Isolation reduces token costs, simplifies debugging, enables parallel execution where possible, and allows individual agents to be swapped or upgraded independently.

### Agent 1 — Research Agent

**Role:** Source discovery and web content extraction.

**Inputs:** Topic string, target keyword, search depth selector, optional date freshness constraint.

**Process:**
1. Calls Brave Search API (or Exa AI for semantic search) with the topic and keyword
2. Receives top N results based on depth (3, 10, or 20)
3. Filters out blacklisted domains, broken links, and low-relevance hits
4. For each surviving URL, calls Firecrawl or Jina AI to scrape and convert the page to clean Markdown
5. Computes a relevance score per source using semantic similarity to the topic
6. Returns a structured array of source objects (title, URL, domain, summary, score, content, reading time)

**Model used:** Claude Haiku 4.5 (for summarization of scraped content — fast and inexpensive).

**Why Haiku:** Speed is critical at this stage, content is then handed to higher-quality agents. Haiku produces accurate summaries at one-fifth the cost of Sonnet.

### Agent 2 — Brief Generation Agent

**Role:** Synthesize selected sources into a coherent research brief.

**Inputs:** Array of selected sources from the user, topic, target keyword.

**Process:**
1. Compiles all selected source content
2. Sends to Claude with a structured prompt requesting: thesis statement, key facts with citations, open questions
3. Returns a structured brief object suitable for the next agent

**Model used:** Claude Sonnet 4 (or DeepSeek R1 as a cost-effective alternative — reasoning quality required).

### Agent 3 — Outline Agent

**Role:** Generate a structured article outline.

**Inputs:** Research brief, target word count, writing tone.

**Process:**
1. Analyzes the brief to identify natural section breaks
2. Generates 6-12 sections with descriptive headings and 2-3 bullet points each
3. Allocates word counts per section to hit the target total
4. Returns an editable outline structure that the user can drag, drop, rename, or remove

**Model used:** Claude Haiku 4.5 (structured output is straightforward, no need for Sonnet).

### Agent 4 — Writing Agent

**Role:** Produce the full article body.

**Inputs:** Brief, outline, brand voice profile (active), target word count, writing tone.

**Process:**
1. Loads the active brand voice profile (tone, vocabulary, sentence rhythm)
2. Sends a comprehensive prompt to Claude Sonnet including all context
3. Streams the response token-by-token to the frontend via WebSocket so the user sees real-time progress
4. Returns the complete article in Markdown format

**Model used:** Claude Sonnet 4.

**Why Sonnet:** Article body is the user-facing premium output. Quality directly impacts the platform's USP ("readers cannot tell it was AI generated"). Sonnet's superior coherence over long-form writing and natural editorial tone is essential.

### Agent 5 — SEO Agent

**Role:** Generate all SEO assets.

**Inputs:** Final article content, target keyword.

**Process:**
1. **Meta title:** Generates 3 options under 60 characters, each optimized for click-through rate
2. **Meta description:** Generates 2 options under 160 characters with the keyword and a value proposition
3. **URL slug:** Generates a primary slug plus 2 variants (long-form and compact)
4. **FAQ section:** Identifies 4 likely user questions from the content and answers them concisely (schema-ready JSON-LD)
5. **Internal links:** Queries the user's existing published articles in MongoDB, suggests relevant anchor placements
6. **Tags and categories:** Suggests appropriate values for the connected CMS taxonomy
7. **SEO score:** Runs a 10-point checklist (keyword density, intro placement, heading structure, image alt text, schema presence, etc.) and returns a 0-100 score

**Model used:** Claude Haiku 4.5 (most SEO tasks are short, structured outputs).

### Agent 6 — Brand Voice Agent

**Role:** Analyze sample articles and create or apply voice profiles.

**Two modes:**

**Mode A — Training (when user uploads samples):**
1. Receives 3-5 sample articles
2. Extracts tone descriptors (Professional, Casual, Witty, Authoritative)
3. Computes vocabulary level (basic, intermediate, advanced)
4. Calculates average sentence length and rhythm patterns
5. Identifies signature phrases that recur across samples
6. Saves as a Brand Voice profile in MongoDB

**Mode B — Application (during article generation):**
1. Loads the active profile when called by the Writing Agent
2. Injects style guidance into the writing prompt as a system message
3. Caches the profile prompt using Anthropic's prompt caching feature for cost efficiency

**Model used:** Claude Sonnet 4 (style analysis and replication require deep model capability).

### Agent 7 — Quality Reviewer Agent

**Role:** Pre-publish quality control.

**Inputs:** Final article, brief, brand voice profile.

**Process:**
1. Identifies any factual claims and runs them against the source brief for support verification
2. Detects unsupported claims and flags them for user review
3. Checks for missing citations on quoted statistics
4. Verifies brand voice match (returns a compatibility percentage)
5. Identifies SEO gaps not caught by the SEO Agent
6. Returns a structured pre-publish checklist

**Model used:** Claude Haiku 4.5 (validation tasks are quick).

### Bonus Agent — CMS Publishing Agent

**Role:** Push the finalized article to the target CMS.

**Process per platform:**

- **WordPress REST API:** Authenticates with App Password, formats article in Gutenberg blocks, uploads featured image, sets categories, tags, slug, scheduling
- **Ghost Admin API:** Uses Mobiledoc or HTML format, handles tags and feature images
- **Contentful Management API:** Maps to the user's content model, creates entry with all fields
- **Sanity API:** Uses GROQ-compatible payload structure
- **Notion API:** Creates a page in the configured database with article content as blocks

This agent handles all CMS-specific quirks (auth flows, content format conversion, error handling) so the rest of the platform stays CMS-agnostic.

### Agent orchestration

A central orchestrator service coordinates the agent flow:

```
User clicks "Generate" in wizard Step 2 (after sources selected)
      ↓
Orchestrator queues a BullMQ job
      ↓
Worker picks up job, calls Brief Agent (Sonnet)
      ↓
Frontend receives "brief_generated" socket event
      ↓
User reviews brief, clicks Continue → Step 2 (Outline)
      ↓
Worker calls Outline Agent (Haiku)
      ↓
User edits outline, clicks "Generate Draft"
      ↓
Worker calls Writing Agent (Sonnet) → streams tokens to frontend
      ↓
User reviews draft, jumps to SEO step
      ↓
Worker calls SEO Agent (Haiku) → returns all SEO assets
      ↓
User reviews, clicks Publish
      ↓
Worker calls CMS Publishing Agent → posts to target CMS
      ↓
Article saved with cmsPostId, status updated to "published"
```

Each agent's input, output, model used, token usage, and cost is logged for billing reconciliation and platform analytics.

---

## 10. End-to-End Workflows

### Workflow A — Solo blogger writes a weekly post

1. **Sarah** logs into `/dashboard` using her Pro plan account
2. Dashboard shows her remaining credits (47 of 200), recent articles, and quick action tiles
3. She clicks "New article" — the wizard opens
4. **Step 1:** Types "AI productivity tools 2026", selects Deep search depth, clicks Search
5. The Research Agent runs; 10 source cards appear within 8 seconds
6. She unchecks 3 sources that look like SEO spam, keeps 7, clicks Generate brief
7. The Brief Agent produces a thesis with 6 key facts and 3 open questions
8. **Step 2:** AI generates an outline with 9 sections; she reorders two sections, deletes one, sets word count to 1,500, picks "Casual" tone, clicks Generate draft
9. **Step 3:** Article body streams in over 25 seconds. She reads through, uses "Improve clarity" on one paragraph that felt stiff, expands one paragraph that was too short
10. **Step 4:** SEO score arrives at 87/100. She picks meta title option 2, accepts the AI-generated FAQ, ignores internal links suggestions for now
11. **Step 5:** Selects her connected WordPress site, picks Schedule mode, sets publish for Monday 9am, drags in a featured image from her desktop, sees pre-publish checklist all green except featured image (now satisfied), clicks Schedule publish
12. Toast confirms scheduled. Article appears in her Articles page with `scheduled` status badge
13. Total time: 22 minutes

### Workflow B — Agency manages 5 client blogs

1. **Priya** (agency owner) signs in, lands on dashboard
2. She has 5 brand voice profiles set up — one per client
3. New article needed for "Client A — Tech blog"
4. Switches active brand voice to "Client A — Tech voice" in the topbar
5. Goes to Templates, picks "Trend Analysis" (her custom template), clicks Use template
6. Wizard opens pre-filled with template structure
7. Completes wizard in 18 minutes (faster because outline came pre-structured)
8. Publishes to Client A's WordPress site
9. Switches brand voice to "Client B — Lifestyle voice"
10. Repeats for next article
11. Throughout the month, all team members (writers and editors) work in the same workspace with role-based permissions
12. End of month, Priya checks Analytics across all client articles, exports report PDFs to share with each client

### Workflow C — Newsroom editorial review

1. **Marcus** (writer) creates a draft article using the wizard
2. Saves as draft instead of publishing
3. Article appears in his Articles page
4. **Editor** logs in, sees Marcus's article in the team workspace under "Drafts"
5. Editor opens the article, uses AI tools to improve sections, fact-checks via the Quality Reviewer Agent
6. Editor publishes the article directly to the CMS
7. Audit log records: Writer created, Editor edited, Editor published, with timestamps

### Workflow D — Super Admin response to abuse

1. **Alex** (Super Admin) receives a notification: a tenant has generated 50 articles in 2 hours (suspicious volume)
2. Logs into `/admin/dashboard`, sees the alert in notifications
3. Goes to `/admin/users`, sorts by "Articles" descending, finds the offender
4. Clicks user → sees their articles tab
5. Clicks one article on Content Monitor — it's spam content
6. Returns to user detail, suspends the account
7. Confirmation dialog requires destructive action acknowledgment
8. Suspension immediately revokes the user's session via Socket.io disconnect event
9. Audit log captures the suspension with Alex as actor

### Workflow E — Brand voice training (Pro plan unlock)

1. New Pro plan customer, **Diego**, just upgraded
2. Goes to `/dashboard/brand-voice`, clicks "New voice profile"
3. Names it "MediaHaus Editorial"
4. Drags 4 of his previous articles into the upload zone
5. Brand Voice Agent processes the samples (~30 seconds with progress indicator)
6. Profile saves with extracted tone (Professional, Confident), avg sentence length (16 words), 5 signature phrases
7. Diego sets it as active
8. His next 50 articles all sound consistently like MediaHaus

---

## 11. Security, Privacy & Compliance

### Authentication security

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt with 12 salt rounds |
| Session management | JWT access tokens (15 min) + refresh tokens (7 days) |
| Token storage | HTTP-only cookies, sameSite=strict |
| CSRF protection | SameSite cookie + origin verification |
| Rate limiting | 5 attempts per 15 min on login, OTP verification, password reset |
| Email verification | OTP with 10-minute expiry |
| Two-factor authentication | TOTP support (toggleable per user) |

### Data protection

| Concern | Solution |
|---|---|
| CMS credentials at rest | AES-256-GCM encryption per workspace |
| API key storage | Hashed before save, masked in UI (only last 4 chars visible) |
| Personal API keys | Shown once on creation, revocable any time |
| Database access | Mongoose query isolation, all queries scoped by workspaceId |
| Multi-tenant data leak | Service layer enforces workspace boundaries on every read/write |

### Compliance

| Standard | Status |
|---|---|
| GDPR — right to access | Data export endpoint planned |
| GDPR — right to deletion | Account deletion with cascade |
| SOC 2 Type I | In progress |
| SOC 2 Type II | Audit planned for Q3 |
| Audit logging | All admin and system actions logged with actor, target, timestamp, IP |

### Network security

- HTTPS enforced (HSTS headers)
- Helmet middleware for security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- CORS strictly whitelisted to known frontend origins
- HPP middleware against HTTP parameter pollution
- XSS sanitization on all user input
- NoSQL injection protection via Mongoose schema enforcement and key prefix sanitization

### AI safety

- All articles default to "save as draft" — never auto-publish without explicit user confirmation
- Quality Reviewer Agent flags unsupported claims before publish
- Action logging on every tool call (audit + cost tracking)
- Plan-based generation limits enforced server-side
- Output token caps prevent runaway costs

---

## 12. Pricing & Business Model

### Subscription tiers

| Plan | Monthly | Yearly (per month) | Articles/month | Team | CMS |
|---|---|---|---|---|---|
| **Free** | $0 | $0 | 10 | 1 user | WordPress only |
| **Starter** | $19 | $15 | 50 | 1 user | WordPress + Ghost |
| **Pro** | $49 | $39 | 200 | 5 users | All CMS platforms |
| **Agency** | $99 | $79 | Unlimited | Unlimited | All CMS + White label |

Yearly billing offers a 20% discount, payable upfront.

### Plan-gated features

| Feature | Free | Starter | Pro | Agency |
|---|---|---|---|---|
| AI article generation | ✓ | ✓ | ✓ | ✓ |
| Research engine | Basic | Full | Full | Full |
| SEO tools | Basic | Full | Full | Full |
| WordPress publishing | ✓ | ✓ | ✓ | ✓ |
| Ghost publishing | — | ✓ | ✓ | ✓ |
| Other CMS | — | — | ✓ | ✓ |
| Brand voice profiles | — | — | ✓ | ✓ |
| Templates (custom) | — | — | ✓ | ✓ |
| Team collaboration | — | — | ✓ | ✓ |
| Analytics dashboard | — | Basic | Full | Full |
| White-label | — | — | — | ✓ |
| Priority support | — | Email | Priority | Dedicated |
| API access | — | 1 key | 5 keys | Unlimited |

### AI cost economics (your perspective as platform owner)

Using Claude Sonnet 4 + Haiku 4.5 hybrid routing:

- **Per article cost:** ~$0.12 (across all wizard steps)
- **Pro plan customer:** 200 articles × $0.12 = **$24/month AI cost**, against $49 revenue → **51% gross margin**
- **Agency customer:** Average 800 articles × $0.12 = **$96/month AI cost**, against $99 revenue → margin tightens, recommend caps or higher pricing for sustained heavy users

With prompt caching and batch API discount (50% off), the actual cost can drop another 30-40%, pushing margins to 65-70% on Pro tier.

### Provider key override option

Users can plug their own Anthropic API key (or Brave Search, OpenAI keys) to bypass platform AI limits. When they do, AI costs route to their own account directly — beneficial for high-volume publishers and enterprise customers seeking direct vendor relationships. Their subscription still applies for platform features (dashboard, CMS integrations, brand voice training, etc.).

### Revenue projections (year 1 conservative)

| Quarter | Free users | Paid users | MRR | Notes |
|---|---|---|---|---|
| Q1 (launch) | 200 | 20 | $400 | Beta phase, early adopters |
| Q2 | 800 | 80 | $1,600 | Marketing kickoff |
| Q3 | 2,000 | 200 | $4,200 | Word-of-mouth growth |
| Q4 | 5,000 | 500 | $11,500 | Steady adoption |

These are conservative estimates. Aggressive growth scenarios with content marketing investment can 3-5x these numbers.

---

## 13. Project Delivery Status

### Frontend — 100% complete

Every page in both panels (Super Admin and User) is fully designed, animated, and demoable. The application includes:

- 33 fully styled pages
- 50+ reusable components
- Complete design system with dark/light mode
- Full responsive layout (mobile, tablet, desktop, ultra-wide)
- Glassmorphism aesthetic with gradient color palette
- Framer Motion animations on every interaction
- Accessibility features (focus rings, reduced motion support, ARIA labels)
- Production-ready build (compiles cleanly, no warnings)

### Backend boilerplate — 100% complete

The backend foundation is production-ready with:

- ES module architecture with path aliases
- Layered: routes → controllers → services → repositories → models
- Smart response handler with auto-detected pagination
- Smart pagination utility with search, filter, sort
- Authentication middleware with role-based authorization
- Global error handler with user-friendly messages
- Security middleware stack (helmet, CORS, HPP, XSS, NoSQL injection)
- Structured Winston logging with file rotation
- Rate limiting factories
- Email service (Resend, SMTP, dev preview)
- File upload (Multer with mime whitelist)
- Cloudinary integration helpers
- AES-256-GCM encryption for sensitive data
- JWT signing/verification (access + refresh)
- Bcrypt password hashing
- OTP generation and email
- Socket.io setup with user-socket mapping
- Cron job registry
- Init data seeders for roles and super admin
- Swagger documentation framework
- Health check endpoint with system metrics
- MongoDB connection with retry logic

### Next implementation phases

The remaining work follows the proven plan from the system design document:

| Phase | Duration | Focus |
|---|---|---|
| Phase 1 — Backend core | 2 weeks | Mongoose models, auth API, user/workspace CRUD |
| Phase 2 — AI agents | 3 weeks | Research, Brief, Outline, Writing, SEO, Brand Voice, Quality agents |
| Phase 3 — CMS publishing | 2 weeks | WordPress integration first, then Ghost |
| Phase 4 — Stripe billing | 1 week | Subscription, webhooks, plan enforcement |
| Phase 5 — Polish + deploy | 2 weeks | Testing, error monitoring (Sentry), performance, production deploy |
| Total to MVP launch | ~10 weeks | Frontend already done, this is backend + integration only |

After MVP, additional CMS platforms (Contentful, Sanity, Notion) and advanced features (multilingual, social repurposing, analytics feedback) follow per the original system design roadmap.

---

## 14. Demo Access

You can experience the complete frontend immediately via the demo system:

### Demo URL

Once the development server is running:
```
http://localhost:5173
```

### Demo accounts (one-click login)

The login page features two prominent demo cards above the form. No typing required.

| Click | Identity | Lands at |
|---|---|---|
| **Super Admin card** | Alex Morgan | `/admin/dashboard` |
| **Publisher card** | Sarah Chen | `/dashboard` |

### What to explore

**As Super Admin:**
1. The dashboard with KPIs, charts, and tables
2. Users page — try filters, search, click into a user detail
3. Plans — try creating a new plan
4. Billing — see revenue chart and failed payments alert
5. Integrations — try editing the Anthropic key
6. Content Monitor — cross-tenant article view
7. Audit Logs — timeline visualization
8. Settings — explore the 5 tabs

**As Publisher:**
1. Dashboard with personalized greeting and quick actions
2. **New Article** — walk through the entire 5-step wizard (Research → Outline → Draft → SEO → Publish)
3. Articles — toggle between grid and table views
4. Click any article to see the detail editor with AI tools
5. Research Hub — search a topic, generate a brief
6. SEO Tools — try all 4 sub-tools
7. CMS — see connected platforms, try connecting a new one
8. Brand Voice — view profiles, set active
9. Templates — see built-ins, try Use template
10. Analytics — view performance charts
11. Team — see members, try inviting

### Theme switching

A theme toggle button is present in every layout's top bar. Try both light and dark modes to see how the design adapts. The page background uses an atmospheric radial gradient unique to each mode.

### Responsive testing

Resize the browser window or use device simulation in DevTools:
- 375px (mobile) — sidebar collapses to overlay drawer
- 768px (tablet) — adjusted spacing
- 1280px (desktop) — full sidebar
- 1920px (ultra-wide) — content centered with max-width

---

## 15. Roadmap

### Immediate next steps (post-approval)

| Week | Deliverable |
|---|---|
| 1 | Backend Mongoose models for User, Workspace, Article, Subscription |
| 2 | Auth API (register, login, OTP, password reset) wired to frontend |
| 3 | Article CRUD API + frontend integration replacing mock data |
| 4 | Research Agent + Brief Agent operational |
| 5 | Outline Agent + Writing Agent with streaming |
| 6 | SEO Agent + Brand Voice Agent |
| 7 | WordPress CMS Publishing Agent |
| 8 | Stripe billing + plan enforcement |
| 9 | End-to-end testing, bug fixes |
| 10 | Production deployment |

### Post-MVP enhancements (months 4-6)

- Ghost CMS integration
- Real-time article generation streaming via Server-Sent Events
- Article version history with rollback UI
- Bulk operations (CSV import/export)
- Notion integration for write-in-Notion → publish-to-WordPress workflow

### Scale phase (months 7-12)

- Contentful and Sanity CMS support
- Multilingual article generation (Spanish, French, Bengali, Arabic)
- Social media repurposing (LinkedIn post, X thread, Instagram caption from one article)
- Internal link suggestion engine using vector embeddings
- Plagiarism check integration (Originality.ai or Copyleaks)
- Content refresh engine (suggest updates to articles 6+ months old)
- Mobile companion app (React Native)
- Advanced analytics with article performance feedback loops

### Long-term vision

- White-label deployment for enterprise customers
- API marketplace where third-party developers can build extensions
- AI agent marketplace where specialized agents (legal review, medical fact-check, technical accuracy) can be installed as plugins

---

## Closing Notes

This proposal represents the result of focused engineering work to produce a fully functional, demo-ready frontend along with a production-grade backend boilerplate. Every screen the client sees is real, interactive, and polished to a level matching industry-leading SaaS products.

The remaining work is well-defined, sequenced, and proceeds through a 10-week implementation plan. There are no architectural unknowns — the system design has been thoroughly validated against the original system design document and the technical proposal response.

The platform is positioned to compete in a fast-growing market segment (AI publishing tools), with a unique combination of features that no single competitor currently offers in one product:

- Multi-CMS publishing
- Trained brand voice
- Multi-step quality control with human review
- Multi-tenant SaaS with role-based collaboration
- Premium UX comparable to Linear, Vercel, Stripe

We invite you to explore the demo, walk through both panels, and let us know which features resonate strongest, which would benefit from refinement, and which additional capabilities you would like prioritized for the MVP launch.

We look forward to building this product together.

---

*This document was prepared as a comprehensive technical and product proposal for the Newsroom MCP platform.*

*Frontend repository: https://github.com/dev-mohiuddin/news-room-mcp*

*Document version 1.0 — May 2026*
