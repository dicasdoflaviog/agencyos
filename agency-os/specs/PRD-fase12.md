# PRD — Agency OS Fase 12
> Product Requirements Document · Agent Autonomy + Integrações Externas

---

## 1. Contexto

A Fase 12 é a transição de "ferramenta que executa quando chamada" para "plataforma que trabalha sozinha". Os três eixos:

1. **Agent Autonomy**: agentes que rodam em horários programados ou em resposta a eventos (novo lead, contrato vencendo, cliente sem posts há 7 dias)
2. **Integrações Externas**: Notion como base de conhecimento bidirecional, Make/n8n como ponte para o ecossistema de automação do usuário
3. **VULCAN v2 + Reports Cron**: VULCAN com API de vídeo real (ou fallback honesto) + relatórios semanais/mensais enviados automaticamente por e-mail

### Decisões de tecnologia

| Bloco | Tecnologia | Alternativa | Motivo |
|-------|-----------|-------------|--------|
| Agent schedules | Vercel Cron Jobs + tabela `agent_schedules` | Bull/BullMQ | Vercel Cron já na infra; sem redis extra |
| Notion sync | Notion API v1 OAuth | Zapier/Make webhook | Bidirecional e nativo; Make é alternativa mas exige conta extra |
| VULCAN v2 | Google Veo 2 via Vertex AI ou fallback Runway | Pika, Kling | Veo 2 = qualidade; Runway = fallback imediato via API REST |
| Reports cron | Vercel Cron + Resend + Puppeteer PDF | Cron externo | Tudo na mesma infra; Puppeteer via `@sparticuz/chromium` no Vercel |
| Event triggers | Supabase DB Webhooks → `/api/autonomy/trigger` | Postgres triggers diretos | Webhooks = desacoplado; fácil de desligar por agente |

---

## 2. Blocos

### Bloco A — Agent Autonomy: Schedules + Runs
**Prioridade:** Alta

**Modelo de dados:**
```sql
-- Agenda configurável por workspace
CREATE TABLE agent_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE,
  agent_id     text NOT NULL,           -- 'vera', 'iris', 'vector', etc.
  trigger_type text NOT NULL,           -- 'cron', 'event'
  cron_expr    text,                    -- ex: '0 9 * * 1' (toda segunda 9h)
  event_type   text,                    -- 'new_lead', 'contract_expiring', 'no_post'
  prompt       text NOT NULL,           -- prompt a enviar
  is_active    boolean DEFAULT true,
  last_run_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- Histórico de execuções
CREATE TABLE agent_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id  uuid REFERENCES agent_schedules(id),
  workspace_id uuid NOT NULL,
  client_id    uuid,
  agent_id     text NOT NULL,
  status       text DEFAULT 'running',  -- 'running', 'done', 'failed'
  input_prompt text,
  output       text,
  error        text,
  started_at   timestamptz DEFAULT now(),
  finished_at  timestamptz
);
```

**Vercel cron job:** `vercel.json` com `"crons": [{ "path": "/api/autonomy/cron", "schedule": "0 * * * *" }]`
- A cada hora, consulta `agent_schedules` com `cron_expr` que "passa" no horário atual
- Para cada schedule ativo: chama `IntelligenceRouter.routeChat()` e salva resultado em `agent_runs` + `job_outputs`

**Rotas:**
- `POST /api/autonomy/schedule` — criar/editar schedule
- `POST /api/autonomy/trigger` — disparar manualmente ou via DB webhook
- `GET /api/autonomy/runs?client_id=` — histórico de execuções

**UI:** nova aba "Automações" na página do cliente — lista schedules, histórico de runs, toggle on/off

---

### Bloco B — Integração Notion
**Prioridade:** Média

**Fluxo OAuth:**
1. Settings → Integrações → "Conectar Notion"
2. Notion OAuth → salva `access_token` em `workspace_integrations` (tabela da Fase 11)
3. Usuário seleciona página/database do Notion para sincronizar

**Sincronização:**
- `POST /api/integrations/notion/sync { client_id }` — puxa páginas selecionadas → salva em `knowledge_files`
- `POST /api/integrations/notion/push { client_id, output_id }` — empurra output de agente para Notion
- Sync automático: Vercel cron diário às 6h para clients com Notion conectado

**Mapeamento:**
- Notion page → `knowledge_files` com `source: 'notion'` e `notion_page_id`
- Atualização incremental: só sync se `last_edited_time > last_synced_at`

---

### Bloco C — VULCAN v2 (Vídeo Real + Queue UI)
**Prioridade:** Média

**Veo 2 via Vertex AI:**
```
POST /api/agents/vulcan/generate
  → Tenta Veo 2 (Vertex AI GenerateVideoJob)
  → Fallback: Runway ML API (se RUNWAY_API_KEY presente)
  → Fallback final: retorna "Geração em fila — avisaremos por email"

GET /api/agents/vulcan/status/[job_id]
  → Polling Vertex AI job status
  → Quando done: download vídeo → Supabase Storage (bucket: video-assets)
  → Notifica via Supabase Realtime
```

**Queue UI (`VulcanQueue.tsx`):**
- Lista de jobs com status: `⏳ Na fila` · `⚙️ Gerando` · `✅ Pronto` · `❌ Falhou`
- Barra de progresso estimada (Veo 2 leva ~2–5 min)
- Preview inline quando pronto
- Botão "Notificar por e-mail quando pronto" (usa Resend)

---

### Bloco D — Reports Cron (PDF Automático)
**Prioridade:** Média

**Fluxo:**
```
Vercel cron (0 8 * * 1 = toda segunda 8h)
  → Para cada workspace com reports_cron: true
    → Busca dados da semana (jobs, outputs, ig_metrics, crm_leads)
    → VECTOR gera análise narrativa
    → Puppeteer renderiza PDF do report existente
    → Resend envia para o e-mail do workspace owner
    → Salva em report_history (id, workspace_id, pdf_url, sent_at)
```

**Configuração em Settings:** toggle "Relatório automático semanal" + campo de e-mail destino

**Nova tabela:**
```sql
CREATE TABLE report_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id    uuid,
  type         text DEFAULT 'weekly',  -- 'weekly', 'monthly'
  pdf_url      text,
  sent_to      text,
  sent_at      timestamptz DEFAULT now()
);
```

---

## 3. Critérios de Aceite

1. Schedule criado para VERA (toda segunda, post da semana) roda automaticamente
2. Notion sync puxa páginas e aparece em `knowledge_files` do cliente
3. VULCAN inicia geração e mostra fila com progresso
4. Report semanal enviado por e-mail toda segunda-feira às 8h

---

## 4. Variáveis de ambiente

| Var | Uso |
|-----|-----|
| `GOOGLE_APPLICATION_CREDENTIALS` | Vertex AI (Veo 2) |
| `NOTION_CLIENT_ID` + `NOTION_CLIENT_SECRET` | Notion OAuth |
| `RUNWAY_API_KEY` | Fallback Runway (opcional) |
| `RESEND_API_KEY` | E-mails automáticos (já deve existir) |
