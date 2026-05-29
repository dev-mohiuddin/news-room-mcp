# Newsroom MCP — AI-Powered Content Publishing Platform

A production-grade SaaS platform that connects AI assistants to the full article publishing workflow — from research to CMS draft creation.

## 🚀 Tech Stack

### Frontend (`/frontend`)
- **React 19** + Vite 6
- **Redux Toolkit** + Redux Persist
- **Shadcn UI** (Radix primitives) + Tailwind CSS v4
- **Framer Motion** — page transitions, scroll animations, micro-interactions
- **React Router DOM v7** — nested routing with auth guards
- **React Hook Form + Zod** — form validation
- **Recharts** — data visualization
- **Axios** — HTTP client with interceptors + NProgress

### Backend (`/server`)
- **Node.js** + Express.js
- **MongoDB** + Mongoose
- **JWT** authentication
- **Role-based access control** (Super Admin + User)

## 🎨 Design System

Premium glassmorphism + dark-first design with cinematic gradients.

- **Fonts:** Syne (display) + DM Sans (body)
- **Colors:** Blue (#3B82F6) → Violet (#8B5CF6) → Teal (#2DD4BF)
- **Glass cards** with layered shadows, inset highlights, gradient borders
- **Animated orbs** background, grid patterns, noise textures
- **Dark/Light mode** with full CSS variable system

## 📁 Frontend Architecture

```
frontend/src/
├── api/              # Module-wise API calls (axios + handleRequest pattern)
├── assets/           # Images, SVGs, central exports
├── components/
│   ├── auth/         # AuthLayout, AuthTabs, LoginForm, RegisterForm, DemoLogin
│   ├── landing/      # 11 landing page sections (Navbar → Footer)
│   ├── layout/       # Sidebar, Topbar, AppFooter (shared across panels)
│   ├── shared/       # 20+ reusable components (GlassCard, KPICard, DataTable...)
│   ├── theme/        # ThemeProvider + useTheme hook
│   ├── ui/           # 21 Shadcn UI primitives (button, dialog, tabs, table...)
│   └── user/         # User-specific components (WizardStepper, SeoScoreRing...)
├── hooks/            # useAuth, useDebounce, useMediaQuery, usePagination...
├── layouts/          # SuperAdminLayout, UserLayout
├── lib/              # utils, http, constants, animations, validators, mockData
├── pages/
│   ├── admin/        # 12 Super Admin pages (fully implemented)
│   ├── auth/         # Login/Register (tab system), Forgot/Reset password
│   ├── public/       # Landing page
│   ├── user/         # 15 User panel pages (fully implemented)
│   └── utils/        # 404 page
├── redux/            # Store + 10 slices (auth, articles, editor, ui, admin...)
└── routes/           # Route definitions with role-based guards
```

## 🔐 Two-Panel Architecture

### Super Admin (`/admin/*`) — 12 pages
Dashboard, Users, User Detail, Plans, Billing, Integrations, Content Monitor, Analytics, Notifications, Settings, Audit Logs, Support

### User Panel (`/dashboard/*`) — 15 pages
Dashboard, New Article (5-step wizard), Articles, Article Detail, Research Hub, SEO Tools, CMS Connections, Brand Voice, Templates, Analytics, Team, API Keys, Billing, Settings, Support

## ✨ Key Features

- **Demo Login** — 1-click login as Admin or User (no API needed)
- **5-Step Article Wizard** — Research → Outline → Draft → SEO → Publish
- **Cmd/Ctrl+K Search** — Quick-jump to any page
- **Notification Bell** — Real-time dropdown with unread badges
- **Collapsible Sidebar** — Desktop: icon-only mode, Mobile: overlay drawer
- **Error Boundary** — Graceful error handling with retry
- **Responsive** — Mobile, tablet, desktop
- **Accessibility** — Focus rings, reduced motion, aria labels

## 🏃 Getting Started

```bash
# Frontend
cd frontend
npm install
npm run dev        # → http://localhost:5173

# Backend
cd server
npm install
cp .env.example .env   # Fill in values
npm run dev            # → http://localhost:8000
```

> **The backend has two processes.** `npm run dev` starts the API server.
> `npm run worker:dev` starts the BullMQ worker that runs article-generation
> jobs. Both must be running for article generation to work end-to-end.

## ✨ Multi-Step Article Wizard

The wizard restores the original five-step flow (Research → Outline → Draft → SEO → Publish) with chunk-based Socket.io streaming and a TipTap rich-text editor with inline citations. Existing `POST /articles/generate` ("Quick Generate") stays untouched.

### Enabling the wizard

Toggle two feature flags — backend first, then frontend:

```bash
# backend/.env
ENABLE_WIZARD_BACKEND=true
WIZARD_STAGE_WORKER_CONCURRENCY=5
QUOTA_RECONCILIATION_INTERVAL_MIN=60

# frontend/.env
VITE_ENABLE_WIZARD=true
```

Restart the API, the worker, and the Vite dev server. Navigate to `/dashboard/new-article` — when the flag is on you'll see the new wizard, when off the legacy one-shot form continues to render.

### Wizard endpoints

All under `/api/v1` and gated by `ENABLE_WIZARD_BACKEND`:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/articles/wizard/start` | Reserve quota + create wizard-mode article |
| POST | `/articles/:id/stages/:stage/run` | Run one stage (research/outline/draft/seo) |
| POST | `/articles/:id/stages/:stage/approve` | Gate next stage |
| POST | `/articles/:id/stages/:stage/regenerate` | Re-run stage + cascade clear downstream |
| POST | `/articles/:id/stages/:stage/retry` | Retry failed stage (3-strike rule) |
| PATCH | `/articles/:id/brief/source-selections` | Pick which sources back the brief |
| PATCH | `/articles/:id/outline` | Save outline edits (1-20 sections) |
| POST | `/articles/:id/outline/sections` | Append a new section |
| DELETE | `/articles/:id/outline/sections/:idx` | Remove a section |
| GET | `/articles/:id/stages/:stage/chunks?since=N` | Replay missed Socket.io chunks |
| POST | `/articles/:id/wizard/abandon` | Soft-delete + refund quota |

### Streaming events

The worker fan-outs the following Socket.io events (scoped to `workspace:{workspaceId}`):

- `article:stage_started` — `{ articleId, stage, retryCount, startedAt }`
- `article:stage_chunk` — `{ articleId, stage, chunkIndex, chunkType, data, timestamp }`
- `article:stage_completed` — `{ articleId, stage, completedAt, totalChunks, output }`
- `article:stage_failed` — `{ articleId, stage, failureReason, recoverable, retryCount }`

Chunks are buffered in Redis at `wizard:chunks:{articleId}:{stage}` with a 60-minute TTL and a 500-entry cap per stage so reconnecting clients can replay.

### Operational scripts

```bash
# Backfill stages[] on legacy articles created before the wizard feature
node backend/scripts/backfillArticleStages.js          # dry-run
node backend/scripts/backfillArticleStages.js --apply  # commit

# End-to-end smoke test (start → research → outline → draft → seo)
node backend/scripts/wizardSmokeTest.js

# Cleanup orphan articles (legacy)
node backend/scripts/cleanupOrphanArticles.js --apply
```

### Background sweepers (run inside the worker process)

| Sweeper | Cadence | Purpose |
|---------|---------|---------|
| `scheduledPublishSweeper` | 5 min | Re-enqueue overdue scheduled publishes |
| `quotaReconciliationSweeper` | 1 hour (configurable via `QUOTA_RECONCILIATION_INTERVAL_MIN`) | Refund any failed-with-quota-pending articles |


## 📦 Build

```bash
cd frontend
npm run build      # Production build → dist/
```

## 🎯 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@newsroommcp.com | Admin@12345 |
| Publisher | user@newsroommcp.com | User@12345 |

Or use the **1-click demo cards** on the login page — no typing needed.

## 📄 License

Private — All rights reserved.
