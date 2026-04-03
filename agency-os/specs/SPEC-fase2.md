# SPEC — Agency OS Fase 2

> **Versão:** 1.0  
> **Data:** 2025  
> **Status:** Implementado  
> **Repositório:** `agency-os/web/`  
> **Stack:** Next.js 14 (App Router) · Supabase · Anthropic Claude · TypeScript · Tailwind CSS

---

## 1. Visão Geral

A Fase 2 do Agency OS expande o dashboard interno da agência com cinco blocos funcionais que cobrem o ciclo completo de produção de conteúdo: desde a captura estruturada de briefings até a publicação rastreada, passando por aprovações formalizadas, análise de performance, pipelines multi-agente automatizados e notificações em tempo real.

### 1.1 Objetivos

| Bloco | Objetivo |
|-------|----------|
| **A — Briefing Estruturado** | Capturar informações de contexto do job antes da execução dos agentes, garantindo outputs mais precisos |
| **B — Aprovação Formal** | Rastrear o ciclo de vida de cada output (rascunho → revisão interna → revisão cliente → aprovado → publicado) com histórico imutável |
| **C — Analytics** | Oferecer visibilidade operacional e financeira (MRR, taxa de aprovação, top agentes, outputs por período) |
| **D — Pipelines Multi-Agente** | Permitir a criação de fluxos sequenciais de agentes IA executados automaticamente para um job |
| **E — Notificações + Templates** | Alertar usuários sobre eventos relevantes e acelerar a criação de jobs com modelos pré-configurados |

### 1.2 Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                  │
│                                                          │
│  app/(dashboard)/                                        │
│  ├── analytics/          → Bloco C                       │
│  ├── analytics/[clientId]/ → Bloco C (por cliente)       │
│  ├── jobs/[id]/briefing/ → Bloco A                       │
│  ├── pipelines/          → Bloco D                       │
│  └── templates/          → Bloco E                       │
│                                                          │
│  app/api/                                                │
│  ├── outputs/[id]/approve/ → Bloco B                     │
│  ├── pipelines/           → Bloco D (execução)           │
│  └── notifications/       → Bloco E                      │
│                                                          │
│  components/                                             │
│  ├── briefing/            → BriefingForm, BriefingCard   │
│  ├── approval/            → ApprovalFlow                 │
│  └── notifications/       → NotificationBell             │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                      Supabase                             │
│  PostgreSQL + RLS + Realtime                             │
│                                                          │
│  Novas tabelas Fase 2:                                   │
│  job_briefings · output_approval_events                  │
│  agent_pipelines · pipeline_runs                         │
│  job_templates · job_attachments · notifications         │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│               Anthropic Claude API                        │
│  Execução sequencial via /api/pipelines                  │
│  Modelo: claude-sonnet-4-6 · max_tokens: 4096            │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura e Decisões Técnicas

### 2.1 Padrão de Autenticação

Todas as páginas do dashboard e todas as rotas de API verificam a sessão do usuário via `supabase.auth.getUser()`. Em páginas Server Components, redirecionam para `/login` se não autenticado. Em rotas de API, retornam `401 Unauthorized`.

### 2.2 Row Level Security (RLS)

Todas as novas tabelas da Fase 2 têm RLS habilitado. As policies seguem dois padrões:

- **Dados do usuário** (notificações): `user_id = auth.uid()` — cada usuário vê apenas suas próprias notificações
- **Dados organizacionais** (briefings, aprovações, pipelines, templates): `auth.uid() IS NOT NULL` — qualquer usuário autenticado pode ler e modificar

> **Decisão de design:** A Fase 2 não implementa permissionamento granular por role (`admin`/`collaborator`). Isso fica pendente para Fase 3 se necessário.

### 2.3 Execução Síncrona de Pipelines

A API `POST /api/pipelines` executa todos os steps sequencialmente dentro de um único request HTTP, aguardando a resposta da Anthropic a cada step antes de iniciar o próximo. Isso:

- **Vantagem:** Simplicidade — sem filas, sem workers, sem estado externo
- **Desvantagem:** Pipelines com muitos steps podem exceder o timeout de edge functions (30s padrão no Vercel)
- **Mitigação futura:** Migrar para background jobs (Inngest, Trigger.dev, ou Supabase Edge Functions assíncronas)

### 2.4 Contexto Encadeado entre Agentes

O output de cada step é passado como `{previous_output}` no template de instrução do próximo step. O contexto base (cliente + job + briefing) é injetado em todos os steps, garantindo coerência ao longo do pipeline.

### 2.5 Server vs Client Components

| Componente | Tipo | Motivo |
|---|---|---|
| `BriefingForm` | Client | Usa estado local, submit dinâmico, `useRouter` |
| `BriefingCard` | Server | Exibe dados estáticos, sem interação |
| `ApprovalFlow` | Client | Chamadas fetch, estado de seleção, feedback Toast |
| `NotificationBell` | Client | Polling direto no Supabase, estado open/close |
| Todas as páginas do dashboard | Server | Data fetching no servidor, sem estado |

### 2.6 Trigger `updated_at`

Todas as tabelas com campo `updated_at` têm o trigger `set_{tabela}_updated_at` que chama `update_updated_at_column()` automaticamente antes de cada UPDATE. A função é idempotente (`CREATE OR REPLACE`).

---

## 3. Schema do Banco de Dados

> **Migration file:** `agency-os/supabase/migration_fase2.sql`

### 3.1 Alterações em Tabelas Existentes

#### `jobs` (alterações)

```sql
ALTER TABLE jobs
  ADD COLUMN content_type TEXT CHECK (content_type IN (
    'post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other'
  )),
  ADD COLUMN template_id UUID REFERENCES job_templates(id) ON DELETE SET NULL;
```

#### `job_outputs` (alterações)

```sql
ALTER TABLE job_outputs
  ADD COLUMN approval_stage TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_stage IN (
      'draft', 'internal_review', 'client_review', 'approved', 'published', 'rejected'
    )),
  ADD COLUMN output_version INTEGER NOT NULL DEFAULT 1;
```

> Outputs existentes com `status = 'approved'` foram migrados para `approval_stage = 'approved'`, e os com `status = 'rejected'` para `approval_stage = 'rejected'`.

---

### 3.2 `job_templates`

Criada **antes** de `jobs` e `agent_pipelines` na migration por ser referenciada por ambas.

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| `name` | TEXT | NOT NULL | Nome do template |
| `description` | TEXT | — | Descrição opcional |
| `content_type` | TEXT | CHECK (enum ContentType) | Tipo de conteúdo padrão |
| `default_agents` | TEXT[] | DEFAULT '{}' | IDs dos agentes pré-selecionados |
| `briefing_template` | JSONB | DEFAULT '{}' | Valores iniciais para o briefing |
| `pipeline_id` | UUID | FK → agent_pipelines(id) ON DELETE SET NULL | Pipeline associado (opcional) |
| `created_by` | UUID | FK → profiles(id) | Usuário que criou |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Atualizado via trigger |

**RLS:** `FOR ALL USING (auth.uid() IS NOT NULL)`  
**Trigger:** `set_job_templates_updated_at`

---

### 3.3 `job_briefings`

Um briefing por job (constraint UNIQUE em `job_id`).

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK | Identificador único |
| `job_id` | UUID | FK → jobs(id) ON DELETE CASCADE, NOT NULL, UNIQUE | Job ao qual pertence |
| `content_type` | TEXT | NOT NULL, CHECK (enum ContentType) | Tipo de conteúdo |
| `objective` | TEXT | — | Objetivo do conteúdo |
| `target_audience` | TEXT | — | Público-alvo descritivo |
| `key_message` | TEXT | — | Mensagem central em 1 frase |
| `tone` | TEXT | — | Tom de voz (livre ou de lista pré-definida) |
| `restrictions` | TEXT | — | O que não pode ser feito |
| `deadline_notes` | TEXT | — | Observações sobre prazo |
| `reference_urls` | TEXT[] | DEFAULT '{}' | URLs de referência |
| `custom_fields` | JSONB | DEFAULT '{}' | Campos adicionais flexíveis |
| `created_by` | UUID | FK → profiles(id) | Autor |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Atualizado via trigger |

**RLS:** `FOR ALL USING (auth.uid() IS NOT NULL)`  
**Trigger:** `set_job_briefings_updated_at`

---

### 3.4 `output_approval_events`

Log imutável de todas as transições de estágio. Nunca é atualizado — apenas inserido.

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK | Identificador único |
| `output_id` | UUID | FK → job_outputs(id) ON DELETE CASCADE, NOT NULL | Output relacionado |
| `from_stage` | TEXT | — (nullable) | Estágio anterior (`null` na criação) |
| `to_stage` | TEXT | NOT NULL, CHECK (enum ApprovalStage) | Estágio destino |
| `changed_by` | UUID | FK → profiles(id), NOT NULL | Usuário que efetuou a mudança |
| `notes` | TEXT | — | Comentário opcional |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp imutável |

**RLS:** `FOR ALL USING (auth.uid() IS NOT NULL)`  
**Índice:** `idx_approval_events_output_id ON (output_id, created_at DESC)`

---

### 3.5 `agent_pipelines`

Define a estrutura de um pipeline (os steps, não as execuções).

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK | Identificador único |
| `name` | TEXT | NOT NULL | Nome do pipeline |
| `description` | TEXT | — | Descrição opcional |
| `steps` | JSONB | NOT NULL, DEFAULT '[]' | Array de PipelineStep |
| `created_by` | UUID | FK → profiles(id) | Autor |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Atualizado via trigger |

**Estrutura JSONB `steps`:**
```json
[
  {
    "order": 1,
    "agent_id": "vera",
    "instruction_template": "Crie um copy para o post do cliente {client_name} sobre o job: {job_title}"
  },
  {
    "order": 2,
    "agent_id": "vance",
    "instruction_template": "Com base neste copy:\n{previous_output}\n\nElabore uma estratégia de distribuição."
  }
]
```

**Variáveis de template disponíveis:**
- `{job_title}` — título do job
- `{client_name}` — nome do cliente
- `{previous_output}` — output completo do step anterior

**RLS:** `FOR ALL USING (auth.uid() IS NOT NULL)`  
**Trigger:** `set_agent_pipelines_updated_at`

---

### 3.6 `pipeline_runs`

Registro de cada execução de um pipeline para um job específico.

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK | Identificador único |
| `pipeline_id` | UUID | FK → agent_pipelines(id) ON DELETE SET NULL | Pipeline executado (nullable se deletado) |
| `job_id` | UUID | FK → jobs(id) ON DELETE CASCADE, NOT NULL | Job contextualizado |
| `status` | TEXT | NOT NULL, DEFAULT 'running', CHECK (enum) | Estado da execução |
| `current_step` | INTEGER | NOT NULL, DEFAULT 0 | Índice do step em andamento |
| `results` | JSONB | NOT NULL, DEFAULT '[]' | Array de PipelineRunResult |
| `error_message` | TEXT | — | Mensagem de erro se status = 'failed' |
| `started_by` | UUID | FK → profiles(id) | Usuário que disparou |
| `started_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `completed_at` | TIMESTAMPTZ | — | Preenchido ao finalizar |

**Status possíveis:** `running` · `completed` · `failed` · `paused`

**Estrutura JSONB `results`:**
```json
[
  {
    "step": 1,
    "agent_id": "vera",
    "output_id": "uuid-do-job-output",
    "content_preview": "Primeiros 200 caracteres do output...",
    "completed_at": "2025-01-01T12:00:00.000Z"
  }
]
```

**RLS:** `FOR ALL USING (auth.uid() IS NOT NULL)`  
**Índices:**
- `idx_pipeline_runs_job_id ON (job_id)`
- `idx_pipeline_runs_status ON (status)`

---

### 3.7 `job_attachments`

Arquivos vinculados a um job, armazenados no Supabase Storage.

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK | Identificador único |
| `job_id` | UUID | FK → jobs(id) ON DELETE CASCADE, NOT NULL | Job relacionado |
| `client_id` | UUID | FK → clients(id) ON DELETE CASCADE, NOT NULL | Cliente (desnormalizado para queries) |
| `name` | TEXT | NOT NULL | Nome do arquivo |
| `file_url` | TEXT | NOT NULL | URL pública de acesso |
| `storage_path` | TEXT | NOT NULL | Caminho no bucket do Supabase Storage |
| `file_type` | TEXT | NOT NULL, CHECK (enum FileType) | Tipo de arquivo |
| `file_size` | INTEGER | — | Tamanho em bytes |
| `uploaded_by` | UUID | FK → profiles(id) | Quem fez o upload |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**Tipos de arquivo:** `image` · `pdf` · `doc` · `video` · `other`  
**RLS:** `FOR ALL USING (auth.uid() IS NOT NULL)`  
**Índice:** `idx_job_attachments_job_id ON (job_id)`

> **Nota:** O componente de upload de anexos não foi implementado na Fase 2. A tabela e o tipo TypeScript existem e estão prontos para uso futuro.

---

### 3.8 `notifications`

Notificações pessoais por usuário, com policy de isolamento por `user_id`.

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| `id` | UUID | PK | Identificador único |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE, NOT NULL | Destinatário |
| `type` | TEXT | NOT NULL, CHECK (enum NotificationType) | Categoria da notificação |
| `title` | TEXT | NOT NULL | Título curto (exibido no bell) |
| `body` | TEXT | — | Descrição adicional |
| `read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Status de leitura |
| `link` | TEXT | — | Rota interna de destino ao clicar |
| `metadata` | JSONB | DEFAULT '{}' | Dados extras (output_id, run_id, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**Tipos possíveis:**
| Tipo | Quando é criado |
|---|---|
| `job_overdue` | Job com `due_date` no passado e status diferente de `done`/`cancelled` |
| `approval_pending` | Output avançado para `client_review` |
| `output_ready` | Output gerado por agente (status `pending`) |
| `pipeline_complete` | Execução de pipeline finalizada com sucesso |
| `revision_requested` | Output rejeitado e retornado para rascunho |
| `stage_changed` | Qualquer mudança de `approval_stage` |

**RLS:** `FOR ALL USING (user_id = auth.uid())`  
**Índice:** `idx_notifications_user_unread ON (user_id, read, created_at DESC)`

---

### 3.9 Índices de Performance (Bloco C — Analytics)

```sql
CREATE INDEX idx_job_outputs_created_at    ON job_outputs(created_at DESC);
CREATE INDEX idx_job_outputs_approval_stage ON job_outputs(approval_stage, client_id);
CREATE INDEX idx_job_outputs_agent_id       ON job_outputs(agent_id, created_at DESC);
CREATE INDEX idx_jobs_client_status         ON jobs(client_id, status);
CREATE INDEX idx_jobs_due_date              ON jobs(due_date)
  WHERE status NOT IN ('done', 'cancelled');
```

---

## 4. Tipos TypeScript

> **Arquivo:** `agency-os/web/types/database.ts`

### 4.1 Tipos Primitivos (Enums)

```typescript
export type ContentType =
  | 'post' | 'reel' | 'stories' | 'email'
  | 'video' | 'blog' | 'ad' | 'other'

export type ApprovalStage =
  | 'draft' | 'internal_review' | 'client_review'
  | 'approved' | 'published' | 'rejected'

export type NotificationType =
  | 'job_overdue' | 'approval_pending' | 'output_ready'
  | 'pipeline_complete' | 'revision_requested' | 'stage_changed'

export type FileType = 'image' | 'pdf' | 'doc' | 'video' | 'other'
```

### 4.2 Tipos Atualizados da Fase 1

```typescript
export type Job = {
  // ... campos Fase 1 ...
  content_type: ContentType | null  // NOVO
  template_id: string | null        // NOVO
  briefing?: JobBriefing | null     // NOVO (relação opcional)
}

export type JobOutput = {
  // ... campos Fase 1 ...
  approval_stage: ApprovalStage  // NOVO
  output_version: number         // NOVO
}
```

### 4.3 Novos Tipos da Fase 2

```typescript
// Bloco A
export type JobBriefing = {
  id: string
  job_id: string
  content_type: ContentType
  objective: string | null
  target_audience: string | null
  key_message: string | null
  tone: string | null
  restrictions: string | null
  deadline_notes: string | null
  reference_urls: string[]
  custom_fields: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// Bloco B
export type OutputApprovalEvent = {
  id: string
  output_id: string
  from_stage: ApprovalStage | null
  to_stage: ApprovalStage
  changed_by: string
  notes: string | null
  created_at: string
  profile?: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

// Bloco D
export type PipelineStep = {
  order: number
  agent_id: string
  instruction_template: string
}

export type AgentPipeline = {
  id: string
  name: string
  description: string | null
  steps: PipelineStep[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PipelineRunResult = {
  step: number
  agent_id: string
  output_id: string
  content_preview: string
  completed_at: string
}

export type PipelineRun = {
  id: string
  pipeline_id: string | null
  job_id: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  current_step: number
  results: PipelineRunResult[]
  error_message: string | null
  started_by: string | null
  started_at: string
  completed_at: string | null
  pipeline?: Pick<AgentPipeline, 'id' | 'name'>
  job?: Pick<Job, 'id' | 'title'>
}

// Bloco E — Templates
export type JobTemplate = {
  id: string
  name: string
  description: string | null
  content_type: ContentType | null
  default_agents: string[]
  briefing_template: Partial<
    Omit<JobBriefing, 'id' | 'job_id' | 'created_by' | 'created_at' | 'updated_at'>
  >
  pipeline_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Bloco E — Attachments (pronto para uso futuro)
export type JobAttachment = {
  id: string
  job_id: string
  client_id: string
  name: string
  file_url: string
  storage_path: string
  file_type: FileType
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

// Bloco E — Notificações
export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  read: boolean
  link: string | null
  metadata: Record<string, unknown>
  created_at: string
}
```

---

## 5. Componentes

### 5.1 `BriefingForm`

**Arquivo:** `web/components/briefing/BriefingForm.tsx`  
**Tipo:** Client Component (`'use client'`)

#### Props

```typescript
type Props = {
  jobId: string         // UUID do job ao qual o briefing pertence
  existing?: JobBriefing | null  // Briefing existente para modo edição; null/undefined para criação
}
```

#### Estado local

| Campo | Tipo | Valor inicial |
|---|---|---|
| `form.content_type` | `ContentType` | `existing?.content_type \|\| 'post'` |
| `form.objective` | `string` | `existing?.objective \|\| ''` |
| `form.target_audience` | `string` | `existing?.target_audience \|\| ''` |
| `form.key_message` | `string` | `existing?.key_message \|\| ''` |
| `form.tone` | `string` | `existing?.tone \|\| ''` |
| `form.restrictions` | `string` | `existing?.restrictions \|\| ''` |
| `form.deadline_notes` | `string` | `existing?.deadline_notes \|\| ''` |
| `form.reference_urls` | `string` | URLs separadas por `\n` |
| `loading` | `boolean` | `false` |

#### Comportamento

1. **Seleção de tipo:** Grade 4×2 com botões para cada `ContentType` (com emoji), selecionado visualmente com borda e fundo violet.
2. **Campos de texto:** `objective`, `target_audience` e `restrictions` usam `Textarea`; `key_message` e `deadline_notes` usam `Input`.
3. **Tom de voz:** `Select` com 7 opções predefinidas de tom.
4. **URLs de referência:** `Textarea` com uma URL por linha; processado com `split('\n').map(trim).filter(Boolean)` no submit.
5. **Submit:**
   - Chama `supabase.auth.getUser()` para obter o `user.id`
   - Se `existing`: `supabase.from('job_briefings').update(payload).eq('id', existing.id)`
   - Se não: `supabase.from('job_briefings').insert(payload)`
   - Sucesso: `toast.success` + `router.push('/jobs/[jobId]')` + `router.refresh()`
   - Erro: `toast.error` com mensagem do Supabase
6. **Cancelar:** Redireciona para `/jobs/[jobId]` sem salvar.

#### Casos de borda

- Campos opcionais podem ser `null` — o payload envia `null` explicitamente para campos vazios
- `reference_urls` vazio resulta em array `[]` (não `null`)
- Submit desabilitado enquanto `loading = true` para evitar dupla submissão

---

### 5.2 `BriefingCard`

**Arquivo:** `web/components/briefing/BriefingCard.tsx`  
**Tipo:** Server Component (sem diretiva, sem hooks)

#### Props

```typescript
type Props = {
  briefing: JobBriefing
  jobId: string
}
```

#### Comportamento

- Exibe badge com `content_type` e badge com `tone` (se preenchido)
- Mostra apenas campos não-nulos: `objective`, `target_audience`, `key_message`, `restrictions`, `reference_urls`
- Botão "Editar" → `Link` para `/jobs/[jobId]/briefing`
- URLs de referência renderizadas como `<a target="_blank">` com truncamento por `truncate`

---

### 5.3 `ApprovalFlow`

**Arquivo:** `web/components/approval/ApprovalFlow.tsx`  
**Tipo:** Client Component (`'use client'`)

#### Props

```typescript
type Props = {
  outputId: string
  currentStage: ApprovalStage
  history: OutputApprovalEvent[]
  onStageChange?: (newStage: ApprovalStage) => void  // callback para atualizar o pai
}
```

#### Estado local

| Campo | Tipo | Descrição |
|---|---|---|
| `loading` | `boolean` | Requisição em andamento |
| `notes` | `string` | Comentário para a transição |
| `selectedStage` | `ApprovalStage \| null` | Estágio destino selecionado |

#### Mapa de transições

```typescript
const NEXT_STAGES = {
  draft:           ['internal_review', 'rejected'],
  internal_review: ['client_review', 'approved', 'rejected'],
  client_review:   ['approved', 'rejected'],
  approved:        ['published'],
  rejected:        ['draft'],
  published:       []  // estado final
}
```

#### Comportamento

1. Exibe badge com estágio atual (colorido por status)
2. Botões clicáveis para cada próximo estágio possível (toggle: clique novamente para desselecionar)
3. Ao selecionar um estágio: exibe `Textarea` para notas e botão de confirmação
4. **Confirmação:**
   - `POST /api/outputs/[outputId]/approve` com `{ to_stage, notes }`
   - Sucesso: `toast.success` + reset de `notes`/`selectedStage` + chama `onStageChange?.(selectedStage)`
   - Erro: `toast.error` com mensagem da API
5. **Timeline:** Exibe o `history` como lista cronológica com dot connector, mostrando `from_stage → to_stage`, notas e timestamp formatado em `pt-BR`
6. Se `history` vazio, a seção de timeline não é renderizada

#### Casos de borda

- `published` não tem próximos estágios → seção de ações não é renderizada
- `onStageChange` é opcional — o componente funciona sem ele
- A lista `history` é imutável na UI; para refletir o novo evento, o componente pai deve refazer o fetch

---

### 5.4 `NotificationBell`

**Arquivo:** `web/components/notifications/NotificationBell.tsx`  
**Tipo:** Client Component (`'use client'`)

#### Props

Nenhuma (self-contained, busca o usuário internamente via `supabase.auth.getUser()`).

#### Estado local

| Campo | Tipo | Descrição |
|---|---|---|
| `notifications` | `Notification[]` | Lista de notificações |
| `open` | `boolean` | Dropdown visível ou não |

#### Comportamento

1. **Montagem:** `useEffect` chama `fetchNotifications()` que busca as últimas 20 notificações do usuário, ordenadas por `created_at DESC`
2. **Badge:** Contador de não lidas (`unread > 0`). Se > 9, exibe "9+"
3. **Dropdown:** Painel de 320px com lista scroll (max-h: 80); clique fora fecha via overlay `fixed inset-0`
4. **Marcar como lida:** Clicar em uma notificação chama `supabase.from('notifications').update({ read: true }).eq('id', id)` e atualiza o estado local
5. **Marcar todas como lidas:** Botão no header do dropdown; atualiza no banco e no estado local
6. **Link:** Se `notification.link` existe, renderiza "Ver →" como `Link` (clique não propaga para evitar duplo-marcação)
7. **Tipos:** Exibidos em `pt-BR` via `TYPE_LABELS` map

#### Casos de borda

- Se usuário não autenticado, `fetchNotifications` retorna silenciosamente sem erro
- Sem Realtime: as notificações não atualizam automaticamente; requer reload ou reabertura do dropdown
- A API GET `/api/notifications` também existe para fetch server-side, mas o componente usa o client Supabase diretamente

---

## 6. Rotas de API

### 6.1 `POST /api/outputs/[id]/approve`

**Arquivo:** `web/app/api/outputs/[id]/approve/route.ts`

#### Autenticação
Requer sessão ativa. Retorna `401` se não autenticado.

#### Parâmetros de rota
| Param | Tipo | Descrição |
|---|---|---|
| `id` | UUID (string) | ID do `job_output` |

#### Body (JSON)
```typescript
{
  to_stage: ApprovalStage  // obrigatório
  notes?: string           // opcional
}
```

#### Lógica

```
1. Verificar auth
2. Validar to_stage (deve estar em VALID_STAGES)
3. Buscar output por id → 404 se não encontrado
4. UPDATE job_outputs SET approval_stage = to_stage WHERE id = outputId
5. INSERT output_approval_events { output_id, from_stage: output.approval_stage, to_stage, changed_by: user.id, notes }
6. Se to_stage IN ['approved', 'rejected']:
     INSERT notifications { user_id, type: 'stage_changed', title, body: notes, link: '/jobs', metadata }
7. Retornar { success: true, new_stage: to_stage }
```

#### Respostas

| Status | Body | Quando |
|---|---|---|
| `200` | `{ success: true, new_stage: ApprovalStage }` | Sucesso |
| `400` | `{ error: 'Invalid stage' }` | `to_stage` inválido ou ausente |
| `401` | `{ error: 'Unauthorized' }` | Sem sessão |
| `404` | `{ error: 'Output not found' }` | Output não existe |
| `500` | `{ error: string }` | Erro no Supabase (update ou insert) |

#### Casos de borda

- A rota **não valida se a transição é permitida** — o fluxo de permissão é responsabilidade do componente `ApprovalFlow` no frontend. Um cliente malicioso pode chamar a API diretamente com qualquer `to_stage`.
- A notificação só é criada para `approved` e `rejected` (o `revision_requested` no `titleMap` retorna `undefined` e o bloco `if (titleMap[to_stage])` não executa — isso é um bug latente se o tipo for adicionado futuramente).

---

### 6.2 `POST /api/pipelines`

**Arquivo:** `web/app/api/pipelines/route.ts`

#### Autenticação
Requer sessão ativa. Retorna `401` se não autenticado.

#### Body (JSON)
```typescript
{
  pipelineId: string  // UUID do agent_pipeline
  jobId: string       // UUID do job a ser contextualizado
}
```

#### Lógica

```
1. Verificar auth
2. Validar pipelineId e jobId (ambos obrigatórios)
3. Buscar pipeline por id → 404 se não encontrado
4. Buscar job (com client join) e briefing em paralelo
5. Criar pipeline_run { status: 'running', current_step: 0, results: [] }
6. Montar baseContext (cliente + job + briefing)
7. Para cada step (sequencial):
   a. Resolver agentId = step.agent_id
   b. Interpolar instruction_template com {job_title}, {client_name}, {previous_output}
   c. Chamar Anthropic Messages API com getSystemPrompt(agentId)
   d. Salvar job_output com approval_stage = 'draft'
   e. Atualizar pipeline_run.current_step e pipeline_run.results
   f. Se erro: UPDATE pipeline_runs SET status='failed', error_message → retornar 500
8. UPDATE pipeline_runs SET status='completed', completed_at
9. INSERT notifications { type: 'pipeline_complete', ... }
10. Retornar { success: true, run_id, results }
```

#### Respostas

| Status | Body | Quando |
|---|---|---|
| `200` | `{ success: true, run_id: string, results: PipelineRunResult[] }` | Pipeline executado com sucesso |
| `400` | `{ error: 'Missing pipelineId or jobId' }` | Parâmetros ausentes |
| `401` | `{ error: 'Unauthorized' }` | Sem sessão |
| `404` | `{ error: 'Pipeline not found' \| 'Job not found' }` | Recurso não existe |
| `500` | `{ error: 'Pipeline failed at step N', run_id: string }` | Erro da Anthropic ou Supabase durante execução |

#### Configuração Anthropic
- **Modelo:** `claude-sonnet-4-6`
- **max_tokens:** `4096`
- **System prompt:** Carregado via `getSystemPrompt(agentId)` (arquivo `.txt` do diretório `agentes/`)

#### Casos de borda

- **Agente inválido:** Se `step.agent_id` não existir em `AGENTS`, o step é **silenciosamente pulado** (`if (!agent) continue`)
- **Client como array:** A relação `jobs.client` pode retornar array ou objeto dependendo da query Supabase; o código normaliza com `Array.isArray(job.client) ? job.client[0] : job.client`
- **Pipeline sem steps:** O loop não executa; o run é criado e imediatamente finalizado com `completed`
- **Timeout:** Não há tratamento explícito de timeout da Anthropic; se um step demorar muito, a rota pode ser interrompida pelo runtime

---

### 6.3 `GET /api/notifications`

**Arquivo:** `web/app/api/notifications/route.ts`

#### Autenticação
Requer sessão ativa. Retorna `401` se não autenticado.

#### Comportamento
Retorna as últimas 30 notificações do usuário autenticado, ordenadas por `created_at DESC`, filtradas por `user_id = user.id`.

#### Resposta
```typescript
// 200
Notification[]

// 401
{ error: 'Unauthorized' }

// 500
{ error: string }
```

---

### 6.4 `POST /api/notifications`

**Arquivo:** `web/app/api/notifications/route.ts`

#### Autenticação
Requer sessão ativa. Retorna `401` se não autenticado.

#### Body (JSON)
```typescript
{
  ids?: string[]  // Se fornecido, marca apenas essas notificações como lidas
                  // Se omitido, marca TODAS as não lidas como lidas
}
```

#### Comportamento

- Se `ids?.length`: `UPDATE notifications SET read=true WHERE user_id=user.id AND id IN (ids)`
- Se não: `UPDATE notifications SET read=true WHERE user_id=user.id AND read=false`

#### Resposta
```typescript
// 200
{ success: true }

// 401
{ error: 'Unauthorized' }

// 500
{ error: string }
```

---

## 7. Páginas

### 7.1 `/jobs/[id]/briefing`

**Arquivo:** `web/app/(dashboard)/jobs/[id]/briefing/page.tsx`  
**Tipo:** Server Component (async)

#### Data fetching
```typescript
// Paralelo implícito via await sequencial (pode ser otimizado com Promise.all)
const job = await supabase.from('jobs').select('id, title, client_id').eq('id', id).single()
const briefing = await supabase.from('job_briefings').select('*').eq('job_id', id).maybeSingle()
```

#### Guards
- Não autenticado → `redirect('/login')`
- Job não encontrado → `redirect('/jobs')`

#### Renderização
- Header com link "← Voltar para o job", título dinâmico ("Criar briefing" ou "Editar briefing"), e subtítulo com `job.title`
- Renderiza `<BriefingForm jobId={id} existing={briefing} />`

---

### 7.2 `/analytics`

**Arquivo:** `web/app/(dashboard)/analytics/page.tsx`  
**Tipo:** Server Component (async)

#### Data fetching
4 queries em paralelo via `Promise.all`:
1. `clients` — clientes ativos (id, name, logo_url, status)
2. `jobs` — todos os jobs (id, status, client_id, created_at)
3. `outputs` — todos os outputs (id, approval_stage, agent_id, agent_name, client_id, created_at)
4. `contracts` — clientes com contrato ativo (contract_value)

#### Métricas calculadas no servidor
| Métrica | Cálculo |
|---|---|
| MRR | Soma de `contract_value` de clientes com `contract_status = 'active'` |
| Outputs (30d) | Outputs com `created_at >= now - 30 dias` |
| Taxa de aprovação | `(approved + published) / total * 100` |
| Jobs por status | Count por `backlog`, `in_progress`, `review`, `done` |
| Outputs por estágio | Count por cada `ApprovalStage` |
| Top 5 agentes | Agrupado por `agent_id`, ordenado por count descrescente |

#### Componentes renderizados
- `MetricCard` (inline) × 4 — MRR, clientes ativos, outputs 30d, taxa aprovação
- Gráfico de barras (CSS puro) — jobs por status
- Gráfico de barras (CSS puro) — top agentes
- Lista de distribuição — outputs por estágio
- Lista de clientes ativos → links para `/analytics/[clientId]`

---

### 7.3 `/analytics/[clientId]`

**Arquivo:** `web/app/(dashboard)/analytics/[clientId]/page.tsx`  
**Tipo:** Server Component (async)

#### Data fetching
```typescript
const client = await supabase.from('clients')
  .select('id, name, niche, contract_value, contract_status, status')
  .eq('id', clientId).single()

// Paralelo
const [jobs, outputs] = await Promise.all([
  supabase.from('jobs').select('id, title, status, created_at, due_date').eq('client_id', clientId),
  supabase.from('job_outputs').select('id, agent_name, approval_stage, created_at')
    .eq('client_id', clientId).order('created_at', { ascending: false }),
])
```

#### Guards
- Não autenticado → `redirect('/login')`
- Cliente não encontrado → `notFound()` (renderiza 404)

#### Métricas calculadas
- Total de outputs, aprovados, taxa de aprovação
- Jobs ativos (status não `done`/`cancelled`) e concluídos
- Top 5 agentes por count para este cliente
- Outputs por mês (últimos 6 meses) para gráfico de barras

#### Componentes renderizados
- Header com nome, nicho e valor do contrato
- `MetricCard` (inline) × 4
- Gráfico de barras mensal (CSS puro) — outputs últimos 6 meses
- Gráfico de barras — agentes usados para este cliente
- Lista de até 10 jobs com `StatusBadge` (inline), linkados para `/jobs/[id]`

---

### 7.4 `/pipelines`

**Arquivo:** `web/app/(dashboard)/pipelines/page.tsx`  
**Tipo:** Server Component (async)

#### Data fetching
```typescript
const pipelines = await supabase.from('agent_pipelines').select('*').order('created_at', { ascending: false })
const runs = await supabase.from('pipeline_runs')
  .select('id, pipeline_id, status, started_at, completed_at')
  .order('started_at', { ascending: false }).limit(20)
```

#### Renderização
- Estado vazio: card com borda dashed, CTA "Criar primeiro pipeline" → `/pipelines/new`
- Por pipeline:
  - Nome, descrição, count de steps, count de execuções
  - Badge do status da última execução (com `animate-pulse` se `running`)
  - Preview visual dos steps: `AGENTE1 → AGENTE2 → AGENTE3`
  - Botão "Gerenciar" → `/pipelines/[id]`

> **Páginas pendentes:** `/pipelines/new` e `/pipelines/[id]` não foram implementadas na Fase 2.

---

### 7.5 `/templates`

**Arquivo:** `web/app/(dashboard)/templates/page.tsx`  
**Tipo:** Server Component (async)

#### Data fetching
```typescript
const templates = await supabase.from('job_templates').select('*').order('created_at', { ascending: false })
```

#### Renderização
- Estado vazio: card com borda dashed, CTA "Criar primeiro template"
- Por template:
  - Nome, descrição, badge de `content_type`
  - Badges dos agentes em `default_agents` (ID em uppercase)
  - Botão "Usar template" → `/jobs/new?template=[id]`
  - Botão "Editar" → `/templates/[id]/edit`

> **Páginas pendentes:** `/templates/new`, `/templates/[id]/edit`, e o suporte ao parâmetro `?template=` em `/jobs/new` não foram implementados na Fase 2.

---

## 8. Fluxos de Usuário

### 8.1 Fluxo de Briefing

```
[Usuário entra em /jobs/[id]]
         │
         ▼
[Job não tem briefing?]
    │           │
   Sim          Não
    │           │
    ▼           ▼
[Botão          [BriefingCard exibe
"Criar          dados com botão
briefing"]      "Editar"]
    │                │
    └────────────────┘
              │
              ▼
      [/jobs/[id]/briefing]
              │
              ▼
      [BriefingForm preenche:
       - Tipo de conteúdo
       - Objetivo
       - Público-alvo
       - Mensagem principal
       - Tom de voz
       - Restrições
       - Prazo
       - URLs de referência]
              │
              ▼
    [Supabase upsert briefing]
              │
         ─────────────
        │             │
      Sucesso       Erro
        │             │
        ▼             ▼
[toast.success    [toast.error]
 redirect /jobs/[id]]
```

---

### 8.2 Fluxo de Aprovação

```
[Output gerado pelo agente]
         │
         ▼ approval_stage = 'draft'
         │
[Usuário abre o job e vê ApprovalFlow]
         │
         ▼
[Seleciona próximo estágio]
   draft → internal_review
         │
         ▼
[POST /api/outputs/[id]/approve
 { to_stage: 'internal_review' }]
         │
         ▼
[UPDATE job_outputs.approval_stage]
[INSERT output_approval_events]
         │
         ▼
[internal_review → client_review]
         │
         ▼
[client_review → approved / rejected]
    │                  │
    ▼                  ▼
[INSERT notification  [INSERT notification
 type: stage_changed   type: stage_changed
 title: "Output        title: "Output
 aprovado"]            rejeitado"]
    │
    ▼
[approved → published]
         │
         ▼
    [Estado final]
```

**Regra de negócio:** Um output rejeitado pode retornar para `draft`, reiniciando o ciclo. Não há limite de ciclos.

---

### 8.3 Fluxo de Pipeline Multi-Agente

```
[Usuário em /pipelines]
         │
         ▼
[Seleciona pipeline e job]
(UI ainda a implementar em /pipelines/new e /pipelines/[id])
         │
         ▼
[POST /api/pipelines { pipelineId, jobId }]
         │
         ▼
[Cria pipeline_run { status: 'running' }]
         │
         ▼
[Para cada step (sequencial):]
   ┌──────────────────────────────┐
   │ 1. Interpolar template       │
   │ 2. Chamar Anthropic API      │
   │ 3. Salvar job_output (draft) │
   │ 4. Atualizar run.results     │
   └──────────────────────────────┘
              │
        ──────────────
       │              │
    Sucesso         Falha
       │              │
       ▼              ▼
[Próximo step]  [UPDATE run status='failed'
                 error_message = err
                 Retornar 500]
       │
       ▼ (após todos os steps)
[UPDATE run status='completed'
 completed_at = now()]
       │
       ▼
[INSERT notification
 type: 'pipeline_complete']
       │
       ▼
[Retornar { success, run_id, results }]
```

**Encadeamento de contexto:** O campo `previous_output` no template de cada step recebe o conteúdo completo (`content`) do step anterior. O primeiro step recebe `previous_output = ''` (string vazia).

---

### 8.4 Fluxo de Notificações

```
[Evento ocorre no sistema]
(ex: pipeline concluído, output aprovado)
         │
         ▼
[INSERT notifications diretamente
 na rota de API correspondente]
         │
         ▼
[NotificationBell no TopBar]
   - Badge com contagem de não lidas
         │
         ▼
[Usuário clica no bell]
         │
         ▼
[Dropdown abre, lista notificações]
         │
    ─────────────────────
   │          │          │
   ▼          ▼          ▼
[Clica    [Clica     [Clica
 notif]    "Marcar    "Ver →"]
   │       todas"]       │
   ▼          │          ▼
[mark     [mark       [Navega
 read      all read]   para link]
 id]
```

**Geração de notificações (Fase 2):**

| Evento | Rota | Tipo |
|---|---|---|
| Output aprovado | `POST /api/outputs/[id]/approve` | `stage_changed` |
| Output rejeitado | `POST /api/outputs/[id]/approve` | `stage_changed` |
| Pipeline concluído | `POST /api/pipelines` | `pipeline_complete` |

---

## 9. Pendências e Próximos Passos

### 9.1 Páginas Não Implementadas

| Rota | Bloco | Prioridade |
|---|---|---|
| `/pipelines/new` | D | Alta — sem ela, pipelines não podem ser criados pela UI |
| `/pipelines/[id]` | D | Alta — gerenciamento, edição e disparo de pipelines |
| `/templates/new` | E | Média |
| `/templates/[id]/edit` | E | Média |
| `/jobs/new?template=[id]` | E | Média — suporte ao parâmetro de template |

### 9.2 Funcionalidades Incompletas

#### Bloco B — Aprovação
- **Validação de transições no servidor:** A API `POST /api/outputs/[id]/approve` não valida se a transição `from_stage → to_stage` é permitida pelo fluxo definido em `NEXT_STAGES`. Um chamador direto da API pode avançar para qualquer estágio. Solução: replicar a lógica de `NEXT_STAGES` na API.
- **Notificação de `revision_requested`:** O tipo existe no schema mas nunca é criado automaticamente. O `titleMap` na rota não contempla esse tipo.
- **Permissão por role:** Não há distinção entre quem pode aprovar internamente vs. quem representa o cliente.

#### Bloco C — Analytics
- **Sem período configurável:** Métricas calculadas para "todo o histórico" ou "últimos 30 dias" hardcoded. Não há filtro por intervalo de datas.
- **Sem exportação:** Não há funcionalidade de exportar métricas (CSV, PDF).
- **Sem charts de biblioteca:** Todos os gráficos usam CSS puro (barras de div). Recharts ou Chart.js pode oferecer visualizações mais ricas.

#### Bloco D — Pipelines
- **Timeout de execução:** Pipelines com muitos steps ou steps lentos podem ultrapassar o limite de timeout do Vercel Edge (30s). Solução: migrar para background jobs (Inngest, Trigger.dev).
- **Execução assíncrona:** Não há como acompanhar o progresso de um pipeline em execução em tempo real. O usuário deve aguardar a resposta HTTP.
- **PipelineBuilder:** O componente de criação visual de pipelines (drag-and-drop ou form simples) não foi implementado.

#### Bloco E — Notificações
- **Sem Realtime:** `NotificationBell` não usa Supabase Realtime/channels. O usuário só vê novas notificações ao abrir o dropdown ou recarregar a página. Solução: `supabase.channel('notifications').on('postgres_changes', ...)`.
- **Sem push notifications:** Não há Web Push para notificar o usuário quando o browser está em background.

#### Bloco E — Templates
- **`briefing_template` não é aplicado:** A página `/jobs/new?template=[id]` não existe. O campo `briefing_template` do template não é usado para pré-preencher o `BriefingForm`.
- **`default_agents` não é aplicado:** Idem — o template não afeta a seleção de agentes no job.

#### Bloco E — Attachments
- **Upload não implementado:** A tabela `job_attachments` existe e o tipo TypeScript está definido, mas não há componente de upload nem rota de API. O Supabase Storage bucket também não foi configurado na migration.

### 9.3 Dívida Técnica

| Item | Impacto | Solução Sugerida |
|---|---|---|
| Validação de transições na API de aprovação | Segurança / Consistência | Replicar `NEXT_STAGES` no servidor |
| Pipelines síncronos | Performance / Confiabilidade | Migrar para Inngest ou Supabase Edge Functions assíncronas |
| Analytics sem filtros temporais | UX | Adicionar `DateRangePicker` e passar params como searchParams |
| NotificationBell sem Realtime | UX | Supabase Realtime channels |
| Páginas de criação/edição de pipelines e templates | Funcionalidade core | Implementar como próxima sprint |

### 9.4 Sugestões para Fase 3

1. **Realtime:** Integrar Supabase Realtime em `NotificationBell` e na visualização de `pipeline_runs` (progress bar ao vivo)
2. **Pipeline Builder UI:** Editor visual com drag-and-drop de agentes e campos de instrução por step
3. **Aprovação por cliente:** Portal simplificado (sem sidebar) para clientes aprovarem outputs via link compartilhável
4. **Webhooks:** Integração com Slack/WhatsApp para notificações externas ao aprovar/rejeitar outputs
5. **Métricas avançadas:** Taxa de revisão por agente, tempo médio de aprovação, histórico de MRR
6. **Upload de attachments:** Interface de upload com drag-and-drop integrada ao `job_attachments`
7. **Templates com briefing pré-preenchido:** Aplicar `briefing_template` ao criar um job a partir de um template
8. **Versionamento de outputs:** Usar `output_version` para manter histórico de revisões do mesmo output

---

*Este documento é a fonte de verdade para a Fase 2 do Agency OS. Qualquer alteração no schema, nas APIs ou nos componentes deve ser refletida aqui antes da implementação.*
