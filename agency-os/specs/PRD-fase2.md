# PRD — Agency OS | Fase 2
> SDD Research Output · Abril 2026

---

## 1. CONTEXTO DA FASE 2

### O que foi entregue na Fase 1

A Fase 1 estabeleceu o núcleo operacional da Agency OS:

- **Auth:** Supabase Auth email/password com RLS por role (`admin` / `collaborator`)
- **Clientes:** CRUD completo — cadastro, edição, lista com status, detalhe com jobs vinculados
- **Jobs:** Kanban de 4 colunas (backlog → em andamento → revisão → concluído), criar/editar/detalhe
- **Agentes IA (21):** Selector + chat direto com agente via Anthropic API (`claude-sonnet-4-5`) + outputs com status `pending / approved / rejected / revision`
- **Galeria:** Grid de outputs aprovados com filtro por cliente
- **Financeiro:** MRR total + tabela de contratos por cliente
- **Stack:** Next.js 14, TypeScript, Tailwind CSS + shadcn/ui, Supabase (Postgres + RLS + Auth), Anthropic API, Vercel

### O que motiva a Fase 2

A Fase 1 prova o conceito: cadastrar cliente → criar job → acionar agente → aprovar output. Mas o fluxo ainda é manual, linear e sem estrutura. Três lacunas críticas impedem a agência de operar com eficiência:

1. **Qualidade dos inputs:** Os agentes recebem mensagens livres — sem briefing estruturado, sem contexto padronizado. Resultado: outputs genéricos que exigem retrabalho.
2. **Processo de aprovação:** O status `pending / approved / rejected` não registra quem aprovou, em que etapa, com qual feedback. Não existe rastreabilidade.
3. **Visibilidade operacional:** Não há dados consolidados de produtividade por cliente, por agente, ou por período. Impossível medir ROI dos agentes ou SLA de entrega.

A Fase 2 resolve essas três lacunas e adiciona a automação de pipelines multi-agente — o diferencial competitivo central da agência.

---

## 2. OBJETIVOS DA FASE 2

| # | Objetivo | Métrica de sucesso |
|---|----------|--------------------|
| O1 | Elevar a qualidade dos outputs dos agentes com briefings estruturados | 100% dos jobs novos criados com briefing antes de acionar agente |
| O2 | Formalizar o pipeline de aprovação de outputs com rastreabilidade completa | Todo output tem histórico de estágios com timestamp e autor |
| O3 | Habilitar pipelines multi-agente automáticos para jobs recorrentes | Ao menos 1 pipeline configurado e rodando por job-type na agência |
| O4 | Fornecer analytics por cliente e dashboard de produtividade da agência | Dashboard com ≥5 métricas operacionais disponível sem SQL manual |
| O5 | Reduzir trabalho repetitivo com templates de jobs e notificações in-app | Templates usados em ≥50% dos jobs criados; notificações ativas para atrasos |

---

## 3. FUNCIONALIDADES — PRIORIDADE

---

### Bloco A: Briefing Estruturado por Job (Alta Prioridade)

**Descrição**

Formulário de briefing vinculado a cada job, com campos específicos por tipo de conteúdo (`post`, `reel`, `stories`, `email`, `video`, `blog`, `ad`). O briefing é injetado automaticamente no contexto de todos os agentes acionados naquele job — substituindo o bloco de contexto genérico atual.

Hoje o contexto enviado ao agente é:
```
CLIENTE: {client.name} | Nicho: {client.niche}
JOB: {job.title} — {job.description}
```
Com o briefing, torna-se:
```
CLIENTE: {client.name} | Nicho: {client.niche}
JOB: {job.title} — {job.description}
BRIEFING:
  Tipo de conteúdo: Post para Instagram
  Objetivo: Lançamento do produto X
  Público-alvo: Mulheres 25-35, classe B/C, SP
  Mensagem principal: "Produto X resolve problema Y em 5 minutos"
  Tom: Informal, motivacional, com CTA direto
  Referências: [links/uploads]
  Restrições: Não mencionar preço; evitar comparações com concorrentes
```

**Telas e rotas envolvidas**

| Rota | Ação |
|------|------|
| `GET /jobs/[id]` | Exibir resumo do briefing no detalhe do job (se existir) |
| `GET /jobs/[id]/briefing` | Página de formulário de briefing do job |
| `POST /jobs/[id]/briefing` | Server Action para criar/atualizar briefing |

**Componentes React**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `BriefingForm` | `components/briefing/BriefingForm.tsx` | Formulário controlado com react-hook-form + zod; campos mudam conforme `content_type` selecionado |
| `BriefingCard` | `components/briefing/BriefingCard.tsx` | Card resumo do briefing exibido no detalhe do job |
| `BriefingTypeSelector` | `components/briefing/BriefingTypeSelector.tsx` | Selector de tipo de conteúdo com ícones (botões grid) |
| `BriefingEmpty` | `components/briefing/BriefingEmpty.tsx` | Estado vazio com CTA para criar briefing no `/jobs/[id]` |

**Campos do briefing por tipo de conteúdo**

```typescript
// Campos comuns a todos os tipos
const COMMON_FIELDS = [
  'content_type',    // TEXT — enum
  'objective',       // TEXT — o que este conteúdo precisa alcançar
  'target_audience', // TEXT — quem vai consumir
  'key_message',     // TEXT — mensagem central (1 frase)
  'tone',            // TEXT — tom de voz (informal/formal/técnico/motivacional)
  'restrictions',    // TEXT — o que NÃO fazer
  'deadline_notes',  // TEXT — observações sobre prazo/urgência
]

// Campos extras por tipo
const TYPE_FIELDS = {
  post:     ['format', 'caption_length', 'hashtag_strategy'],
  reel:     ['duration_seconds', 'hook', 'script_style'],
  stories:  ['cta_link', 'poll_question', 'sticker_type'],
  email:    ['subject_line', 'preview_text', 'email_list'],
  video:    ['duration_seconds', 'format', 'script_tone'],
  blog:     ['seo_keyword', 'word_count', 'internal_links'],
  ad:       ['platform', 'objective', 'budget_context', 'cta'],
}
```

**Dados necessários no banco**

```sql
-- Ver Seção 4: tabela job_briefings
```

**Dependências**

- Fase 1 (jobs existem)
- `react-hook-form` + `zod` (já instalados)
- Supabase Storage (para upload de referências no briefing — campo `reference_urls TEXT[]`)

---

### Bloco B: Pipeline de Aprovação Formal (Alta Prioridade)

**Descrição**

Substitui o status binário `pending / approved / rejected` por um pipeline de aprovação rastreado com 6 estágios formais:

```
draft → internal_review → client_review → approved → published → rejected
```

Cada transição de estágio é registrada na tabela `output_approval_events` com: quem moveu, quando, e notas opcionais. O output mantém o estágio atual em `job_outputs.approval_stage`.

A interface exibe um `ApprovalTimeline` visual no detalhe de cada output, e ações contextuais mudam conforme o estágio atual.

**Estágios e transições permitidas**

```
draft           → internal_review   (botão "Enviar para revisão interna")
internal_review → client_review     (botão "Enviar para aprovação do cliente")
internal_review → draft             (botão "Voltar para rascunho")
client_review   → approved          (botão "Cliente aprovou")
client_review   → internal_review   (botão "Solicitar revisão")
approved        → published         (botão "Marcar como publicado")
*               → rejected          (botão "Rejeitar" — disponível em qualquer estágio)
```

**Telas e rotas envolvidas**

| Rota | Ação |
|------|------|
| `GET /jobs/[id]` | Cards de output agora exibem `approval_stage` com badge colorido |
| `GET /outputs/[id]` | Nova página de detalhe do output com timeline de aprovação |
| `POST /api/outputs/[id]/stage` | API Route para avançar/retroceder estágio |
| `GET /gallery` | Filtros por `approval_stage` (todos / aprovados / publicados / revisão) |

**Componentes React**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `ApprovalTimeline` | `components/approval/ApprovalTimeline.tsx` | Timeline visual dos eventos de aprovação do output |
| `ApprovalStageActions` | `components/approval/ApprovalStageActions.tsx` | Botões de ação contextual baseados no estágio atual |
| `ApprovalStageBadge` | `components/approval/ApprovalStageBadge.tsx` | Badge colorido para o estágio (substitui o atual `status` badge) |
| `StageTransitionModal` | `components/approval/StageTransitionModal.tsx` | Modal de confirmação com campo de notas opcional |

**Modificações em componentes existentes**

- `components/agents/OutputCard.tsx`: trocar badge de `status` por `ApprovalStageBadge`, adicionar `ApprovalStageActions`
- `components/gallery/GalleryGrid.tsx`: adicionar filtro por estágio, ordenar por `updated_at`

**Dados necessários no banco**

```sql
-- Ver Seção 4: coluna approval_stage em job_outputs + tabela output_approval_events
```

**Dependências**

- Fase 1 (job_outputs existem)
- Bloco A (briefing) — não obrigatório, mas recomendado sequencialmente

---

### Bloco C: Analytics por Cliente + Dashboard de Produtividade (Média Prioridade)

**Descrição**

Duas visões analíticas complementares:

1. **Analytics por cliente** (`/analytics/[clientId]`): histórico de outputs, aprovações, agentes mais usados, evolução do MRR, tempo médio de entrega por job.
2. **Dashboard de produtividade** (`/analytics`): visão geral da agência — outputs por período, taxa de aprovação global, jobs por status, agentes mais acionados, SLA médio.

Os dados são agregados via queries Supabase (sem camada de BI externa). Charts com `recharts`.

**Telas e rotas envolvidas**

| Rota | Ação |
|------|------|
| `GET /analytics` | Dashboard de produtividade da agência |
| `GET /analytics/[clientId]` | Analytics por cliente específico |
| `GET /api/analytics/agency` | API Route — dados agregados da agência |
| `GET /api/analytics/[clientId]` | API Route — dados agregados por cliente |

**Métricas do Dashboard de Agência (`/analytics`)**

```typescript
type AgencyMetrics = {
  total_outputs_30d: number        // outputs gerados nos últimos 30 dias
  approval_rate: number            // % de outputs aprovados vs total
  avg_job_duration_days: number    // tempo médio (criação → done) por job
  top_agents: AgentUsageStat[]     // 5 agentes mais acionados
  jobs_by_status: Record<JobStatus, number>  // distribuição atual
  outputs_by_day: { date: string; count: number }[]  // série temporal 30 dias
  mrr_current: number              // soma de contract_value dos clientes ativos
  mrr_30d_ago: number              // MRR de 30 dias atrás (snapshot)
}
```

**Métricas por Cliente (`/analytics/[clientId]`)**

```typescript
type ClientMetrics = {
  client: Pick<Client, 'id' | 'name' | 'logo_url' | 'niche' | 'contract_value'>
  total_jobs: number
  jobs_by_status: Record<JobStatus, number>
  total_outputs: number
  approved_outputs: number
  published_outputs: number
  approval_rate: number
  most_used_agents: AgentUsageStat[]
  outputs_timeline: { month: string; count: number; approved: number }[]
  avg_approval_days: number        // dias médios da criação até aprovação
  contract_history: { month: string; value: number }[]  // evolução do MRR
}
```

**Componentes React**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `AgencyMetricsCards` | `components/analytics/AgencyMetricsCards.tsx` | 4-6 KPI cards no topo do dashboard |
| `OutputsTimelineChart` | `components/analytics/OutputsTimelineChart.tsx` | LineChart de outputs por dia (recharts) |
| `AgentUsageChart` | `components/analytics/AgentUsageChart.tsx` | BarChart de uso por agente |
| `ClientMetricsHeader` | `components/analytics/ClientMetricsHeader.tsx` | Header com info do cliente + KPIs no `/analytics/[clientId]` |
| `ApprovalFunnelChart` | `components/analytics/ApprovalFunnelChart.tsx` | Funil de aprovação (draft → published) |
| `ContractEvolutionChart` | `components/analytics/ContractEvolutionChart.tsx` | LineChart de evolução do MRR por cliente |
| `JobsDistributionChart` | `components/analytics/JobsDistributionChart.tsx` | DonutChart de jobs por status |

**Dados necessários no banco**

- Nenhuma tabela nova — queries agregadas sobre tabelas existentes
- Índices recomendados (ver Seção 4)

**Dependências**

- Fase 1 (dados de jobs e outputs existem)
- Bloco B (para métricas de approval_stage) — retrocompatível se Bloco B não estiver completo

**Nova dependência npm**

```
recharts ^2.x
```

---

### Bloco D: Multi-agente Pipeline (Média Prioridade)

**Descrição**

Permite criar pipelines sequenciais de agentes que executam automaticamente em ordem para um job. Exemplo de pipeline "Campanha Completa":

```
Step 1: ORACLE  → analisa objetivo e produz estratégia macro
Step 2: VANCE   → recebe output do ORACLE, produz estratégia de conteúdo
Step 3: VERA    → recebe output do VANCE, produz copies
Step 4: ATLAS   → recebe output do VERA, produz prompt de design
```

Cada step usa o output do step anterior como contexto adicional (encadeamento automático). O usuário configura o pipeline uma vez e pode rodá-lo em qualquer job.

A execução é sequencial e síncrona via `POST /api/pipelines/run` com streaming de status por Server-Sent Events ou polling.

**Telas e rotas envolvidas**

| Rota | Ação |
|------|------|
| `GET /pipelines` | Lista de pipelines configurados |
| `GET /pipelines/new` | Formulário de criação de pipeline |
| `GET /pipelines/[id]` | Detalhe + histórico de execuções |
| `POST /api/pipelines/run` | Executa pipeline em um job |
| `GET /api/pipelines/[runId]/status` | Status da execução (polling) |

**Componentes React**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `PipelineBuilder` | `components/pipelines/PipelineBuilder.tsx` | Interface drag-and-drop de steps de agentes |
| `PipelineStepCard` | `components/pipelines/PipelineStepCard.tsx` | Card de um step com agente selecionado + instrução template |
| `PipelineCard` | `components/pipelines/PipelineCard.tsx` | Card de pipeline na listagem |
| `PipelineRunModal` | `components/pipelines/PipelineRunModal.tsx` | Modal para selecionar job e confirmar execução |
| `PipelineRunStatus` | `components/pipelines/PipelineRunStatus.tsx` | Progress visual da execução (step atual, completed, failed) |
| `PipelineRunHistory` | `components/pipelines/PipelineRunHistory.tsx` | Histórico de execuções com resultados |

**Dados necessários no banco**

```sql
-- Ver Seção 4: tabelas agent_pipelines + pipeline_runs
```

**Dependências**

- Fase 1 (agentes e jobs existem)
- Bloco A (briefing injetado no contexto do pipeline) — recomendado

---

### Bloco E: Notificações + Templates de Jobs + Storage de Arquivos (Baixa Prioridade)

**Descrição**

Três funcionalidades de suporte que melhoram a ergonomia operacional:

**E1 — Notificações in-app**
Sino de notificações no TopBar com alertas para: job atrasado (past `due_date` com status ≠ `done`), output pendente de aprovação há >48h, pipeline concluído, revisão solicitada.

**E2 — Templates de Jobs**
Jobs pré-configurados com agentes sugeridos, tipo de conteúdo e briefing pré-preenchido. Ao criar um job, o usuário pode "partir de um template". Exemplos: "Post Semanal Instagram", "Email Newsletter Mensal", "Campanha de Lançamento".

**E3 — Storage de Arquivos por Job**
Upload de arquivos de referência no job (imagens, PDFs, docs). Armazenado no Supabase Storage em `job-attachments/{job_id}/`. Listagem de attachments no detalhe do job com preview de imagens.

**Telas e rotas envolvidas**

| Rota | Ação |
|------|------|
| `GET /templates` | Lista de templates de jobs |
| `GET /templates/new` | Formulário de criação de template |
| `POST /api/jobs/[id]/attachments` | Upload de arquivo no job |
| `DELETE /api/jobs/[id]/attachments/[fileId]` | Remover attachment |
| `GET /api/notifications` | Listar notificações do usuário |
| `POST /api/notifications/read` | Marcar notificações como lidas |

**Componentes React**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `NotificationBell` | `components/notifications/NotificationBell.tsx` | Ícone sino com badge contador no TopBar |
| `NotificationPanel` | `components/notifications/NotificationPanel.tsx` | Dropdown/sheet com lista de notificações |
| `NotificationItem` | `components/notifications/NotificationItem.tsx` | Item individual de notificação com link e timestamp |
| `TemplateCard` | `components/templates/TemplateCard.tsx` | Card de template com agentes sugeridos |
| `TemplateForm` | `components/templates/TemplateForm.tsx` | Formulário de criação/edição de template |
| `TemplateSelector` | `components/templates/TemplateSelector.tsx` | Selector de template ao criar novo job |
| `FileUpload` | `components/storage/FileUpload.tsx` | Dropzone de upload com preview |
| `AttachmentList` | `components/storage/AttachmentList.tsx` | Lista de arquivos do job com download/delete |

**Dados necessários no banco**

```sql
-- Ver Seção 4: tabelas notifications + job_templates + job_attachments
```

**Dependências**

- Fase 1 completa
- Bloco A (job_templates usa briefing_template)
- Bloco D (job_templates pode referenciar pipeline_id)
- `react-dropzone` para FileUpload

---

## 4. MUDANÇAS NO BANCO DE DADOS

### 4.1 — Alterações em tabelas existentes

```sql
-- Bloco B: adicionar approval_stage em job_outputs
ALTER TABLE job_outputs
  ADD COLUMN approval_stage TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_stage IN ('draft', 'internal_review', 'client_review', 'approved', 'published', 'rejected')),
  ADD COLUMN output_version INTEGER NOT NULL DEFAULT 1;

-- Migração: outputs existentes com status 'approved' → approval_stage 'approved'
UPDATE job_outputs SET approval_stage = 'approved' WHERE status = 'approved';
UPDATE job_outputs SET approval_stage = 'rejected' WHERE status = 'rejected';

-- Bloco A: adicionar tipo de conteúdo nos jobs
ALTER TABLE jobs
  ADD COLUMN content_type TEXT CHECK (content_type IN ('post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other')),
  ADD COLUMN template_id UUID REFERENCES job_templates(id) ON DELETE SET NULL;
-- Nota: job_templates precisa ser criada antes (4.5)
```

### 4.2 — Tabela: `job_briefings` (Bloco A)

```sql
CREATE TABLE job_briefings (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id         UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  content_type   TEXT NOT NULL CHECK (content_type IN ('post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other')),
  objective      TEXT,
  target_audience TEXT,
  key_message    TEXT,
  tone           TEXT,
  restrictions   TEXT,
  deadline_notes TEXT,
  reference_urls TEXT[] DEFAULT '{}',
  custom_fields  JSONB DEFAULT '{}',  -- campos extras por content_type
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id)  -- 1 briefing por job
);

ALTER TABLE job_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage briefings" ON job_briefings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_job_briefings_updated_at
  BEFORE UPDATE ON job_briefings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.3 — Tabela: `output_approval_events` (Bloco B)

```sql
CREATE TABLE output_approval_events (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id      UUID REFERENCES job_outputs(id) ON DELETE CASCADE NOT NULL,
  from_stage     TEXT,  -- NULL se é o primeiro registro
  to_stage       TEXT NOT NULL CHECK (to_stage IN ('draft', 'internal_review', 'client_review', 'approved', 'published', 'rejected')),
  changed_by     UUID REFERENCES profiles(id) NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE output_approval_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view approval events" ON output_approval_events
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Índice para buscar histórico de um output
CREATE INDEX idx_approval_events_output_id ON output_approval_events(output_id, created_at DESC);
```

### 4.4 — Tabelas: `agent_pipelines` + `pipeline_runs` (Bloco D)

```sql
CREATE TABLE agent_pipelines (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL DEFAULT '[]',
  -- steps: [{ order: 1, agent_id: 'vance', instruction_template: 'Com base no job {job_title}, crie...' }]
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_runs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id   UUID REFERENCES agent_pipelines(id) ON DELETE SET NULL,
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  current_step  INTEGER NOT NULL DEFAULT 0,
  results       JSONB NOT NULL DEFAULT '[]',
  -- results: [{ step: 1, agent_id: 'vance', output_id: 'uuid', content_preview: '...', completed_at: '...' }]
  error_message TEXT,
  started_by    UUID REFERENCES profiles(id),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE agent_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage pipelines" ON agent_pipelines
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users manage pipeline runs" ON pipeline_runs
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_pipeline_runs_job_id ON pipeline_runs(job_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
```

### 4.5 — Tabela: `job_templates` (Bloco E)

```sql
CREATE TABLE job_templates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  content_type     TEXT CHECK (content_type IN ('post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other')),
  default_agents   TEXT[] DEFAULT '{}',    -- ex: ['vance', 'vera', 'atlas']
  briefing_template JSONB DEFAULT '{}',   -- campos pré-preenchidos do briefing
  pipeline_id      UUID REFERENCES agent_pipelines(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage templates" ON job_templates
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 4.6 — Tabela: `job_attachments` (Bloco E)

```sql
CREATE TABLE job_attachments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  file_url    TEXT NOT NULL,    -- URL pública do Supabase Storage
  storage_path TEXT NOT NULL,   -- caminho interno: job-attachments/{job_id}/{filename}
  file_type   TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'doc', 'video', 'other')),
  file_size   INTEGER,           -- bytes
  uploaded_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage attachments" ON job_attachments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_job_attachments_job_id ON job_attachments(job_id);
```

### 4.7 — Tabela: `notifications` (Bloco E)

```sql
CREATE TABLE notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN (
    'job_overdue',
    'approval_pending',
    'output_ready',
    'pipeline_complete',
    'revision_requested',
    'stage_changed'
  )),
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  link       TEXT,              -- rota para navegar ao clicar
  metadata   JSONB DEFAULT '{}', -- dados extras (job_id, output_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
```

### 4.8 — Índices de performance para Analytics (Bloco C)

```sql
-- Outputs por período e status
CREATE INDEX idx_job_outputs_created_at ON job_outputs(created_at DESC);
CREATE INDEX idx_job_outputs_approval_stage ON job_outputs(approval_stage, client_id);
CREATE INDEX idx_job_outputs_agent_id ON job_outputs(agent_id, created_at DESC);

-- Jobs por cliente e status
CREATE INDEX idx_jobs_client_status ON jobs(client_id, status);
CREATE INDEX idx_jobs_due_date ON jobs(due_date) WHERE status NOT IN ('done', 'cancelled');
```

### 4.9 — Função SQL auxiliar

```sql
-- Trigger para updated_at (se ainda não existir do Fase 1)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## 5. MUDANÇAS NA STACK

### Novas dependências npm

```json
{
  "recharts": "^2.12.0",
  "react-dropzone": "^14.2.0"
}
```

**`recharts`** — Charts para Bloco C (analytics). Escolhido por ser headless-friendly, sem opinião de CSS, e funcionar bem com Tailwind dark mode. Alternativa: `@tremor/react` (mais opinionado, mais pesado).

**`react-dropzone`** — Upload de arquivos no Bloco E (Storage). Gerencia drag-and-drop, validação de tipo/tamanho, preview. Alternativa nativa: `<input type="file">` (sem drag-and-drop).

### Sem mudanças na stack principal

Next.js 14, Supabase, Anthropic, Tailwind, shadcn/ui, Vercel permanecem inalterados.

### Supabase Storage — novo bucket

```
Bucket: job-attachments
Visibilidade: private (acesso via signed URL ou RLS)
Path pattern: job-attachments/{job_id}/{filename}
Max file size: 10MB
Tipos aceitos: image/*, application/pdf, application/msword, video/mp4
```

---

## 6. FORA DO ESCOPO DA FASE 2

```
❌ Portal do cliente (login externo para o cliente aprovar) → Fase 3
❌ Integração WhatsApp Business API → Fase 3
❌ Integração Instagram Graph API → Fase 3
❌ Integração Meta Ads API → Fase 3
❌ Sync com Google Sheets → Fase 3
❌ Integração Figma REST API → Fase 3
❌ Vercel Cron Jobs (scheduled notifications) → Fase 3
❌ Email transacional (notificações por email) → Fase 3
❌ Versioning de outputs (histórico de revisões do conteúdo) → Fase 3
❌ Colaboração em tempo real (múltiplos usuários simultâneos) → Fase 3
❌ Multi-tenant / SaaS (outros clientes usando a plataforma) → Futuro
❌ Mobile app nativo → Futuro
❌ Billing/faturamento integrado → Futuro
❌ CRM de leads → Fase 3
❌ Exportação de relatórios (PDF/Excel) → Fase 3
```

---

## 7. ENTREGÁVEL MÍNIMO DA FASE 2

> O fluxo mínimo que define a Fase 2 como concluída (MVP da Fase 2):

```
1. Abrir job existente
2. Criar briefing estruturado para o job (tipo: post; objetivo; público; mensagem; tom)
3. Acionar agente VERA com briefing injetado automaticamente no contexto
4. Output gerado aparece no estágio "draft"
5. Avançar output para "internal_review" com notas
6. Avançar para "approved" — timeline de aprovação registrada
7. Acessar /analytics/[clientId] e ver:
   - Total de outputs gerados
   - Taxa de aprovação
   - Agentes mais usados
8. Dashboard /analytics mostra MRR atual + outputs dos últimos 30 dias
```

Este fluxo valida os Blocos A, B e C — os três de maior impacto operacional imediato.

---

## 8. PRÓXIMOS PASSOS

**Etapa 2 SDD: gerar SPEC-fase2.md**

Abrir nova conversa com contexto limpo e enviar:

```
@specs/PRD-fase2.md
@specs/SPEC-fase1.md
@web/types/database.ts
@CLAUDE.md

Leia o PRD-fase2.md e gere uma SPEC-fase2.md detalhada.

Implemente na seguinte ordem:
  BLOCO 0 — Alterações no banco (migrations SQL)
  BLOCO 1 — Tipos TypeScript (atualizar database.ts)
  BLOCO 2 — Bloco A: Briefing (tabela + componentes + rota)
  BLOCO 3 — Bloco B: Aprovação (coluna + tabela + componentes + API route)
  BLOCO 4 — Bloco C: Analytics (queries + componentes + rotas)
  BLOCO 5 — Bloco D: Pipelines (tabelas + builder + API route)
  BLOCO 6 — Bloco E: Notificações + Templates + Storage

Para CADA arquivo especifique:
  - Caminho exato
  - Ação: criar ou modificar
  - O que implementar (seja específico)
  - Code snippets completos quando necessário

Inclua:
  - Ordem de implementação com dependências entre blocos
  - Checklist de validação por bloco
  - Checklist final de validação da Fase 2
```

---

*PRD gerado via SDD — Research Phase · Agency OS Fase 2 · Abril 2026*
