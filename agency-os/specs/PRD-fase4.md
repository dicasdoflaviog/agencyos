# PRD — Agency OS Fase 4
> Product Requirements Document · Abril 2026

---

## 1. Contexto e Motivação

### Estado atual após Fases 1–3

| Fase | Status | O que entregou |
|------|--------|----------------|
| 1 | ✅ Implementada | Dashboard interno, Clientes, Jobs, Agentes IA, Galeria, Analytics, Financeiro |
| 2 | ✅ Implementada | Briefings, Approval Workflow, Templates, Pipelines, Notificações Realtime |
| 3 | 📋 Spec pronta | Portal do Cliente, CRM, Integrações (Instagram/WhatsApp/Meta), Relatórios, Cron, Versioning |
| 4 | 🔲 Este documento | Time & Permissões, Contratos/Faturamento, CMS, Analytics Avançado, AI Memory, White-label |

### Por que Phase 4 agora?

Com a Fase 3 entregando o **portal externo** e as **integrações de canais**, a plataforma atinge maturidade operacional completa. A Fase 4 responde à próxima camada de necessidade:

1. **Escala de time** — A agência cresce e precisa de colaboradores com acesso granular
2. **Saúde financeira** — Contratos e invoices integrados ao sistema
3. **Entrega de conteúdo** — CMS headless para blog/posts dos clientes
4. **Inteligência de dados** — Dashboard de métricas Instagram + Meta Ads (já conectados na Fase 3)
5. **AI diferenciada** — Cada cliente tem uma memória vetorial — o LORE agent "conhece" o histórico
6. **Preparação SaaS** — White-label + multi-tenant para outras agências usarem o sistema

---

## 2. Perfis de Acesso — Revisão

O escopo original definiu 3 roles. Fase 4 implementa a granularidade:

| Role | Descrição | Fases anteriores |
|------|-----------|-----------------|
| `admin` | Acesso total | ✅ Implementado (único usuário) |
| `collaborator` | Acesso por cliente atribuído, sem financeiro/config | ❌ Não implementado |
| `client` | Portal do cliente | 📋 Na Fase 3 |
| `viewer` | Somente visualização | ❌ Novo na Fase 4 |

### Matriz de permissões

| Módulo | admin | collaborator | client | viewer |
|--------|-------|-------------|--------|--------|
| Clients (CRUD) | ✅ | Atribuídos (RO) | Próprio | Nenhum |
| Jobs (CRUD) | ✅ | Atribuídos | Próprio | Nenhum |
| Outputs | ✅ | Atribuídos | Próprio (aprovação) | Nenhum |
| Briefings | ✅ | Atribuídos | Nenhum | Nenhum |
| Pipelines/Templates | ✅ | RO | Nenhum | Nenhum |
| Financial/Contracts | ✅ | ❌ | ❌ | ❌ |
| CMS | ✅ | Atribuídos | ❌ | ❌ |
| Analytics | ✅ | Atribuídos | Próprio | Próprio |
| Settings/Integrations | ✅ | ❌ | ❌ | ❌ |

---

## 3. Blocos da Fase 4

### Bloco A — Time & Permissões
**Prioridade:** ⚡ Alta  
**Impacto:** Permite que a agência escale de 1 para N operadores

Features:
- Convidar colaboradores por e-mail (Resend)
- Atribuição de clientes por colaborador (`client_assignments`)
- Interface de gerenciamento de time (`/settings/team`)
- RLS reescrita com `collaborator_clients` junction table
- Notificações de job atribuído chegam ao colaborador responsável

### Bloco B — Contratos & Faturamento
**Prioridade:** ⚡ Alta  
**Impacto:** Fecha o loop financeiro que hoje é externo (Notion, planilha)

Features:
- Tabela `contracts` (valor, billing mensal/projeto, início, status)
- Tabela `invoices` (fatura gerada, vencimento, pago_em)
- Dashboard financeiro avançado: MRR, ARR, inadimplência, próximos vencimentos
- Geração de fatura em PDF via `@react-pdf/renderer` (já planejado na Fase 3)
- Status de pagamento com tracking manual (Fase 4) ou webhook Stripe (Fase 5)

### Bloco C — CMS Headless
**Prioridade:** Média  
**Impacto:** Elimina dependência de CMS externo para clientes com blog

Features:
- Tabela `posts` (title, slug, content markdown, status, published_at, client_id)
- Editor Markdown com preview (`/clients/[id]/cms`)
- API pública `GET /api/public/posts?client=slug` para headless delivery
- Status: `draft → review → published`
- Agente VERA pode gerar rascunho de post via pipeline

### Bloco D — Analytics Avançado
**Prioridade:** Média  
**Impacto:** Transforma dados das integrações da Fase 3 em inteligência visível

Features:
- Tabelas `ig_metrics` e `ads_metrics` populadas pelos crons da Fase 3
- Dashboard por cliente: followers, reach, impressions, engagement_rate (Instagram)
- Dashboard de tráfego pago: spend, CPL, ROAS por campanha (Meta Ads)
- Comparativo mensal: `vs. mês anterior`
- Report card PDF por cliente (via cron mensal da Fase 3)
- Widget de score de performance no card do cliente

### Bloco E — AI Memory (LORE Agent)
**Prioridade:** Média  
**Impacto:** Outputs de IA ficam progressivamente mais precisos por cliente

Features:
- `pgvector` extension no Supabase (já disponível no free tier)
- Tabela `client_memories` (client_id, content, embedding vector(1536), source, created_at)
- Ao criar/aprovar um output → embedding gerado via `text-embedding-3-small`
- Pipeline e chat injetam top-5 memories semanticamente similares no contexto
- Rota `POST /api/memory/upsert` chamada após cada output aprovado
- Rota `GET /api/memory/search?client_id=X&query=Y` para retrieval
- UI: `/clients/[id]/memory` — lista de memórias, busca, delete

### Bloco F — White-label & Multi-tenant
**Prioridade:** Baixa  
**Impacto:** Permite que outras agências usem o Agency OS

Features:
- Tabela `workspaces` (name, slug, logo, primary_color, domain)
- Profiles tem `workspace_id` — toda query filtra por workspace
- Login page com branding por workspace (detectado via hostname ou query param)
- Settings: `/settings/workspace` para personalizar logo, cores, nome
- Custom domain: CNAME apontado para `agencyos.vercel.app` + middleware de routing

### Bloco G — Notion Sync
**Prioridade:** Baixa  
**Impacto:** Sync bidirecional para agências que já usam Notion como kanban

Features:
- `integration_configs` para Notion (token + database_id) — já existe na Fase 3
- Cron `/api/cron/notion-sync` sincroniza jobs do Agency OS → Notion
- Webhook Notion → Agency OS via `/api/webhooks/notion`
- Campos sincronizados: title, status, client, due_date

---

## 4. Novas Tecnologias

| Pacote | Versão | Bloco | Uso |
|--------|--------|-------|-----|
| `openai` | ^4.x | E | Embeddings via `text-embedding-3-small` |
| `@supabase/vecs` | — | E | Helper para pgvector queries |
| `stripe` | ^14.x | B (parcial) | Webhook de pagamento (opcional) |
| `@notionhq/client` | ^2.x | G | Notion API |
| `react-markdown` | ^9.x | C | Preview do CMS |
| `@uiw/react-md-editor` | ^3.x | C | Editor Markdown com toolbar |
| `recharts` | ^2.x | D | Gráficos de métricas |

---

## 5. Schema Novo

### Bloco A
```sql
-- Colaboradores do workspace
CREATE TABLE workspace_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'collaborator'
                CHECK (role IN ('admin', 'collaborator', 'viewer')),
  invited_by  UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Atribuição de clientes por colaborador
CREATE TABLE client_assignments (
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, client_id)
);
```

### Bloco B
```sql
CREATE TABLE contracts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  value        NUMERIC(10,2) NOT NULL,
  billing      TEXT NOT NULL CHECK (billing IN ('monthly', 'project', 'retainer')),
  start_date   DATE NOT NULL,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'ended', 'draft')),
  notes        TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
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

### Bloco C
```sql
CREATE TABLE posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  content      TEXT,  -- Markdown
  status       TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'review', 'published')),
  published_at TIMESTAMPTZ,
  author_id    UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, slug)
);
```

### Bloco D
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
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  spend       NUMERIC(10,2),
  impressions INTEGER,
  clicks      INTEGER,
  cpl         NUMERIC(10,2),
  roas        NUMERIC(5,2),
  date        DATE NOT NULL,
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, date)
);
```

### Bloco E
```sql
-- Requer extensão pgvector (já disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE client_memories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  embedding  vector(1536),
  source     TEXT,  -- 'output_approved', 'briefing', 'manual'
  source_id  UUID,  -- ID do output/briefing de origem
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON client_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Bloco F
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

---

## 6. Dependências com Fase 3

A Fase 4 depende de:
- ✅ `profiles.role` com suporte a 'collaborator' (Fase 3 adiciona 'client')
- ✅ `integration_configs` para Instagram/Meta (Fase 3)
- ✅ Crons infrastructure (`vercel.json`, `CRON_SECRET`) (Fase 3)
- ✅ `@react-pdf/renderer` instalado (Fase 3, Bloco C)
- ✅ Resend configurado (Fase 3, Bloco F)

---

## 7. Out of Scope (Fase 5+)

| Feature | Motivo do adiamento |
|---------|---------------------|
| Stripe webhooks automáticos | Requer conta Stripe + validação fiscal |
| React Native / PWA completo | Escopo de produto separado |
| Fine-tuning de modelos por cliente | Requer dados históricos suficientes (min 1000 outputs) |
| Marketplace de agentes | Requer multi-tenant estável |
| TikTok / LinkedIn API | APIs com limitações severas de rate limit em 2026 |

---

## 8. MVP da Fase 4

Foco nos dois blocos de maior impacto imediato:

1. **Bloco A — Time & Permissões** (escala do time da agência)
2. **Bloco B — Contratos & Faturamento** (fecha o loop financeiro)

Os demais blocos são iterações seguintes na ordem:
→ Bloco E (AI Memory) → Bloco D (Analytics) → Bloco C (CMS) → Bloco F (White-label) → Bloco G (Notion)
