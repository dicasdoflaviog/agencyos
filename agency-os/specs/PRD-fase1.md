# PRD — Agency OS | Fase 1
> SDD Research Output · Abril 2026
> Próximo passo: gerar SPEC-fase1.md em nova conversa

---

## 1. CONTEXTO DO PROJETO

**Projeto:** Agency OS — painel de operação da agência dicasdoflaviog  
**Pasta raiz:** `PROJETOS CLAUDE/dicasdoflaviog/agency-os/`  
**Objetivo da Fase 1:** Ter um painel funcional para gerenciar clientes, criar jobs, acionar agentes e ver outputs aprovados.

**Entregável mínimo da Fase 1:**
> Cadastrar um cliente → criar um job → selecionar um agente → ver o output → aprovar ou rejeitar.

---

## 2. STACK CONFIRMADA

```
Frontend:   Next.js 14 (App Router) + TypeScript
Styling:    Tailwind CSS + shadcn/ui
Deploy:     Vercel (free tier)
Database:   Supabase (Postgres + RLS por role)
Storage:    Supabase Storage (logos, PDFs, outputs)
Auth:       Supabase Auth (email/password)
AI:         Anthropic API — claude-sonnet-4-6
```

**Dependências npm necessárias:**
```
@supabase/supabase-js @supabase/ssr
@anthropic-ai/sdk
@radix-ui/* (via shadcn)
lucide-react
tailwind-merge clsx
next-themes (dark mode)
react-hook-form zod (formulários)
@tanstack/react-query (data fetching)
```

**Brand system (obrigatório em todos os componentes):**
```css
--yellow: #FFD100
--black: #0D0D0D
--offwhite: #F5F2EC
--gray: #888880
--div-light: #E8E5DF
Font heading: Bebas Neue
Font body: DM Sans
Container: max-width 860px (conteúdo), 1280px (layout)
```

---

## 3. ESTRUTURA DE PASTAS — Next.js App Router

```
agency-os/
├── CLAUDE.md                    ← regras para IA (obrigatório)
├── specs/
│   ├── PRD-fase1.md            ← este arquivo
│   └── SPEC-fase1.md           ← gerar na próxima conversa
├── .env.local                   ← variáveis de ambiente
├── app/
│   ├── layout.tsx               ← root layout + providers
│   ├── (auth)/
│   │   └── login/page.tsx      ← página de login
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← sidebar + nav protegida
│   │   ├── page.tsx            ← home/overview
│   │   ├── clients/
│   │   │   ├── page.tsx        ← lista de clientes
│   │   │   ├── new/page.tsx    ← criar cliente
│   │   │   └── [id]/page.tsx   ← detalhe do cliente
│   │   ├── jobs/
│   │   │   ├── page.tsx        ← kanban de jobs
│   │   │   ├── new/page.tsx    ← criar job
│   │   │   └── [id]/page.tsx   ← detalhe + interface de agentes
│   │   ├── gallery/
│   │   │   └── page.tsx        ← outputs por cliente
│   │   └── financial/
│   │       └── page.tsx        ← receita + contratos
├── components/
│   ├── ui/                     ← shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── clients/
│   │   ├── ClientCard.tsx
│   │   └── ClientForm.tsx
│   ├── jobs/
│   │   ├── JobKanban.tsx
│   │   ├── JobCard.tsx
│   │   └── JobForm.tsx
│   ├── agents/
│   │   ├── AgentSelector.tsx
│   │   ├── AgentChat.tsx       ← interface de conversa com agente
│   │   └── OutputCard.tsx
│   └── gallery/
│       └── GalleryGrid.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← browser client
│   │   ├── server.ts           ← server client
│   │   └── middleware.ts       ← proteção de rotas
│   ├── anthropic/
│   │   ├── client.ts           ← Anthropic client
│   │   └── agents.ts           ← carrega system-prompts dos 21 agentes
│   └── utils.ts                ← cn(), formatters
├── types/
│   └── database.ts             ← tipos gerados do Supabase
└── middleware.ts                ← auth middleware Next.js
```

---

## 4. SCHEMA DO BANCO — Fase 1 (Supabase)

### Tabelas necessárias para Fase 1:

```sql
-- Perfis de usuário (extend Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'collaborator')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes da agência
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  niche TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  contract_value DECIMAL(10,2),
  contract_status TEXT DEFAULT 'active' CHECK (contract_status IN ('active', 'pending', 'overdue')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets do cliente (logos, brand voice, styleguide)
CREATE TABLE client_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('logo', 'styleguide', 'brandvoice', 'font', 'product', 'other')),
  name TEXT NOT NULL,
  file_url TEXT,
  content TEXT,  -- para arquivos de texto (brand voice, etc)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs (tarefas para os agentes)
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outputs gerados pelos agentes
CREATE TABLE job_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  agent_id TEXT NOT NULL,         -- ex: 'vera', 'vance', 'marco'
  agent_name TEXT NOT NULL,       -- ex: 'VERA', 'VANCE', 'MARCO'
  input_prompt TEXT NOT NULL,     -- o que foi enviado ao agente
  output_content TEXT NOT NULL,   -- o que o agente retornou
  output_type TEXT DEFAULT 'text' CHECK (output_type IN ('text', 'copy', 'strategy', 'script', 'image_prompt')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
  feedback TEXT,                  -- feedback do Flávio ao rejeitar
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies (Fase 1 — simples):
```sql
-- Apenas admin e collaborator acessam (não há acesso público na Fase 1)
-- Portal do cliente vem na Fase 2

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_outputs ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
CREATE POLICY "Admin full access" ON clients
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Collaborator vê clientes atribuídos a ele
CREATE POLICY "Collaborator client access" ON clients
  FOR SELECT USING (
    created_by = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

---

## 5. OS 21 AGENTES — como integrar via API

### Estrutura de dados dos agentes:

```typescript
// lib/anthropic/agents.ts
export const AGENTS = {
  // ORQUESTRAÇÃO
  oracle: { name: 'ORACLE', role: 'Head & Orquestrador', layer: 'orchestration' },
  nexus:  { name: 'NEXUS',  role: 'Gerente de Cliente',  layer: 'orchestration' },

  // META
  genesis: { name: 'GENESIS', role: 'Creator de Agentes', layer: 'meta' },
  lore:    { name: 'LORE',    role: 'Memória Institucional', layer: 'meta' },

  // PRODUÇÃO
  vance:  { name: 'VANCE',  role: 'Estrategista',     layer: 'production' },
  vera:   { name: 'VERA',   role: 'Copywriter',        layer: 'production' },
  marco:  { name: 'MARCO',  role: 'Roteirista',        layer: 'production' },
  atlas:  { name: 'ATLAS',  role: 'UI Designer',       layer: 'production' },
  volt:   { name: 'VOLT',   role: 'Traffic Manager',   layer: 'production' },
  pulse:  { name: 'PULSE',  role: 'Engajador',         layer: 'production' },
  cipher: { name: 'CIPHER', role: 'Publicador',        layer: 'production' },
  flux:   { name: 'FLUX',   role: 'Automação',         layer: 'production' },

  // INTELIGÊNCIA
  iris:   { name: 'IRIS',   role: 'Pesquisador',       layer: 'intelligence' },
  vector: { name: 'VECTOR', role: 'Analytics',         layer: 'intelligence' },
  prism:  { name: 'PRISM',  role: 'Cultura & Audiência', layer: 'intelligence' },

  // OPERAÇÕES
  bridge: { name: 'BRIDGE', role: 'Onboarding',        layer: 'operations' },
  aegis:  { name: 'AEGIS',  role: 'Aprovação',         layer: 'operations' },
  harbor: { name: 'HARBOR', role: 'CRM',               layer: 'operations' },
  ledger: { name: 'LEDGER', role: 'Financeiro',        layer: 'operations' },

  // GROWTH
  surge:  { name: 'SURGE',  role: 'Growth Hacker',     layer: 'growth' },
  anchor: { name: 'ANCHOR', role: 'Customer Success',  layer: 'growth' },
}
```

### System prompts: carregados dos arquivos existentes
```
agentes/head/system-prompt.txt       → oracle
agentes/estrategista/system-prompt.txt → vance
agentes/copywriter/system-prompt.txt  → vera
agentes/designer/system-prompt.txt    → atlas
agentes/traffic-manager/system-prompt.txt → volt
agentes/engajador/system-prompt.txt   → pulse
agentes/publicador/system-prompt.txt  → cipher
agentes/ui-designer/system-prompt.txt → atlas (UI)
agentes/prism/system-prompt.txt       → prism
agentes/lore/system-prompt.txt        → lore
agentes/genesis/system-prompt.txt     → genesis
```
Os demais (nexus, marco, flux, iris, vector, bridge, aegis, harbor, ledger, surge, anchor) precisam ter seus system-prompts criados na Fase 1 ou ter fallback para um system-prompt genérico.

### Contexto injetado em cada chamada:
```typescript
// Contexto padrão para todos os agentes
const buildContext = (client: Client, job: Job) => `
CLIENTE: ${client.name} | Nicho: ${client.niche}
BRAND VOICE: ${client.assets.brandvoice}
JOB: ${job.title} — ${job.description}
`
```

### API Route para acionar agente:
```
POST /api/agents/run
Body: { agentId, jobId, clientId, userMessage }
Response: { outputId, content, agentName }
```

---

## 6. MÓDULOS DA FASE 1 — escopo exato

### M1 — AUTH
- `/login` — formulário email + senha (Supabase Auth)
- Middleware protege todas as rotas `/(dashboard)/*`
- Session persistida via cookies (Supabase SSR)
- Roles: `admin` e `collaborator` na tabela `profiles`

### M2 — CLIENTS
- `/clients` — lista com card: nome, nicho, status, valor contrato
- `/clients/new` — form: nome, nicho, logo upload, valor contrato
- `/clients/[id]` — detalhe: info + assets + lista de jobs do cliente
- Status badge: ativo (verde) / pausado (amarelo) / arquivado (cinza)

### M3 — JOBS
- `/jobs` — kanban 4 colunas: Backlog / Em andamento / Revisão / Concluído
- `/jobs/new` — form: título, descrição, cliente, prioridade, prazo
- `/jobs/[id]` — detalhe do job + lista de outputs + interface de agente

### M4 — INTERFACE DE AGENTES (dentro de `/jobs/[id]`)
- Sidebar com lista dos 21 agentes agrupados por camada
- Campo de input para a mensagem/brief do job
- Botão "Acionar agente" → chama `POST /api/agents/run`
- Exibe output em painel de leitura
- Botões: Salvar output / Pedir revisão / Descartar

### M5 — GALLERY
- `/gallery` — grid de outputs aprovados, filtro por cliente
- Card do output: agente, job, data, tipo, status (aprovado/pendente)
- Ação: Aprovar ✓ / Solicitar revisão ✗

### M6 — FINANCIAL (básico)
- `/financial` — tabela de clientes ativos com:
  - Nome, valor do contrato, status (em dia / pendente / atrasado)
  - Total de receita recorrente ativa no topo
  - Sem integração externa ainda (dados manuais no Supabase)

---

## 7. DESIGN SYSTEM — PADRÕES DE COMPONENTE

### Tema: Dark mode como padrão (fundo #0D0D0D)
```
Background principal: #0D0D0D (--black)
Surface cards: #111110 (ligeiramente mais claro)
Bordas: rgba(255,255,255,0.07)
Texto principal: #F5F2EC (--offwhite)
Texto secundário: #888880 (--gray)
Accent: #FFD100 (--yellow)
```

### Padrão de componentes:
```
Cards:        border radius 4px, border 1px solid rgba(255,255,255,0.07)
Badges:       background rgba(cor, 0.12), cor text, sem border-radius excessivo
Botão CTA:    background #FFD100, color #0D0D0D, font-weight 700
Botão ghost:  border 1px solid rgba(255,255,255,0.12), color #F5F2EC
Input:        background rgba(255,255,255,0.04), border rgba(255,255,255,0.1)
```

---

## 8. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

# Fase 2+
WHATSAPP_TOKEN=
META_PIXEL_ID=935816292402573
FIGMA_TOKEN=
```

---

## 9. O QUE NÃO ENTRA NA FASE 1

```
❌ Portal do cliente (Fase 2)
❌ CRM de leads / ManyChat webhook (Fase 2)
❌ WhatsApp Business API (Fase 2)
❌ Google Sheets sync (Fase 2)
❌ Instagram Graph API (Fase 3)
❌ Meta Ads API (Fase 3)
❌ Figma REST API (Fase 3)
❌ Blog/CMS headless (Fase 3)
❌ Vercel Cron Jobs (Fase 3)
❌ Multi-tenant / SaaS (Futuro)
```

---

## 10. PRÓXIMO PASSO — SDD Etapa 2

```
ABRIR NOVA CONVERSA (contexto limpo) e enviar:

"@specs/PRD-fase1.md

Leia este PRD e gere uma SPEC-fase1.md detalhada.

Para CADA arquivo, especifique:
- Caminho exato
- Ação: criar ou modificar
- O que implementar (seja específico)
- Code snippets quando necessário

Inclua:
- Ordem de implementação (o que fazer primeiro)
- Dependências entre arquivos
- Checklist de validação no final"
```

---

*PRD gerado via SDD — Research Phase · Agency OS Fase 1 · Abril 2026*
