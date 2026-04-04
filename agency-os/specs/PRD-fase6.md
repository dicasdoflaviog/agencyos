# PRD — Agency OS Fase 6
> Product Requirements Document · Plataforma SaaS

---

## 1. Contexto

A Fase 6 transforma o Agency OS de um produto single-tenant para uma **plataforma SaaS B2B** completa — outras agências compram e usam o sistema com sua própria marca (white-label), agentes customizados e dados isolados.

---

## 2. Blocos

### Bloco A — API Pública
**Prioridade:** ⚡ Alta

Exposição de endpoints REST para integrações de terceiros:

- `GET /api/v1/clients` — lista clientes da workspace
- `GET /api/v1/jobs` — lista jobs com filtros
- `POST /api/v1/jobs` — criar job via API
- `POST /api/v1/agents/run` — acionar agente e receber output
- Autenticação: API Key por workspace (tabela `api_keys`)
- Rate limiting: 100 req/min por key (Redis ou Vercel KV)
- Documentação OpenAPI gerada automaticamente (`/api/v1/docs`)

---

### Bloco B — Marketplace de Agentes
**Prioridade:** Alta

Sistema de compra/venda de system prompts customizados:

- Tabela `marketplace_agents` (name, description, system_prompt, price, author_workspace_id, rating)
- Agências vendem seus system prompts (após revisão)
- Compra via Stripe (pagamento único ou assinatura)
- Instalação: copia prompt para `agentes/[name]/system-prompt.txt` da workspace compradora
- Review/moderação: admin Agency OS aprova antes de publicar

---

### Bloco C — Fine-tuning por Cliente
**Prioridade:** Média

Modelos especializados treinados com histórico aprovado de cada cliente:

- Exporta `output_versions` aprovadas como dataset JSONL
- Envia para OpenAI Fine-tuning API (`POST /v1/fine_tuning/jobs`)
- Tabela `fine_tune_jobs` (client_id, model_id, status, dataset_size)
- Após treinado: pipeline usa `model: client.fine_tune_model_id` se disponível
- Threshold mínimo: 100 outputs aprovados para disparar fine-tuning

---

### Bloco D — Super Admin Panel
**Prioridade:** Média

Painel para gerenciar todas as workspaces (SaaS operator view):

- Rota `/admin` protegida por `role = 'super_admin'`
- Dashboard: total workspaces, MRR, churn, outputs gerados hoje
- Gerenciar workspace: suspender, ver plano, ver usage
- Impersonation: entrar em qualquer workspace como admin
- Logs de uso por workspace (requests de agente, storage)

---

### Bloco E — Onboarding Automatizado
**Prioridade:** Média

Fluxo de setup guiado para novas agências:

- Wizard em `/onboarding` (5 passos): workspace name → logo → primeiro cliente → primeiro job → convidar time
- Progress salvo em `onboarding_progress` (workspace_id, step, completed_at)
- E-mail de boas-vindas via Resend com guia de primeiros passos
- Checklist de onboarding visível no overview até completion 100%

---

### Bloco F — Usage Analytics (Operator)
**Prioridade:** Baixa

Métricas de uso por workspace para o operator do SaaS:

- Tabela `usage_events` (workspace_id, event_type, metadata, created_at)
- Events: `agent_run`, `output_approved`, `client_created`, `pipeline_run`
- Dashboard `/admin/analytics`: eventos por workspace, top agentes usados, funnel
- Retenção: workspaces ativas nos últimos 30/60/90 dias

---

## 3. Schema Novo

```sql
-- Bloco A
CREATE TABLE api_keys (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,  -- SHA-256 da key real (nunca armazenar plaintext)
  last_used_at TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Bloco B
CREATE TABLE marketplace_agents (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  system_prompt       TEXT NOT NULL,
  price_cents         INTEGER DEFAULT 0,  -- 0 = grátis
  category            TEXT,
  status              TEXT CHECK (status IN ('draft','review','published','rejected')) DEFAULT 'draft',
  rating_avg          NUMERIC(3,2),
  install_count       INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketplace_installs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id       UUID REFERENCES marketplace_agents(id),
  workspace_id   UUID REFERENCES workspaces(id),
  installed_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agent_id, workspace_id)
);

-- Bloco C
CREATE TABLE fine_tune_jobs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  openai_job_id  TEXT,
  model_id       TEXT,  -- preenchido após treinamento
  status         TEXT CHECK (status IN ('queued','running','succeeded','failed')),
  dataset_size   INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Bloco E
CREATE TABLE onboarding_progress (
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE PRIMARY KEY,
  steps_done    TEXT[] DEFAULT '{}',
  completed_at  TIMESTAMPTZ
);

-- Bloco F
CREATE TABLE usage_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON usage_events (workspace_id, created_at DESC);
CREATE INDEX ON usage_events (event_type, created_at DESC);
```

---

## 4. Dependências de Fases Anteriores

| Requisito | Fase |
|-----------|------|
| `workspaces` + multi-tenant | Fase 4 |
| Stripe billing base | Fase 5 |
| `output_versions` | Fase 3 |
| `integration_configs` | Fase 3 |

---

## 5. Stack Adicional

| Pacote | Uso |
|--------|-----|
| `ioredis` ou Vercel KV | Rate limiting API pública |
| `openai` (já instalado na Fase 4) | Fine-tuning API |
| `swagger-ui-react` | Documentação OpenAPI |
| `jsonwebtoken` | Assinatura de API keys |
