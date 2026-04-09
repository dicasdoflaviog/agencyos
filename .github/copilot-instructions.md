# Copilot Instructions — Agency OS

## Repository Structure

This is a monorepo. Each sub-folder is an independent project:

| Folder | Purpose |
|--------|---------|
| `agency-os/web/` | **Main product** — Next.js SaaS app for marketing agencies |
| `agency-os/agentes/` | System prompts for the 21 AI agents |
| `agency-os/specs/` | PRD and SPEC files per phase |
| `agency-os/supabase/` | SQL migrations (`migration_fase1.sql` → `migration_fase4.sql`) |
| `design-system/agency-os/MASTER.md` | Design token source of truth |
| `get-shit-done/` | GSD workflow system (planning/execution framework) |
| `claude-mem/` | Claude Code plugin for persistent session memory |
| `n8n-mcp/` | MCP server bridging n8n nodes to AI assistants |

> **Always work inside a sub-project folder.** Never create files at the repo root.

---

## Main App — `agency-os/web/`

### Stack

- **Next.js 16** (App Router) + TypeScript — check `node_modules/next/dist/docs/` before using APIs; this version has breaking changes from older Next.js
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Supabase** — Postgres + Auth (JWT) + RLS + Storage
- **Anthropic** — `claude-haiku-4-5` for classifiers/cheap tasks, `claude-sonnet-4-6` for main agents
- **Google Gemini** — image generation (ATLAS module)
- **ElevenLabs** — voice cloning (VOX module)
- **Vercel** — deploy (auto-deploy on `git push`)

### Commands

```bash
# from agency-os/web/
npm run dev      # start dev server
npm run build    # production build (must pass before deploy goes live)
npm run lint     # ESLint check
```

No test suite is configured yet. Build is the main validation gate.

### App Router Layout

```
app/
├── (auth)/          # login, signup, password reset
├── (dashboard)/     # main workspace: analytics, clients, gallery, jobs, oracle, reports, templates
├── (client)/        # client portal
├── admin/           # admin panel
├── api/             # API routes
│   ├── agents/oracle/   # Oracle chat streaming (SSE)
│   ├── agents/atlas/    # Image generation
│   ├── agents/vox/      # Voice cloning
│   └── stripe/webhooks/ # Payment webhooks
├── captacao/        # lead capture
└── onboarding/      # new user flow
```

---

## Design System (mandatory)

Source of truth: `design-system/agency-os/MASTER.md`. For page-specific overrides, check `design-system/pages/[page-name].md` first.

```css
/* Core tokens — never hardcode these values */
--color-bg:             #09090B   /* main background */
--color-surface:        #18181B   /* cards, sidebar */
--color-surface-raised: #27272A   /* dropdowns, tooltips */
--color-border:         rgba(255,255,255,0.07)
--color-border-strong:  rgba(255,255,255,0.12)
--color-text:           #FAFAFA
--color-muted:          #A1A1AA
--color-accent:         #F59E0B   /* amber — use on 1 element per section max */
--color-accent-hover:   #D97706
--color-success:        #22C55E
--color-warning:        #F97316
--color-error:          #EF4444
```

- **Font:** Inter only — weights 400/500/600/700
- **Icons:** Lucide (stroke) — no emojis
- **Dark mode first** — background is always `#09090B`, never `#000000`
- **Border radius:** 4px buttons/inputs · 6px cards · 8px modals
- **Transitions:** `150ms ease-out`
- **Layout:** `max-width: 1280px` page · `max-w-5xl` content

---

## Key Conventions

### TypeScript
- **`any` is banned** — use proper types or `unknown`
- Zod schemas for all form validation
- `react-hook-form` + `@hookform/resolvers/zod` for forms

### Components
- Always use **shadcn/ui primitives** (Button, Input, Card, Dialog, Select, etc.) — never roll raw HTML for UI elements
- All components go in `web/components/` — never in pages or `app/`
- `'use client'` only when needed (event handlers, state, hooks)

### Database
- All schema changes go through SQL migration files in `agency-os/supabase/`
- **RLS is always on** — every new table needs Row Level Security policies
- Use `updated_at` triggers for all tables
- Foreign keys must reference existing tables explicitly

### API Routes
- API routes live in `app/api/`
- Streaming (SSE) used for Oracle chat — use `ReadableStream` / `StreamingTextResponse`
- Files/audio never stored as base64 in DB — use Supabase Storage

### AI Agent System
- 21 agents in `agency-os/agentes/[name]/system-prompt.txt`
- Each call injects: system-prompt + brand DNA + styleguide + job brief
- Oracle limits conversation history to last 10 messages to control token cost
- Cheap classifier tasks use `claude-haiku-4-5`; main generation uses `claude-sonnet-4-6`

### Cost Rules
- Before any AI call: is there a cache opportunity? (`revalidate`, `useMemo`, etc.)
- No polling — use webhooks or SSE
- Delete ephemeral files from Supabase Storage after processing
- Alert when a feature will scale linearly with user count

### Development Workflow
- Follow **SDD order**: PRD → SPEC → CODE — never skip to code without an approved spec
- For tasks touching > 3 files, save a plan to `docs/plans/YYYY-MM-DD-<feature>.md`
- When debugging: reproduce → locate divergence → find root cause → then fix

---

## The 21 Agents

```
META:          GENESIS · LORE
ORCHESTRATION: ORACLE · NEXUS
PRODUCTION:    VANCE · VERA · MARCO · ATLAS · VOLT · PULSE · CIPHER · FLUX
INTELLIGENCE:  IRIS · VECTOR · PRISM
OPERATIONS:    BRIDGE · AEGIS · HARBOR · LEDGER
GROWTH:        SURGE · ANCHOR
```

Prompts are plain text files loaded at runtime — no special format, just prose instructions.

---

## GSD Workflow (`get-shit-done/`)

Use `/gsd-*` commands in Copilot CLI for structured planning and execution. Key commands:

- `/gsd-plan-phase` — create a phase plan with tasks and verification criteria
- `/gsd-execute-phase` — execute planned tasks with atomic commits
- `/gsd-discuss-phase` — gather context before planning (use `--auto` to skip questions)
- `/gsd-code-review` — review staged/unstaged changes for bugs and security issues
- `/gsd-next` — advance to the next logical step automatically

Plans are stored in `.planning/` and tracked via roadmap phases.

---

## n8n-MCP (`n8n-mcp/`)

```bash
# from n8n-mcp/
npm run build          # compile TypeScript
npm test               # full test suite
npm run test:unit      # unit tests only
npm run test -- tests/unit/services/property-filter.test.ts  # single test
npm run lint           # TypeScript type check
npm run rebuild        # rebuild node database from n8n packages
```

---

## Environment Variables

Stored in `agency-os/web/.env.local` (never committed). Required keys include Supabase URL/keys, Anthropic API key, ElevenLabs key, Google Gemini key, Stripe keys, Resend key, Apify token. Configure matching vars in the Vercel dashboard for production.
