# CLAUDE.md — Agency OS Master Folder
> Regras obrigatórias para qualquer IA trabalhando neste projeto.

---

## 📁 ESTRUTURA DA PASTA MESTRE

```
agency-os/              ← PASTA MESTRE (não mova arquivos fora daqui)
├── CLAUDE.md           ← este arquivo
├── specs/
│   ├── PRD-fase1.md    ← Research (SDD Etapa 1) ✅
│   └── SPEC-fase1.md   ← Spec (SDD Etapa 2)
├── web/                ← Next.js 14 App Router
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── package.json
└── agentes/            ← System prompts dos 21 agentes
    ├── head/           → ORACLE
    ├── estrategista/   → VANCE
    ├── copywriter/     → VERA
    ├── designer/       → ATLAS
    ├── ui-designer/    → ATLAS (UI)
    ├── traffic-manager/→ VOLT
    ├── engajador/      → PULSE
    ├── publicador/     → CIPHER
    ├── genesis/        → GENESIS
    ├── lore/           → LORE
    ├── prism/          → PRISM
    ├── nexus/          → NEXUS
    ├── marco/          → MARCO
    ├── flux/           → FLUX
    ├── iris/           → IRIS
    ├── vector/         → VECTOR
    ├── bridge/         → BRIDGE
    ├── aegis/          → AEGIS
    ├── harbor/         → HARBOR
    ├── ledger/         → LEDGER
    ├── surge/          → SURGE
    └── anchor/         → ANCHOR
```

---

## 🛠️ STACK (web/)

```
Next.js 14 (App Router) + TypeScript
Tailwind CSS + shadcn/ui
Supabase (Postgres + RLS + Storage + Auth)
Anthropic API — claude-sonnet-4-6
Vercel (deploy)
```

---

## 🎨 DESIGN SYSTEM (obrigatório em todos os componentes)

> Source of truth: `design-system/agency-os/MASTER.md`

```css
/* Cores */
--color-bg:             #09090B   /* fundo principal */
--color-surface:        #18181B   /* cards, sidebar */
--color-surface-raised: #27272A   /* dropdowns, tooltips */
--color-border:         rgba(255,255,255,0.07)
--color-border-strong:  rgba(255,255,255,0.12)
--color-text:           #FAFAFA
--color-muted:          #A1A1AA
--color-accent:         #F59E0B   /* amber — CTAs, badges ativos */
--color-accent-hover:   #D97706
--color-accent-fg:      #0A0A0A   /* texto sobre botão accent */
--color-success:        #22C55E
--color-warning:        #F97316
--color-error:          #EF4444
```

- **Font:** Inter (Google Fonts) — única fonte, pesos 400/500/600/700
- **Dark mode:** padrão — fundo `#09090B` (nunca `#000000` puro)
- **Container:** max-width `1280px` (layout), conteúdo principal `max-w-5xl`
- **Accent `#F59E0B`:** apenas em 1 elemento por seção (CTA, badge ativo, ícone destaque)
- **Border radius:** 4px botões/inputs · 6px cards · 8px modals
- **Transições:** `150ms ease-out` para hover/focus
- **Ícones:** Lucide (stroke, consistente) — sem emojis

---

## 🤖 OS 21 AGENTES

```
META:          GENESIS · LORE
ORQUESTRAÇÃO:  ORACLE · NEXUS
PRODUÇÃO:      VANCE · VERA · MARCO · ATLAS · VOLT · PULSE · CIPHER · FLUX
INTELIGÊNCIA:  IRIS · VECTOR · PRISM
OPERAÇÕES:     BRIDGE · AEGIS · HARBOR · LEDGER
GROWTH:        SURGE · ANCHOR
```

**API:** Anthropic `claude-sonnet-4-6` para todos.  
**System prompts:** carregados de `agentes/[nome]/system-prompt.txt`  
**Contexto injetado por chamada:** system-prompt + brand voice do cliente + brief do job

---

## 🚫 REGRAS DE OURO

1. **Nunca** criar arquivos fora de `agency-os/`
2. **Nunca** usar `any` no TypeScript
3. **Nunca** hardcodar cores — usar as CSS vars do design system
4. **Nunca** criar componentes fora de `web/components/`
5. **Sempre** usar shadcn/ui para primitivos (Button, Input, Card, etc.)
6. **Sempre** dark mode first — testar no fundo `#09090B`
7. **Sempre** mobile-first (min-width: 375px base)
8. **Sempre** seguir SDD: PRD → SPEC → CODE (nesta ordem)
9. **Sempre** consultar `design-system/agency-os/MASTER.md` antes de criar componentes

---

## 📦 DEPENDÊNCIAS PRINCIPAIS (web/)

```json
{
  "next": "^14",
  "@supabase/supabase-js": "latest",
  "@supabase/ssr": "latest",
  "@anthropic-ai/sdk": "latest",
  "shadcn/ui": "via npx shadcn",
  "lucide-react": "latest",
  "react-hook-form": "latest",
  "zod": "latest",
  "@tanstack/react-query": "latest",
  "next-themes": "latest",
  "tailwind-merge": "latest",
  "clsx": "latest"
}
```

---

## 🗄️ BANCO DE DADOS — Fase 1 (Supabase)

Tabelas: `profiles` · `clients` · `client_assets` · `jobs` · `job_outputs`  
RLS: admin full access · collaborator vê apenas clientes atribuídos  
Sem acesso público na Fase 1 (portal cliente = Fase 2)

---

## 🗺️ FASES DO PROJETO

- **Fase 1 (atual):** Auth + Clients + Jobs + Agents + Gallery + Financial básico
- **Fase 2:** Portal cliente + CRM leads + WhatsApp Business + Google Sheets sync
- **Fase 3:** Instagram API + Meta Ads API + Figma API + Blog CMS
- **Futuro:** Multi-tenant / SaaS

---

*Última atualização: Abril 2026*
