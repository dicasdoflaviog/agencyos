# SPEC — Agency OS Fase 3
> Software Design Document · Gerado em Abril 2026

---

## 1. Visão Geral

### 1.1 Objetivo

A Fase 3 conecta a Agency OS com o mundo externo: clientes recebem um portal dedicado, o kanban vira colaborativo em tempo real, automações cron eliminam tarefas manuais, e o pipeline comercial (CRM) entra no sistema.

### 1.2 Blocos

| Bloco | Feature | Prioridade |
|-------|---------|------------|
| A | Portal do Cliente | ⚡ Alta |
| B | Integrações Externas (WhatsApp, Instagram, Meta Ads) | Alta |
| C | Relatórios e Exportação PDF/Excel | Média |
| D | Colaboração em Tempo Real (Realtime) | Média |
| E | CRM de Leads | Média |
| F | Automação Avançada (Cron + E-mail) | Média-Baixa |
| G | Output Versioning | Baixa |

### 1.3 Stack adicionada na Fase 3

```
@react-pdf/renderer    — geração de PDF
exceljs                — exportação Excel
resend                 — e-mail transacional
diff                   — diff visual de versões de output
```

---

## 2. Arquitetura e Decisões Técnicas

### 2.1 Portal do Cliente — Route Group separado

O portal de clientes usa o route group `(client)` com layout completamente isolado do `(dashboard)`. O middleware (`proxy.ts`) identifica o role `client` e protege as rotas `/client/*`. Usuários com `role='client'` são redirecionados para `/client/outputs` ao fazer login; usuários internos não têm acesso ao grupo `(client)`.

```
app/
  (auth)/         ← login/register (já existe)
  (client)/       ← NOVO — portal externo
    layout.tsx    ← header simplificado, sem sidebar
    outputs/
      page.tsx
      [id]/
        page.tsx
    login/
      page.tsx
  (dashboard)/    ← dashboard interno (já existe)
```

### 2.2 Realtime Strategy

Supabase Realtime é habilitado nas tabelas `jobs`, `job_outputs`, `notifications` e `pipeline_runs` via `Database → Replication → supabase_realtime` no dashboard. Os hooks (`useRealtimeJobs`, `useRealtimeOutputs`) usam `postgres_changes` com filtro por `job_id` ou `client_id` para evitar broadcast excessivo.

### 2.3 Cron Jobs no Vercel

O arquivo `vercel.json` define os cron jobs. Cada rota `/api/cron/*` valida o header `Authorization: Bearer CRON_SECRET` (env var `CRON_SECRET`) para evitar execução não autorizada. Em desenvolvimento, as rotas podem ser chamadas manualmente via `curl`.

### 2.4 Service Role nas Rotas de Cron e Relatórios

Rotas de cron e geração de relatório usam `createAdminClient` (service_role) para operar sem restrições de RLS — necessário pois executam em background sem sessão de usuário.

### 2.5 Tokens de integração

Tokens de OAuth (Instagram, Meta Ads) são armazenados na coluna `config` (JSONB) de `integration_configs`. Em Fase 3, são salvos em plaintext mas criptografados com `AES-256-GCM` usando `ENCRYPTION_KEY` (env var) antes do INSERT. A coluna `config` nunca é retornada em SELECT público.

---

## 3. Schema do Banco de Dados

### 3.1 Alterações em tabelas existentes

#### `profiles`
```sql
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'collaborator', 'client'));
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone     TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON profiles(role);
```

#### `notifications`
```sql
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS channels TEXT[]       DEFAULT ARRAY['in_app'],
  ADD COLUMN IF NOT EXISTS sent_at  TIMESTAMPTZ;
```

---

### 3.2 Bloco A — Portal do Cliente

#### `client_invites`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `client_id` | UUID | FK → clients(id) ON DELETE CASCADE NOT NULL |
| `email` | TEXT | NOT NULL |
| `invited_by` | UUID | FK → profiles(id) ON DELETE SET NULL |
| `accepted_at` | TIMESTAMPTZ | nullable |
| `expires_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() + 7 days |
| `token` | TEXT | NOT NULL UNIQUE, default random hex 32 bytes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**RLS:** Admins e colaboradores fazem tudo. Clientes sem acesso.
**Índices:** `email`, `client_id`, `token`

---

### 3.3 Bloco B — Integrações Externas

#### `integration_configs`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `client_id` | UUID | FK → clients NOT NULL |
| `type` | TEXT | CHECK IN ('whatsapp','instagram','meta_ads','google_analytics') |
| `config` | JSONB | NOT NULL DEFAULT '{}' — tokens criptografados |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `last_sync_at` | TIMESTAMPTZ | nullable |
| `created_by` | UUID | FK → profiles |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | trigger |
| UNIQUE | `(client_id, type)` | — |

#### `whatsapp_messages`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `client_id` | UUID | FK → clients NOT NULL |
| `direction` | TEXT | CHECK IN ('outbound','inbound') |
| `to_number` | TEXT | nullable |
| `from_number` | TEXT | nullable |
| `message_body` | TEXT | NOT NULL |
| `message_type` | TEXT | CHECK IN ('text','template','interactive') DEFAULT 'text' |
| `template_name` | TEXT | nullable |
| `status` | TEXT | CHECK IN ('pending','sent','delivered','read','failed') |
| `twilio_sid` | TEXT | nullable |
| `output_id` | UUID | FK → job_outputs ON DELETE SET NULL |
| `metadata` | JSONB | DEFAULT '{}' |
| `sent_at` | TIMESTAMPTZ | nullable |
| `delivered_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `scheduled_posts`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `client_id` | UUID | FK → clients NOT NULL |
| `output_id` | UUID | FK → job_outputs ON DELETE CASCADE NOT NULL |
| `platform` | TEXT | CHECK IN ('instagram','facebook','both') |
| `caption` | TEXT | nullable |
| `media_urls` | TEXT[] | DEFAULT '{}' |
| `publish_at` | TIMESTAMPTZ | NOT NULL |
| `published_at` | TIMESTAMPTZ | nullable |
| `status` | TEXT | CHECK IN ('scheduled','publishing','published','failed','cancelled') |
| `platform_post_id` | TEXT | nullable — ID na rede social após publicação |
| `error_message` | TEXT | nullable |
| `created_by` | UUID | FK → profiles |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | trigger |

#### `post_insights`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `scheduled_post_id` | UUID | FK → scheduled_posts nullable |
| `client_id` | UUID | FK → clients NOT NULL |
| `platform_post_id` | TEXT | NOT NULL |
| `platform` | TEXT | CHECK IN ('instagram','facebook') |
| `impressions` | INTEGER | DEFAULT 0 |
| `reach` | INTEGER | DEFAULT 0 |
| `likes` | INTEGER | DEFAULT 0 |
| `comments` | INTEGER | DEFAULT 0 |
| `shares` | INTEGER | DEFAULT 0 |
| `saves` | INTEGER | DEFAULT 0 |
| `engagement_rate` | NUMERIC(5,2) | nullable |
| `fetched_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `meta_campaigns`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `client_id` | UUID | FK → clients NOT NULL |
| `campaign_id` | TEXT | NOT NULL — ID na Meta API |
| `name` | TEXT | NOT NULL |
| `status` | TEXT | CHECK IN ('ACTIVE','PAUSED','DELETED','ARCHIVED') |
| `objective` | TEXT | nullable |
| `spend` | NUMERIC(10,2) | DEFAULT 0 |
| `impressions` | INTEGER | DEFAULT 0 |
| `clicks` | INTEGER | DEFAULT 0 |
| `ctr` | NUMERIC(6,4) | nullable |
| `cpc` | NUMERIC(8,2) | nullable |
| `conversions` | INTEGER | DEFAULT 0 |
| `period_start` | DATE | NOT NULL |
| `period_end` | DATE | NOT NULL |
| `synced_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| UNIQUE | `(client_id, campaign_id, period_start)` | — |

---

### 3.4 Bloco C — Relatórios

#### `reports`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `client_id` | UUID | FK → clients NOT NULL |
| `title` | TEXT | NOT NULL |
| `period_start` | DATE | NOT NULL |
| `period_end` | DATE | NOT NULL |
| `format` | TEXT | CHECK IN ('pdf','excel') DEFAULT 'pdf' |
| `sections` | TEXT[] | DEFAULT '{}' — seções incluídas |
| `file_url` | TEXT | nullable — URL após geração |
| `status` | TEXT | CHECK IN ('pending','generating','ready','failed') DEFAULT 'pending' |
| `generated_at` | TIMESTAMPTZ | nullable |
| `generated_by` | UUID | FK → profiles nullable (null = cron) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `report_shares`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `report_id` | UUID | FK → reports ON DELETE CASCADE NOT NULL |
| `token` | TEXT | NOT NULL UNIQUE — 32 bytes hex |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `views` | INTEGER | DEFAULT 0 |
| `created_by` | UUID | FK → profiles |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

### 3.5 Bloco E — CRM de Leads

#### `leads`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `company` | TEXT | nullable |
| `email` | TEXT | nullable |
| `phone` | TEXT | nullable |
| `stage` | TEXT | CHECK IN ('prospect','contacted','proposal_sent','negotiation','won','lost') DEFAULT 'prospect' |
| `deal_value` | NUMERIC(12,2) | nullable |
| `source` | TEXT | nullable — ex: 'instagram','referral','cold_call' |
| `assigned_to` | UUID | FK → profiles ON DELETE SET NULL |
| `converted_client_id` | UUID | FK → clients ON DELETE SET NULL — preenchido ao converter |
| `notes` | TEXT | nullable |
| `lost_reason` | TEXT | nullable |
| `expected_close` | DATE | nullable |
| `created_by` | UUID | FK → profiles |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | trigger |

#### `lead_activities`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `lead_id` | UUID | FK → leads ON DELETE CASCADE NOT NULL |
| `type` | TEXT | CHECK IN ('call','email','meeting','note','stage_change','whatsapp') NOT NULL |
| `title` | TEXT | NOT NULL |
| `body` | TEXT | nullable |
| `performed_by` | UUID | FK → profiles |
| `metadata` | JSONB | DEFAULT '{}' — ex: {from_stage, to_stage} |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `lead_tags`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL UNIQUE |
| `color` | TEXT | DEFAULT '#6366f1' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `lead_tag_assignments`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `lead_id` | UUID | FK → leads ON DELETE CASCADE |
| `tag_id` | UUID | FK → lead_tags ON DELETE CASCADE |
| PRIMARY KEY | `(lead_id, tag_id)` | — |

---

### 3.6 Bloco F — Automação

#### `email_logs`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `to_email` | TEXT | NOT NULL |
| `subject` | TEXT | NOT NULL |
| `template` | TEXT | NOT NULL |
| `status` | TEXT | CHECK IN ('sent','failed','bounced') DEFAULT 'sent' |
| `resend_id` | TEXT | nullable — ID retornado pelo Resend |
| `metadata` | JSONB | DEFAULT '{}' |
| `sent_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `automation_rules` (futuro — preparação)
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `trigger` | TEXT | NOT NULL — ex: 'output.stage_changed' |
| `condition` | JSONB | DEFAULT '{}' — ex: {to_stage: 'client_review'} |
| `action` | TEXT | NOT NULL — ex: 'send_email', 'send_whatsapp' |
| `action_config` | JSONB | DEFAULT '{}' — ex: {template: 'approval_request'} |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

### 3.7 Bloco G — Output Versioning

#### `output_versions`
| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `output_id` | UUID | FK → job_outputs ON DELETE CASCADE NOT NULL |
| `version_number` | INTEGER | NOT NULL |
| `content` | TEXT | NOT NULL — snapshot do conteúdo |
| `changed_by` | UUID | FK → profiles ON DELETE SET NULL |
| `change_note` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Trigger de versionamento:**
```sql
CREATE OR REPLACE FUNCTION capture_output_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.output_content IS DISTINCT FROM NEW.output_content THEN
    INSERT INTO output_versions (output_id, version_number, content, changed_by)
    SELECT OLD.id,
           COALESCE((
             SELECT MAX(version_number) FROM output_versions WHERE output_id = OLD.id
           ), 0) + 1,
           OLD.output_content,
           auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_capture_output_version
  BEFORE UPDATE ON job_outputs
  FOR EACH ROW EXECUTE FUNCTION capture_output_version();
```

---

## 4. Tipos TypeScript

```typescript
// ─── Bloco A — Portal do Cliente ────────────────────────────────────────────

export type ClientRole = 'admin' | 'collaborator' | 'client'

export interface ClientInvite {
  id: string
  client_id: string
  email: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  token: string
  created_at: string
}

// ─── Bloco B — Integrações ───────────────────────────────────────────────────

export type IntegrationType = 'whatsapp' | 'instagram' | 'meta_ads' | 'google_analytics'

export interface IntegrationConfig {
  id: string
  client_id: string
  type: IntegrationType
  config: Record<string, unknown>  // tokens — nunca expor no frontend
  is_active: boolean
  last_sync_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type WhatsAppDirection = 'outbound' | 'inbound'
export type WhatsAppStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
export type WhatsAppMessageType = 'text' | 'template' | 'interactive'

export interface WhatsAppMessage {
  id: string
  client_id: string
  direction: WhatsAppDirection
  to_number: string | null
  from_number: string | null
  message_body: string
  message_type: WhatsAppMessageType
  template_name: string | null
  status: WhatsAppStatus
  twilio_sid: string | null
  output_id: string | null
  metadata: Record<string, unknown>
  sent_at: string | null
  delivered_at: string | null
  created_at: string
}

export type ScheduledPostPlatform = 'instagram' | 'facebook' | 'both'
export type ScheduledPostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'

export interface ScheduledPost {
  id: string
  client_id: string
  output_id: string
  platform: ScheduledPostPlatform
  caption: string | null
  media_urls: string[]
  publish_at: string
  published_at: string | null
  status: ScheduledPostStatus
  platform_post_id: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PostInsight {
  id: string
  scheduled_post_id: string | null
  client_id: string
  platform_post_id: string
  platform: 'instagram' | 'facebook'
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagement_rate: number | null
  fetched_at: string
  created_at: string
}

export interface MetaCampaign {
  id: string
  client_id: string
  campaign_id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpc: number | null
  conversions: number
  period_start: string
  period_end: string
  synced_at: string
  created_at: string
}

// ─── Bloco C — Relatórios ────────────────────────────────────────────────────

export type ReportFormat = 'pdf' | 'excel'
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed'

export interface Report {
  id: string
  client_id: string
  title: string
  period_start: string
  period_end: string
  format: ReportFormat
  sections: string[]
  file_url: string | null
  status: ReportStatus
  generated_at: string | null
  generated_by: string | null
  created_at: string
}

export interface ReportShare {
  id: string
  report_id: string
  token: string
  expires_at: string
  views: number
  created_by: string | null
  created_at: string
}

// ─── Bloco E — CRM ──────────────────────────────────────────────────────────

export type LeadStage = 'prospect' | 'contacted' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'whatsapp'

export interface Lead {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  stage: LeadStage
  deal_value: number | null
  source: string | null
  assigned_to: string | null
  converted_client_id: string | null
  notes: string | null
  lost_reason: string | null
  expected_close: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  type: ActivityType
  title: string
  body: string | null
  performed_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LeadTag {
  id: string
  name: string
  color: string
  created_at: string
}

// ─── Bloco F — Automação ─────────────────────────────────────────────────────

export interface EmailLog {
  id: string
  to_email: string
  subject: string
  template: string
  status: 'sent' | 'failed' | 'bounced'
  resend_id: string | null
  metadata: Record<string, unknown>
  sent_at: string
}

// ─── Bloco G — Versioning ────────────────────────────────────────────────────

export interface OutputVersion {
  id: string
  output_id: string
  version_number: number
  content: string
  changed_by: string | null
  change_note: string | null
  created_at: string
}
```

---

## 5. Componentes

### 5.1 Bloco A — Portal do Cliente

#### `ClientOutputList`
- **Arquivo:** `components/client-portal/ClientOutputList.tsx`
- **Props:** `{ outputs: JobOutput[] }`
- **Estado:** `filter: 'all' | 'client_review' | 'approved' | 'published'`
- **Comportamento:** Grid de cards filtrado por estágio. Estágio `client_review` é destacado como "Aguardando sua aprovação".

#### `ClientOutputCard`
- **Arquivo:** `components/client-portal/ClientOutputCard.tsx`
- **Props:** `{ output: JobOutput & { job: Pick<Job, 'title'> } }`
- **Comportamento:** Card compacto com preview das primeiras 200 chars do conteúdo, nome do job e badge de estágio. Link para `/client/outputs/[id]`.

#### `ClientApproveForm`
- **Arquivo:** `components/client-portal/ClientApproveForm.tsx`
- **Props:** `{ outputId: string; onSuccess: () => void }`
- **Estado:** `action: 'approve' | 'request_revision' | null`, `notes: string`, `loading: boolean`
- **Comportamento:**
  1. Radio group: "Aprovar" ou "Solicitar Revisão"
  2. Textarea de notas (obrigatória para revisão)
  3. Botão confirmar → `POST /api/outputs/[id]/approve` com `{ to_stage: 'approved' | 'rejected', notes }`
  4. Toast de sucesso + `onSuccess()`

#### `ClientInviteDialog`
- **Arquivo:** `components/client-portal/ClientInviteDialog.tsx`
- **Props:** `{ clientId: string; clientName: string }`
- **Estado:** `email: string`, `loading: boolean`, `sent: boolean`
- **Comportamento:** Modal com campo de e-mail → `POST /api/client-portal/invite`. Sucesso exibe link de convite copiável.

### 5.2 Bloco C — Relatórios

#### `ReportBuilder`
- **Arquivo:** `components/reports/ReportBuilder.tsx`
- **Props:** `{ clientId: string; onGenerate: (reportId: string) => void }`
- **Estado:** `period: {start, end}`, `format: ReportFormat`, `sections: string[]`, `loading`
- **Seções disponíveis:** `'summary' | 'outputs' | 'approvals' | 'agents' | 'instagram' | 'meta_ads'`
- **Comportamento:** Formulário de configuração → `POST /api/reports/generate` → polling ou redirect para relatório gerado.

#### `PDFTemplate`
- **Arquivo:** `components/reports/PDFTemplate.tsx`
- **Props:** `{ report: Report; data: ReportData; client: Client }`
- **Comportamento:** Documento `@react-pdf/renderer` com capa, resumo, tabelas e gráficos simples. Renderizado server-side na rota de geração.

### 5.3 Bloco D — Realtime

#### `useRealtimeJobs`
- **Arquivo:** `hooks/useRealtimeJobs.ts`
- **Assinatura:** `function useRealtimeJobs(initialJobs: Job[]): Job[]`
- **Comportamento:** Inscreve canal `jobs:all` com `postgres_changes` para INSERT, UPDATE, DELETE. Atualiza lista local sem refetch. Cleanup no unmount.

#### `useRealtimeOutputs`
- **Arquivo:** `hooks/useRealtimeOutputs.ts`
- **Assinatura:** `function useRealtimeOutputs(jobId: string, initialOutputs: JobOutput[]): JobOutput[]`
- **Comportamento:** Canal filtrado por `job_id=eq.{jobId}`. Escuta UPDATE (mudanças de estágio) e INSERT (novos outputs).

#### `PresenceAvatars`
- **Arquivo:** `components/realtime/PresenceAvatars.tsx`
- **Props:** `{ channel: string }`
- **Comportamento:** `supabase.channel(channel).track({ user_id, name, avatar_url })`. Exibe stackd avatares dos usuários presentes com tooltip de nome.

### 5.4 Bloco E — CRM

#### `CRMKanban`
- **Arquivo:** `components/crm/CRMKanban.tsx`
- **Props:** `{ leads: Lead[] }`
- **Estado:** Colunas por `LeadStage`, drag-and-drop (`@dnd-kit/core`)
- **Comportamento:** Drop em coluna diferente → `PUT /api/crm/leads/[id]` com `{ stage: newStage }` + registra `lead_activity` do tipo `stage_change`.

#### `LeadForm`
- **Arquivo:** `components/crm/LeadForm.tsx`
- **Props:** `{ initialData?: Partial<Lead>; mode: 'create' | 'edit' }`
- **Campos:** name*, company, email, phone, stage, deal_value, source, assigned_to, expected_close, notes

#### `ConvertLeadDialog`
- **Arquivo:** `components/crm/ConvertLeadDialog.tsx`
- **Props:** `{ lead: Lead; onConverted: (clientId: string) => void }`
- **Comportamento:** Confirma conversão → `POST /api/crm/leads/[id]/convert` → cria cliente com dados do lead → redireciona para `/clients/[newClientId]`.

### 5.5 Bloco G — Versioning

#### `VersionHistory`
- **Arquivo:** `components/outputs/VersionHistory.tsx`
- **Props:** `{ outputId: string; currentContent: string }`
- **Estado:** `versions: OutputVersion[]`, `selectedVersion: OutputVersion | null`
- **Comportamento:** Lista de versões com data e autor. Clique → exibe `VersionDiff` entre selecionada e atual.

#### `VersionDiff`
- **Arquivo:** `components/outputs/VersionDiff.tsx`
- **Props:** `{ oldContent: string; newContent: string }`
- **Comportamento:** Usa biblioteca `diff` para computar e colorir linhas adicionadas (verde) e removidas (vermelho).

---

## 6. Rotas de API

### 6.1 Bloco A — Portal do Cliente

#### `POST /api/client-portal/invite`
**Auth:** Admin ou colaborador.
**Body:** `{ client_id: string; email: string }`
**Lógica:**
1. Valida que `client_id` existe
2. Insere em `client_invites` com token gerado
3. Envia e-mail via Resend com link `{BASE_URL}/client/login?token={token}`
4. Retorna `{ invite_id, token, expires_at }`

**Erros:**
- `400` — campos faltando
- `404` — cliente não encontrado
- `409` — convite ativo já existe para este e-mail/cliente

---

#### `GET /api/client-portal/accept?token=xxx`
**Auth:** Nenhuma (link público).
**Lógica:**
1. Busca `client_invites` pelo token
2. Valida expiração e que não foi aceito
3. Cria usuário Supabase Auth (magic link ou senha temporária)
4. Cria `profile` com `role='client'`, `client_id` vinculado
5. Marca convite como aceito (`accepted_at = NOW()`)
6. Redireciona para `/client/outputs`

---

### 6.2 Bloco B — Integrações

#### `POST /api/integrations/whatsapp/send`
**Auth:** Admin ou colaborador.
**Body:** `{ client_id: string; to: string; template_name: string; variables?: Record<string, string>; output_id?: string }`
**Lógica:**
1. Busca `integration_configs` do cliente (type='whatsapp')
2. Chama Twilio API com o template
3. Insere em `whatsapp_messages` com status='sent'
4. Retorna `{ message_id, twilio_sid }`

**Erros:**
- `404` — integração WhatsApp não configurada para o cliente
- `422` — template inválido ou variáveis faltando

---

#### `POST /api/integrations/whatsapp/webhook`
**Auth:** Validação de assinatura Twilio (header `X-Twilio-Signature`).
**Body:** Payload Twilio com status de entrega ou resposta do usuário.
**Lógica:**
1. Valida assinatura Twilio
2. Se resposta: detecta `APROVAR` / `REVISAO` e chama `/api/outputs/[id]/approve`
3. Atualiza status em `whatsapp_messages`
4. Retorna `200 OK`

---

#### `POST /api/integrations/meta-ads/sync/[clientId]`
**Auth:** Admin.
**Lógica:**
1. Busca `integration_configs` do cliente (type='meta_ads')
2. Decripta token e chama Meta Graph API (`/act_xxx/campaigns?fields=name,status,insights`)
3. Upsert em `meta_campaigns` com `(client_id, campaign_id, period_start)` como chave
4. Atualiza `last_sync_at` em `integration_configs`
5. Retorna `{ synced: N }`

---

### 6.3 Bloco C — Relatórios

#### `POST /api/reports/generate`
**Auth:** Admin.
**Body:** `{ client_id: string; period_start: string; period_end: string; format: ReportFormat; sections: string[] }`
**Lógica:**
1. Insere em `reports` com status='generating'
2. Em paralelo: coleta dados de `job_outputs`, `output_approval_events`, `meta_campaigns`, `post_insights`
3. Se `format='pdf'`: renderiza `PDFTemplate` com `@react-pdf/renderer`, faz upload para `client-logos` bucket em `/reports/{report_id}.pdf`
4. Se `format='excel'`: cria workbook com `exceljs`, faz upload
5. Atualiza `reports` com `status='ready'`, `file_url`, `generated_at`
6. Retorna `{ report_id, file_url }`

**Timeout:** Esta rota pode demorar >10s para clientes com muitos dados. Usar `maxDuration: 60` em `vercel.json`.

---

#### `POST /api/reports/[id]/share`
**Auth:** Admin.
**Body:** `{ expires_in_days: number }` (1–30)
**Lógica:**
1. Gera token único
2. Insere em `report_shares` com `expires_at = NOW() + expires_in_days`
3. Retorna `{ share_url: '{BASE_URL}/r/{token}' }`

---

#### `GET /r/[token]` (Página pública)
**Auth:** Nenhuma.
**Lógica:**
1. Busca `report_shares` pelo token
2. Valida `expires_at > NOW()` → senão `410 Gone`
3. Incrementa `views`
4. Renderiza preview do relatório ou redireciona para `file_url`

---

### 6.4 Bloco E — CRM

#### `GET /api/crm/leads`
**Auth:** Admin ou colaborador.
**Query:** `?stage=prospect&assigned_to=uuid&search=text`
**Retorna:** `Lead[]` com `assigned_to: Profile` joined, `tags: LeadTag[]`

---

#### `POST /api/crm/leads`
**Auth:** Admin ou colaborador.
**Body:** `Omit<Lead, 'id' | 'created_at' | 'updated_at'>`
**Lógica:** INSERT + registra atividade `{ type: 'note', title: 'Lead criado' }`

---

#### `PUT /api/crm/leads/[id]`
**Auth:** Admin ou colaborador.
**Body:** `Partial<Lead>`
**Lógica:** UPDATE. Se `stage` mudou → insere `lead_activity` com `type='stage_change'` e `metadata: { from_stage, to_stage }`.

---

#### `POST /api/crm/leads/[id]/convert`
**Auth:** Admin.
**Lógica:**
1. Cria cliente em `clients` com dados do lead (name, company→niche, phone)
2. Atualiza `leads` com `stage='won'` e `converted_client_id=newClientId`
3. Registra atividade `{ type: 'note', title: 'Lead convertido em cliente' }`
4. Retorna `{ client_id: newClientId }`

---

### 6.5 Bloco F — Cron Jobs

#### `GET /api/cron/check-overdue-jobs`
**Auth:** `Authorization: Bearer {CRON_SECRET}`
**Lógica:**
1. `SELECT * FROM jobs WHERE due_date < NOW() AND status != 'done'`
2. Para cada job: insere `notification` + chama `/api/email/send` com template `job_overdue`
3. Retorna `{ processed: N }`

---

#### `GET /api/cron/send-pending-approvals`
**Auth:** `Authorization: Bearer {CRON_SECRET}`
**Lógica:**
1. `SELECT * FROM job_outputs WHERE approval_stage = 'client_review' AND updated_at < NOW() - INTERVAL '48h'`
2. Para cada output: busca cliente → envia WhatsApp (se configurado) ou e-mail de lembrete
3. Retorna `{ reminders_sent: N }`

---

#### `GET /api/cron/generate-monthly-reports`
**Auth:** `Authorization: Bearer {CRON_SECRET}`
**Lógica:**
1. Lista todos clientes ativos (`contract_status = 'active'`)
2. Para cada cliente: chama `POST /api/reports/generate` com período do mês anterior
3. Envia e-mail ao admin com links dos relatórios
4. Retorna `{ reports_generated: N }`

---

### 6.6 Bloco G — Versioning

#### `GET /api/outputs/[id]/versions`
**Auth:** Admin ou colaborador.
**Retorna:** `OutputVersion[]` ordenado por `version_number DESC`

---

#### `POST /api/outputs/[id]/versions/[versionId]/rollback`
**Auth:** Admin.
**Lógica:**
1. Busca versão pelo `versionId`
2. Atualiza `job_outputs.output_content = version.content` (trigger de versão captura a atual antes do update)
3. Insere `output_approval_stage = 'draft'` (rollback volta para rascunho)
4. Retorna `{ success: true, new_version_number: N }`

---

## 7. Páginas

### 7.1 Bloco A — Portal do Cliente

#### `/client/login`
- **Tipo:** Server Component
- **Auth:** Pública
- **Conteúdo:** Formulário de magic link para clientes. Sem sidebar. Header com logo da agência.

#### `/client/outputs`
- **Tipo:** Server Component
- **Auth:** role='client' obrigatório (middleware redireciona)
- **Data fetching:** `job_outputs` WHERE `client_id = profile.client_id` AND `approval_stage IN ('client_review','approved','published')`
- **Componentes:** `ClientOutputList`

#### `/client/outputs/[id]`
- **Tipo:** Server Component + Client Components para interação
- **Data fetching:** Output + job + `output_approval_events`
- **Componentes:** Viewer de conteúdo + `ClientApproveForm` (só exibido se `approval_stage = 'client_review'`)

---

### 7.2 Bloco C — Relatórios

#### `/reports`
- **Auth:** Admin only
- **Data fetching:** `reports` JOIN `clients` para todos os clientes, ordenado por `created_at DESC`
- **Componentes:** `ReportCard` com link de download e botão de criar share

#### `/reports/[clientId]/new`
- **Auth:** Admin
- **Componentes:** `ReportBuilder` com período padrão = mês atual

#### `/r/[token]`
- **Auth:** Pública
- **Data fetching:** `report_shares` JOIN `reports` pelo token; valida expiração
- **Conteúdo:** Exibe `file_url` em iframe ou lista outputs do relatório (fallback)

---

### 7.3 Bloco E — CRM

#### `/crm`
- **Auth:** Admin ou colaborador
- **Data fetching:** Todos os leads agrupados por `stage` com `assigned_to: Profile`, `tags: LeadTag[]`
- **Componentes:** `CRMKanban`, `CRMMetricsBar`, botão "Novo Lead"

#### `/crm/leads/[id]`
- **Auth:** Admin ou colaborador
- **Data fetching:** Lead + `lead_activities` DESC + `lead_tags`
- **Componentes:** `LeadDetail`, `ActivityFeed`, `ActivityForm`, `ConvertLeadDialog` (se `stage != 'won'`)

---

## 8. Fluxos de Usuário

### 8.1 Onboarding do Cliente no Portal

```
Admin abre ClientInviteDialog
         │
         ▼
POST /api/client-portal/invite
         │
         ▼
E-mail enviado via Resend com link
         │
         ▼
Cliente clica no link → /client/login?token=xxx
         │
         ▼
GET /api/client-portal/accept
→ cria usuário Auth + profile(role='client')
         │
         ▼
Redirect → /client/outputs
→ vê outputs em client_review
         │
         ▼
Cliente abre output → ClientApproveForm
         │
    ┌────┴────┐
  Aprova    Revisão
    │          │
    ▼          ▼
approval_stage  approval_stage
= 'approved'   = 'rejected'
    │          │
    └────┬─────┘
         ▼
Notificação in-app + e-mail
para colaborador responsável
```

---

### 8.2 Geração e Compartilhamento de Relatório

```
Admin → /reports/[clientId]/new
→ ReportBuilder (período + seções)
         │
         ▼
POST /api/reports/generate
→ reports.status = 'generating'
         │
         ▼
Coleta dados (outputs, approvals, meta, instagram)
         │
         ▼
@react-pdf/renderer → Buffer
→ upload para Storage
→ reports.status = 'ready', file_url preenchido
         │
         ▼
Admin → POST /api/reports/[id]/share
→ token gerado, report_shares inserido
→ URL copiável: /r/{token}
         │
         ▼
Cliente abre URL sem login
→ incrementa views
→ exibe relatório
```

---

### 8.3 Pipeline CRM → Conversão

```
Lead 'prospect' criado
         │
         ▼
CRMKanban drag → 'contacted'
→ PUT /api/crm/leads/[id] {stage}
→ activity criada: stage_change
         │
    (negociações...)
         │
         ▼
Drag → 'won'
         │
         ▼
ConvertLeadDialog → POST /api/crm/leads/[id]/convert
→ INSERT clients (dados do lead)
→ leads.converted_client_id = newClientId
→ leads.stage = 'won'
         │
         ▼
Redirect → /clients/[newClientId]
→ cliente já disponível para criar jobs
```

---

### 8.4 Rollback de Output

```
Colaborador edita output_content
         │
         ▼
Trigger trg_capture_output_version
→ INSERT output_versions (conteúdo antigo, version++)
         │
         ▼
Colaborador acessa /jobs/[id]/outputs/[outputId]/versions
→ VersionHistory lista versões
→ Clica em versão anterior → VersionDiff exibe diferenças
         │
         ▼
Clica "Restaurar esta versão"
→ RollbackDialog confirma
         │
         ▼
POST /api/outputs/[id]/versions/[versionId]/rollback
→ output_content = versão selecionada
→ approval_stage = 'draft'
→ Trigger captura versão atual antes do update
         │
         ▼
Toast: "Versão restaurada. Output voltou para rascunho."
```

---

## 9. Integrações Externas

### 9.1 WhatsApp via Twilio

**Variáveis de ambiente necessárias:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Templates pré-aprovados no Twilio:**
- `approval_request` — "Você tem um conteúdo para aprovar: {link}"
- `job_overdue` — "Job atrasado: {job_title}. Veja em: {link}"
- `output_approved` — "Output aprovado pelo cliente {client_name}"

**Validação de webhook:**
```typescript
import twilio from 'twilio'
const valid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN!,
  req.headers['x-twilio-signature'],
  webhookUrl,
  body
)
```

---

### 9.2 Instagram Graph API

**OAuth Flow:**
1. Redireciona para `https://api.instagram.com/oauth/authorize?client_id=...&redirect_uri={BASE_URL}/api/integrations/instagram/callback&scope=instagram_basic,instagram_content_publish`
2. Callback recebe `code` → troca por `access_token` + `user_id`
3. Token e user_id são salvos em `integration_configs.config` (criptografados)

**Variáveis de ambiente:**
```
INSTAGRAM_APP_ID=xxxxxxxxxx
INSTAGRAM_APP_SECRET=xxxxxxxxxx
```

---

### 9.3 Meta Ads API

**Autenticação:** System User Token gerado no Meta Business Manager.

**Endpoint de insights:**
```
GET https://graph.facebook.com/v18.0/act_{adAccountId}/campaigns
  ?fields=name,status,insights.date_preset(last_month){spend,impressions,clicks,ctr,cpc,conversions}
  &access_token={token}
```

---

### 9.4 Resend (E-mail Transacional)

**Variáveis de ambiente:**
```
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=noreply@agencyos.com.br
```

**Uso:**
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: process.env.EMAIL_FROM!,
  to: email,
  subject,
  react: EmailTemplate({ ... }),
})
```

---

## 10. Automações e Cron Jobs

### `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/check-overdue-jobs",       "schedule": "0 9 * * *"   },
    { "path": "/api/cron/send-pending-approvals",   "schedule": "0 10 * * *"  },
    { "path": "/api/cron/generate-monthly-reports", "schedule": "0 8 1 * *"   },
    { "path": "/api/cron/pipeline-health-check",    "schedule": "0 7 * * *"   },
    { "path": "/api/cron/cleanup-expired-shares",   "schedule": "0 3 * * 0"   }
  ]
}
```

### Segurança dos Cron Jobs
```typescript
// Em cada rota /api/cron/*
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

**Variável de ambiente:** `CRON_SECRET=<random-32-chars>`

---

## 11. Pendências e Próximos Passos

### Pendências técnicas antes de implementar

| Item | Bloco | Ação |
|------|-------|------|
| Middleware expandido para role='client' | A | Atualizar `proxy.ts` para redirecionar clientes para `/client/*` |
| Realtime habilitado no Supabase | D | Dashboard → Database → Replication → adicionar `jobs`, `job_outputs`, `pipeline_runs` |
| `vercel.json` com cron config | F | Criar arquivo na raiz do projeto `web/` |
| Env vars adicionadas no Vercel | B/F | TWILIO_*, INSTAGRAM_*, RESEND_API_KEY, CRON_SECRET, ENCRYPTION_KEY |
| Bucket `reports` no Storage | C | Criar bucket privado para arquivos PDF/Excel gerados |

### Ordem recomendada de implementação

1. **Bloco A** — Portal do Cliente (maior impacto operacional)
2. **Bloco D** — Realtime (melhora a experiência do time interno imediatamente)
3. **Bloco E** — CRM (fecha o loop comercial)
4. **Bloco C** — Relatórios (valor para clientes)
5. **Bloco F** — Automações (reduz trabalho manual)
6. **Bloco G** — Versioning (segurança editorial)
7. **Bloco B** — Integrações externas (maior complexidade, dependências externas)

### Dívida técnica identificada

- Pipeline execution (Fase 2) usa request síncrono — mover para Vercel Queue ou background job na Fase 3
- `integration_configs.config` deve ser criptografado em nível de aplicação (AES-256-GCM) antes do INSERT
- Adicionar rate limiting nas rotas de cron e geração de relatório
- `output_versions` trigger usa `auth.uid()` — em contexto de cron (sem sessão) retorna NULL; o `changed_by` ficará NULL nestes casos — OK por design
