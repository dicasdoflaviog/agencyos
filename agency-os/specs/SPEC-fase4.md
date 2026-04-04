# SPEC-fase4 — Agency OS
> Software Design Document · Fase 4  
> Versão 1.0 — Baseado em PRD-fase4.md

---

## 1. Visão Geral

A Fase 4 expande o Agency OS de uma ferramenta individual para uma **plataforma colaborativa** com:
- Time com roles granulares
- Contratos e faturamento integrados
- CMS headless por cliente
- Analytics avançado (Instagram + Meta Ads)
- AI Memory (pgvector per-client)
- White-label & multi-tenant

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Storage + Realtime + pgvector) · TypeScript · Tailwind CSS · shadcn/ui · Anthropic Claude API · Resend · Vercel

---

## 2. Resumo de Arquivos

### Novos Arquivos

```
web/app/(dashboard)/settings/team/
├── page.tsx                         # Gerenciar time da agência
├── InviteMemberForm.tsx             # Form de convite por e-mail

web/app/(dashboard)/settings/workspace/
└── page.tsx                         # White-label config

web/app/(dashboard)/clients/[id]/contracts/
├── page.tsx                         # Lista de contratos do cliente
├── new/page.tsx                     # Criar contrato
└── [contractId]/
    ├── page.tsx                     # Detalhe do contrato + invoices
    └── edit/page.tsx                # Editar contrato

web/app/(dashboard)/clients/[id]/cms/
├── page.tsx                         # Lista de posts
├── new/page.tsx                     # Criar post
└── [postId]/
    ├── page.tsx                     # Preview do post
    └── edit/page.tsx                # Editor Markdown

web/app/(dashboard)/clients/[id]/metrics/
└── page.tsx                         # Analytics: Instagram + Meta Ads

web/app/(dashboard)/clients/[id]/memory/
└── page.tsx                         # AI Memory viewer

web/app/(dashboard)/financial/
└── advanced/page.tsx                # MRR, ARR, vencimentos, inadimplência

web/app/api/
├── team/
│   ├── invite/route.ts              # POST: enviar convite
│   └── [memberId]/route.ts          # PATCH/DELETE: atualizar role / remover
├── contracts/
│   ├── route.ts                     # GET+POST /api/contracts
│   └── [id]/
│       ├── route.ts                 # GET+PATCH+DELETE
│       └── invoices/
│           └── route.ts             # GET+POST invoices por contrato
├── posts/
│   ├── route.ts                     # GET+POST /api/posts
│   └── [id]/route.ts                # GET+PATCH+DELETE
├── memory/
│   ├── upsert/route.ts              # POST: embed + upsert
│   └── search/route.ts              # GET: semantic search
└── cron/
    ├── ig-metrics/route.ts          # Cron: sync Instagram metrics
    └── ads-metrics/route.ts         # Cron: sync Meta Ads metrics

web/components/
├── team/
│   ├── MemberList.tsx               # Lista de membros com roles
│   └── RoleBadge.tsx                # Badge de role
├── contracts/
│   ├── ContractCard.tsx             # Card resumo do contrato
│   ├── ContractForm.tsx             # Form criar/editar
│   ├── InvoiceList.tsx              # Lista de invoices com status
│   └── InvoiceForm.tsx              # Form criar/editar invoice
├── cms/
│   ├── PostCard.tsx                 # Card de post com status
│   ├── PostEditor.tsx               # Wrapper do editor Markdown
│   └── PostStatusBadge.tsx          # Badge: draft/review/published
├── metrics/
│   ├── IGMetricsChart.tsx           # Gráfico Instagram (followers, reach)
│   ├── AdsMetricsChart.tsx          # Gráfico Meta Ads (spend, ROAS, CPL)
│   └── MetricCard.tsx               # Card de métrica single-value
└── memory/
    ├── MemoryList.tsx               # Lista de memórias por cliente
    └── MemorySearchBar.tsx          # Input de busca semântica

specs/
├── PRD-fase4.md                     # ✅ Criado
└── SPEC-fase4.md                    # 🔲 Este arquivo
```

---

## 3. Bloco A — Time & Permissões

### 3.1 Schema

```sql
-- workspace_members
CREATE TABLE workspace_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'collaborator'
                CHECK (role IN ('admin', 'collaborator', 'viewer')),
  invited_by  UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- client_assignments: colaboradores por cliente
CREATE TABLE client_assignments (
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, client_id)
);

-- invite_tokens: tokens de convite por e-mail
CREATE TABLE invite_tokens (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'collaborator',
  token      TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES profiles(id),
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 API Routes

#### `POST /api/team/invite`
```typescript
// Body: { email: string; role: 'collaborator' | 'viewer' }
// 1. Gera token UUID
// 2. Insere em invite_tokens
// 3. Envia e-mail via Resend com link de aceite
// 4. Retorna { success: true }
```

#### `GET /api/team/invite/accept?token=XXX`
```typescript
// 1. Valida token (exists, not used, not expired)
// 2. Cria profile no Auth (ou usa profile existente)
// 3. Insere em workspace_members
// 4. Marca token como used_at = NOW()
// 5. Redirect para /auth/login
```

#### `PATCH /api/team/[memberId]`
```typescript
// Body: { role: string } | { client_ids: string[] }
// Admin only — atualiza role ou atribuição de clientes
```

#### `DELETE /api/team/[memberId]`
```typescript
// Remove da workspace_members e client_assignments
```

### 3.3 Page: `/settings/team`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Time da Agência                        [+ Convidar Membro]  │
├─────────────────────────────────────────────────────────────┤
│ NOME                  E-MAIL           ROLE       CLIENTES   │
│ ─────────────────────────────────────────────────────────── │
│ Ana Lima              ana@ag.com       Admin       —        │
│ Carlos Souza          cs@ag.com        Colaborador  3 ▼     │
│                       (pending)        Visualizador  0      │
└─────────────────────────────────────────────────────────────┘
```

**Componente `InviteMemberForm`:**
- Input e-mail
- Select role (collaborator | viewer)
- Submit → POST /api/team/invite → toast de confirmação

**Componente `MemberList`:**
- Fetches workspace_members JOIN profiles
- Pending invites (invite_tokens não usados) listados com badge "Pendente"
- Clique em "3 clientes ▼" → dropdown checkbox para atribuir clientes

### 3.4 RLS Updates

```sql
-- Jobs: colaborador só vê jobs de clientes atribuídos
CREATE POLICY "Colaborador vê jobs dos seus clientes"
  ON jobs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM client_assignments WHERE client_id = jobs.client_id
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```
*(Padrão similar para: clients, outputs, briefings, job_briefings)*

---

## 4. Bloco B — Contratos & Faturamento

### 4.1 Schema

```sql
CREATE TABLE contracts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  value       NUMERIC(10,2) NOT NULL,
  billing     TEXT NOT NULL CHECK (billing IN ('monthly', 'project', 'retainer')),
  start_date  DATE NOT NULL,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'paused', 'ended', 'draft')),
  notes       TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  due_date    DATE NOT NULL,
  paid_at     TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  notes       TEXT,
  pdf_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 API Routes

#### `GET /api/contracts?client_id=X`
Retorna contratos ativos do cliente, JOIN com invoices.

#### `POST /api/contracts`
```typescript
// Body: { client_id, value, billing, start_date, end_date?, notes? }
// Cria contrato + opcionalmente gera primeira invoice (billing = 'monthly')
```

#### `GET /api/contracts/[id]`
Retorna contrato + invoices relacionadas.

#### `PATCH /api/contracts/[id]`
Atualiza status, value, end_date, notes.

#### `POST /api/contracts/[id]/invoices`
```typescript
// Body: { amount, due_date, notes? }
// Cria invoice e retorna ID
```

#### `PATCH /api/contracts/[id]/invoices/[invoiceId]`
```typescript
// Body: { status: 'paid', paid_at: ISO_date } | { status: 'cancelled' }
```

### 4.3 Pages

#### `/clients/[id]/contracts`
```
┌──────────────────────────────────────────────────────────────┐
│ Contratos · Acme Corp                    [+ Novo Contrato]   │
├──────────────────────────────────────────────────────────────┤
│ ● Marketing Digital    R$ 5.000/mês  ativo    venc. 01/jan  │
│ ● Projeto Site         R$ 12.000     concluído              │
└──────────────────────────────────────────────────────────────┘
```

#### `/clients/[id]/contracts/[id]` — Detalhe
```
┌──────────────────────────────────────────────────────────────┐
│ Marketing Digital · R$ 5.000/mês         [Editar] [Encerrar]│
│ Status: Ativo  ·  Início: Jan 2025  ·  Sem vencimento       │
├──────────────────────────────────────────────────────────────┤
│ FATURAS                                    [+ Nova Fatura]   │
│ Jan/2025  R$ 5.000   Pago  ✓  06/Jan      ✎ ✕              │
│ Fev/2025  R$ 5.000   Pago  ✓  05/Fev                       │
│ Mar/2025  R$ 5.000   ⚠ Vencida            ✎ ✕              │
└──────────────────────────────────────────────────────────────┘
```

#### `/financial/advanced` — Dashboard Financeiro Avançado
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  MRR         │  ARR         │  Receita     │  Inadimp.    │
│  R$ 24.500   │  R$ 294.000  │  R$ 19.800   │  R$ 4.700   │
│  +8% vs mês  │  projetado   │  (recebido)  │  2 faturas  │
└──────────────┴──────────────┴──────────────┴──────────────┘

[Gráfico de Receita Mensal — últimos 12 meses]

PRÓXIMOS VENCIMENTOS (30 dias)
─────────────────────────────────────────────────────────────
01/Mai  Acme Corp     R$ 5.000    ⏳ Pendente   [Marcar pago]
15/Mai  TechStart     R$ 3.200    ⏳ Pendente   [Marcar pago]
```

### 4.4 `ContractForm` Props

```typescript
interface ContractFormProps {
  clientId: string
  contract?: Contract  // present in edit mode
  onSuccess: () => void
}

// Fields:
// - value: number (required)
// - billing: 'monthly' | 'project' | 'retainer' (required)
// - start_date: date picker (required)
// - end_date: date picker (optional)
// - status: select (default 'active')
// - notes: textarea
```

---

## 5. Bloco C — CMS Headless

### 5.1 Schema

```sql
CREATE TABLE posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  content      TEXT,
  cover_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'review', 'published')),
  published_at TIMESTAMPTZ,
  author_id    UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, slug)
);
```

### 5.2 API Routes

#### `GET /api/posts?client_id=X&status=published`
Lista posts filtrados. Admin vê todos os status; client (Fase 3) vê só published.

#### `POST /api/posts`
```typescript
// Body: { client_id, title, slug, content?, status? }
// Gera slug automático a partir do title se não fornecido
```

#### `PATCH /api/posts/[id]`
Atualiza qualquer campo. Se status → 'published' e published_at não set, define now().

#### `DELETE /api/posts/[id]`
Soft-delete ou remoção direta (a definir — recomendado soft-delete: add `deleted_at`).

#### `GET /api/public/posts?client=SLUG`
Rota **pública** (sem auth). Retorna posts published de um client_slug.
```typescript
// 1. Lookup clients WHERE slug = param
// 2. SELECT * FROM posts WHERE client_id = X AND status = 'published' ORDER BY published_at DESC
// 3. Retorna array limpo (sem dados internos)
```

### 5.3 `PostEditor` Component

```typescript
// web/components/cms/PostEditor.tsx
'use client'
import MDEditor from '@uiw/react-md-editor'

interface PostEditorProps {
  clientId: string
  post?: Post  // edit mode
}

// Estado local: title, slug, content, status
// Auto-generate slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
// Preview tab do MDEditor mostra renderização real
// Submit → POST or PATCH /api/posts
// Botão "Publicar" → PATCH { status: 'published' }
```

### 5.4 Page: `/clients/[id]/cms`

Tab na sidebar do cliente (adicionar entrada no menu de cliente).

```
┌──────────────────────────────────────────────────────────────┐
│ CMS · Acme Corp                              [+ Novo Post]   │
├──────────────────────────────────────────────────────────────┤
│ Título                         Status      Publicado em      │
│ ──────────────────────────────────────────────────────────── │
│ 10 Tendências de Marketing     📗 Publicado  15/Mar 2025    │
│ Guia de SEO para 2025          📙 Revisão                   │
│ Relatório Q1                   📓 Rascunho                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Bloco D — Analytics Avançado

### 6.1 Schema

```sql
CREATE TABLE ig_metrics (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL,
  followers       INTEGER,
  reach           INTEGER,
  impressions     INTEGER,
  engagement_rate NUMERIC(5,2),
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE TABLE ads_metrics (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id    TEXT NOT NULL,
  campaign_name  TEXT,
  spend          NUMERIC(10,2),
  impressions    INTEGER,
  clicks         INTEGER,
  cpl            NUMERIC(10,2),
  roas           NUMERIC(5,2),
  date           DATE NOT NULL,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, date)
);
```

### 6.2 Cron Routes

#### `GET /api/cron/ig-metrics` — Disparo diário 00:30 UTC
```typescript
// 1. Lista clients com integration_configs Instagram (Fase 3)
// 2. Para cada client: GET /me/insights via Graph API
// 3. UPSERT em ig_metrics com ON CONFLICT DO UPDATE
// 4. Protegido por Authorization: Bearer ${CRON_SECRET}
```

#### `GET /api/cron/ads-metrics` — Disparo diário 01:00 UTC
```typescript
// 1. Lista clients com integration_configs Meta Ads
// 2. Fetcha campanhas ativas dos últimos 30 dias
// 3. Calcula CPL = spend / leads; ROAS = revenue / spend
// 4. UPSERT em ads_metrics
```

### 6.3 Page: `/clients/[id]/metrics`

**Seções:**

**Instagram Overview**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Seguidores   │ Alcance/30d  │ Impressões   │ Engaj. Rate  │
│ 12.483       │ 48.200       │ 126.000      │ 4.2%         │
│ +2.1% ↑      │ +12% ↑       │ +8% ↑        │ -0.3% ↓      │
└──────────────┴──────────────┴──────────────┴──────────────┘
[Gráfico linha: Seguidores e Alcance — últimos 30 dias]
```

**Meta Ads Performance**
```
[Tabela de Campanhas]
CAMPANHA          GASTO      CLIQUES   CPL       ROAS
─────────────────────────────────────────────────────────────
Verão 2025        R$ 1.200   380       R$ 3,16   4.2x
Remarketing       R$ 450     210       R$ 2,14   6.1x
─────────────────────────────────────────────────────────────
Total             R$ 1.650   590
```

### 6.4 `IGMetricsChart` Props

```typescript
interface IGMetricsChartProps {
  clientId: string
  range: '7d' | '30d' | '90d'
}
// Usa recharts LineChart
// Duas linhas: followers (azul) + reach (verde)
// Tooltip mostra data + ambos os valores
```

---

## 7. Bloco E — AI Memory

### 7.1 Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE client_memories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  embedding  vector(1536),
  source     TEXT CHECK (source IN ('output_approved', 'briefing', 'manual')),
  source_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON client_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 7.2 API Routes

#### `POST /api/memory/upsert`
```typescript
// Body: { client_id, content, source, source_id? }
// 1. Gera embedding via openai.embeddings.create({ model: 'text-embedding-3-small', input: content })
// 2. INSERT INTO client_memories (client_id, content, embedding, source, source_id)
// 3. Retorna { id }
// Chamado após: output aprovado (no PATCH /api/outputs/[id] quando status → 'approved')
```

#### `GET /api/memory/search?client_id=X&query=Y`
```typescript
// 1. Gera embedding do query
// 2. SELECT id, content, source, 1 - (embedding <=> query_embedding) AS similarity
//    FROM client_memories WHERE client_id = X
//    ORDER BY embedding <=> query_embedding LIMIT 5
// 3. Retorna top-5 com similarity score
```

#### Integração no Pipeline (`/api/pipelines/route.ts`)
```typescript
// Antes de montar o prompt de cada agent step:
const memories = await fetch(`/api/memory/search?client_id=${briefing.client_id}&query=${step.instructions}`)
const memoryContext = memories.data.map(m => `• ${m.content}`).join('\n')
const enrichedPrompt = `${step.instructions}\n\n## Contexto do Cliente (Memória LORE):\n${memoryContext}`
```

### 7.3 Page: `/clients/[id]/memory`

```
┌──────────────────────────────────────────────────────────────┐
│ AI Memory · Acme Corp            [Buscar memória...]  [+ Add]│
├──────────────────────────────────────────────────────────────┤
│ 📗 output_approved   15/Mar  "Tom de voz: casual e direto,   │
│                               evitar jargões técnicos"       │
│ 📘 briefing          02/Mar  "Produto principal: SaaS B2B    │
│                               para logística. Target: CFOs"  │
│ ✏️ manual            20/Fev  "Fundada em 2019. CEO: Marco A."│
└──────────────────────────────────────────────────────────────┘
```

**Busca semântica:** input → GET /api/memory/search → renderiza resultados com score.

### 7.4 Integração com Output Approval

No `PATCH /api/outputs/[id]`:
```typescript
if (body.status === 'approved') {
  // Dispara upsert de memória em background
  await fetch('/api/memory/upsert', {
    method: 'POST',
    body: JSON.stringify({
      client_id: output.client_id,
      content: `Output aprovado (${output.output_type}): ${output.content.slice(0, 500)}`,
      source: 'output_approved',
      source_id: output.id
    })
  })
}
```

---

## 8. Bloco F — White-label & Multi-tenant

### 8.1 Schema

```sql
CREATE TABLE workspaces (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#F59E0B',
  domain        TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
```

### 8.2 Middleware de Routing

`web/middleware.ts` — Detecta workspace por hostname ou subpath:

```typescript
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Domínio customizado: acme.agencyos.app → workspace slug 'acme'
  const customDomain = await getWorkspaceByDomain(hostname)
  if (customDomain) {
    const url = request.nextUrl.clone()
    url.searchParams.set('workspace', customDomain.slug)
    return NextResponse.rewrite(url)
  }
  
  return NextResponse.next()
}
```

### 8.3 Page: `/settings/workspace`

```
┌──────────────────────────────────────────────────────────────┐
│ Configurações do Workspace                                   │
├──────────────────────────────────────────────────────────────┤
│ Nome da Agência     [Agency OS Pro          ]                │
│ Logo                [Upload logo]                           │
│ Cor principal       [#F59E0B  ] ████                        │
│ Domínio customizado [acme.agencyos.app      ]               │
│                                                              │
│                                             [Salvar]         │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Bloco G — Notion Sync

### 9.1 API Routes

#### `GET /api/cron/notion-sync` — Cron 06:00 UTC

```typescript
// 1. Lista workspaces com integration_configs Notion (type: 'notion')
// 2. Para cada workspace: lista jobs ativos
// 3. Para cada job: GET página Notion correspondente (notion_page_id salvo em jobs)
//    - Se não existe: cria página no database Notion e salva ID
//    - Se existe: compara status e atualiza o mais recente
// 4. Sync bidirecional: Notion status → jobs.status (se Notion for mais novo)
```

#### `POST /api/webhooks/notion`
```typescript
// Notion webhook (beta): ao atualizar uma página
// 1. Valida assinatura HMAC
// 2. Encontra job pelo notion_page_id
// 3. Atualiza status do job no Supabase
```

### 9.2 Schema Update

```sql
ALTER TABLE jobs ADD COLUMN notion_page_id TEXT;
```

---

## 10. Navegação — Updates

### Sidebar do Cliente (Detalhes)

Adicionar tabs ao expandir cliente na sidebar ou nas sub-rotas do cliente:

```
/clients/[id]              ← Overview
/clients/[id]/contracts    ← Contratos 🆕 Bloco B
/clients/[id]/cms          ← CMS 🆕 Bloco C
/clients/[id]/metrics      ← Métricas 🆕 Bloco D
/clients/[id]/memory       ← AI Memory 🆕 Bloco E
```

### Settings — Novos Itens

```
/settings/team             ← Time 🆕 Bloco A
/settings/workspace        ← Workspace 🆕 Bloco F
/settings/integrations     ← (já existe, Fase 3 expande)
```

### Financial Advanced

```
/financial                 ← (existente, overview simples)
/financial/advanced        ← MRR/ARR/Vencimentos 🆕 Bloco B
```

---

## 11. Configurações de Ambiente

Variáveis adicionais necessárias na Fase 4:

```bash
# Bloco E — AI Memory
OPENAI_API_KEY=sk-...

# Bloco G — Notion (por workspace, salvo em integration_configs)
# (sem variável global — configs por workspace no DB)

# Bloco F — White-label
NEXT_PUBLIC_APP_URL=https://agencyos-cyan.vercel.app
```

---

## 12. Vercel Cron Updates (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/ig-metrics",  "schedule": "30 0 * * *" },
    { "path": "/api/cron/ads-metrics", "schedule": "0 1 * * *" },
    { "path": "/api/cron/notion-sync", "schedule": "0 6 * * *" }
  ]
}
```

*(Adicionados aos crons da Fase 3)*

---

## 13. Ordem de Implementação

Seguindo prioridade do PRD:

| Ordem | Bloco | Estimativa de complexidade |
|-------|-------|---------------------------|
| 1 | A — Time & Permissões | Alta (RLS rewrite) |
| 2 | B — Contratos & Faturamento | Média |
| 3 | E — AI Memory | Média (pgvector setup) |
| 4 | D — Analytics Avançado | Média (crons + charts) |
| 5 | C — CMS Headless | Baixa-Média |
| 6 | F — White-label | Alta (middleware) |
| 7 | G — Notion Sync | Média |

---

## 14. Dependências da Fase 3

Antes de implementar a Fase 4, a Fase 3 deve ter entregue:

| Feature Fase 3 | Usado por |
|----------------|-----------|
| `integration_configs` table | Blocos D e G |
| Vercel Cron infrastructure | Blocos D e G |
| Resend e-mail configurado | Bloco A (convite) |
| `@react-pdf/renderer` instalado | Bloco B (invoice PDF) |
| Portal do Cliente (Fase 3) | Bloco D (métricas no portal) |
| RLS base para `collaborator` role | Bloco A (extensão) |

---

## 15. Checklist de Entrega da Fase 4

### Bloco A
- [ ] Tabelas `workspace_members`, `client_assignments`, `invite_tokens` criadas
- [ ] `POST /api/team/invite` envia e-mail funcional
- [ ] `/settings/team` renderiza membros e convites pendentes
- [ ] RLS atualizada para filtrar por `client_assignments`

### Bloco B
- [ ] Tabelas `contracts`, `invoices` criadas
- [ ] CRUD completo de contratos por cliente
- [ ] Invoice com status `paid/pending/overdue`
- [ ] Dashboard `/financial/advanced` com MRR, ARR, vencimentos

### Bloco C
- [ ] Tabela `posts` criada
- [ ] Editor Markdown funcional com preview
- [ ] Rota pública `GET /api/public/posts` sem auth
- [ ] Status `draft → review → published` funcional

### Bloco D
- [ ] Tabelas `ig_metrics`, `ads_metrics` criadas
- [ ] Crons de sync funcionais
- [ ] Gráficos `recharts` por cliente (Instagram + Ads)

### Bloco E
- [ ] pgvector extension habilitada no Supabase
- [ ] Tabela `client_memories` com índice ivfflat
- [ ] `POST /api/memory/upsert` gera e salva embeddings
- [ ] `GET /api/memory/search` retorna top-5 por similaridade
- [ ] Output aprovado → dispara upsert de memória
- [ ] Pipeline injeta contexto de memória no prompt

### Bloco F
- [ ] Tabela `workspaces` criada
- [ ] `profiles.workspace_id` adicionado
- [ ] `/settings/workspace` funcional (logo, cor, nome)
- [ ] Middleware de custom domain funcional

### Bloco G
- [ ] `jobs.notion_page_id` adicionado
- [ ] Cron de sync Notion funcional
- [ ] Webhook Notion recebe e aplica updates
