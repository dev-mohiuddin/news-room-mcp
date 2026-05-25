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
