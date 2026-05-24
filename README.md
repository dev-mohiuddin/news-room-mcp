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

## 📦 Build

```bash
cd frontend
npm run build      # Production build → dist/
```

## 🎯 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@newsroommcp.com | demo-admin-2026 |
| Publisher | user@newsroommcp.com | demo-user-2026 |

Or use the **1-click demo cards** on the login page — no typing needed.

## 📄 License

Private — All rights reserved.
