# PRD — Agency OS | CRM Inteligente + SDR Autônomo
> SDD Research Output · Abril 2026
> Módulo: SDR (entre Fase 11 e Fase 12 no roadmap)

---

## 1. CONTEXTO

### O que já existe (não duplicar)
- `crm_leads` table + kanban de estágios (Fase 3)
- `lead_activities` table (Fase 3)
- `crm_scores` table + HARBOR scoring manual (Fase 11 / SPEC-fase9)
- `workspace_integrations` table (Fase 11 / SPEC-fase9)
- `whatsapp_messages` table + Twilio webhook (Fase 3)
- `intelligence_snapshots` table + lib/intelligence/apify.ts (Fase 10 / SPEC-fase8)
- `agent_schedules` table (Fase 12 / SPEC-fase10)
- Follow-up ORACLE por objeção — manual (Fase 11 / SPEC-fase9)
- Google Calendar OAuth (Fase 11 / SPEC-fase9)

### O que NÃO existe em nenhuma SPEC
- Formulário público de captação `/captacao`
- Webhook recebedor unificado para fontes externas (ManyChat, formulário, Instagram)
- Trigger automático: lead entra → pipeline SDR dispara sozinho
- IRIS enriquecendo lead automaticamente (hoje só enriquece cliente/concorrente)
- ORACLE modo SDR: primeiro contato personalizado + aprovação com 1 clique
- Sequência automática de follow-up D0/D+2/D+5 com detecção de resposta
- Detecção de interesse em resposta → notificação + handoff humano
- Outbound ativo: IRIS prospectando empresas por nicho → ORACLE abordando

### Problema que resolve
Um dono de agência pequena ou solopreneur passa horas por semana:
qualificando leads manualmente, lembrando de fazer follow-up,
escrevendo a mesma mensagem com variações mínimas para cada prospect.
O SDR autônomo elimina esse trabalho braçal — o humano só entra
quando o lead demonstra interesse real.

---

## 2. OBJETIVOS

| # | Objetivo | Métrica |
|---|----------|---------|
| O1 | Lead entra e é qualificado automaticamente em < 60s | HARBOR pontua sem intervenção humana |
| O2 | IRIS enriquece cada lead com dados públicos automaticamente | Instagram + site do lead analisados antes do primeiro contato |
| O3 | ORACLE gera primeiro contato personalizado para aprovação | Usuário aprova/edita com 1 clique — não escreve do zero |
| O4 | Sequência de follow-up roda sozinha sem lembretes manuais | D0, D+2, D+5 executados automaticamente |
| O5 | Lead com interesse detectado notifica o usuário imediatamente | Handoff humano acontece no momento certo |
| O6 | Formulário público captura leads de qualquer canal | ManyChat, Instagram, site, link na bio |

---

## 3. ARQUIVOS RELEVANTES EXISTENTES

```
app/(dashboard)/crm/page.tsx                  ← kanban de leads (adicionar métricas SDR)
app/api/crm/score/route.ts                    ← HARBOR score (transformar em trigger automático)
app/api/crm/followup/generate/route.ts        ← follow-up por objeção (base para sequência)
lib/intelligence/apify.ts                     ← cliente Apify (reutilizar para enriquecimento)
lib/intelligence/oracle-inject.ts             ← padrão de injeção de contexto
app/api/agents/oracle/chat/route.ts           ← ORACLE chat (base para modo SDR)
supabase/migration_intelligence.sql           ← padrão de migration
```

---

## 4. SCHEMA DO BANCO

### 4.1 — Tabelas NOVAS

```sql
-- Pipeline de automação SDR por lead
CREATE TABLE IF NOT EXISTS sdr_pipelines (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  workspace_id  UUID NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','paused','converted','dead','waiting_human')),
  current_step  INTEGER DEFAULT 0,        -- 0=qualify, 1=enrich, 2=contact, 3=followup1, 4=followup2
  next_action_at TIMESTAMPTZ,             -- quando executar próxima ação
  interest_detected BOOLEAN DEFAULT FALSE,
  interest_detected_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON sdr_pipelines (lead_id);
CREATE INDEX ON sdr_pipelines (workspace_id, status);
CREATE INDEX ON sdr_pipelines (next_action_at) WHERE status = 'running';

ALTER TABLE sdr_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdr_pipelines_auth" ON sdr_pipelines
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Log de cada ação do SDR
CREATE TABLE IF NOT EXISTS sdr_actions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id   UUID REFERENCES sdr_pipelines(id) ON DELETE CASCADE NOT NULL,
  lead_id       UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  step          INTEGER NOT NULL,
  agent         TEXT NOT NULL,            -- 'harbor', 'iris', 'oracle'
  action_type   TEXT NOT NULL,            -- 'qualify', 'enrich', 'draft_message', 'send_message', 'detect_interest'
  status        TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','sent','failed','skipped')),
  input         JSONB DEFAULT '{}',
  output        JSONB DEFAULT '{}',       -- { message, score, enrichment_data, etc }
  approved_by   UUID REFERENCES profiles(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON sdr_actions (pipeline_id, step);
CREATE INDEX ON sdr_actions (lead_id);
CREATE INDEX ON sdr_actions (status) WHERE status = 'pending';

ALTER TABLE sdr_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdr_actions_auth" ON sdr_actions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Fontes de captação e seus tokens/configs
CREATE TABLE IF NOT EXISTS lead_sources (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  name          TEXT NOT NULL,            -- 'Formulário Site', 'ManyChat Instagram', etc
  type          TEXT NOT NULL             -- 'form', 'webhook', 'manual', 'outbound'
                  CHECK (type IN ('form','webhook','manual','outbound')),
  webhook_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  config        JSONB DEFAULT '{}',       -- { fields_map, default_stage, auto_sdr: true/false }
  is_active     BOOLEAN DEFAULT TRUE,
  leads_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON lead_sources (workspace_id);
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_sources_auth" ON lead_sources
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Enriquecimento de lead (separado de intelligence_snapshots que é por cliente)
CREATE TABLE IF NOT EXISTS lead_enrichments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  instagram_handle TEXT,
  instagram_followers INTEGER,
  instagram_posts_freq TEXT,              -- 'diário', 'semanal', 'raramente'
  instagram_content_type TEXT,            -- 'produto', 'serviço', 'educacional', 'misto'
  website_url   TEXT,
  website_summary TEXT,                   -- análise do site pelo IRIS
  niche_detected TEXT,                    -- nicho identificado automaticamente
  pain_points   TEXT[],                   -- dores prováveis identificadas pelo IRIS
  raw_data      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)
);

ALTER TABLE lead_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_enrichments_auth" ON lead_enrichments
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 4.2 — ALTER em tabelas existentes

```sql
-- Adicionar colunas na crm_leads para suporte SDR
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sdr_pipeline_id UUID REFERENCES sdr_pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_score SMALLINT; -- 0-10, avaliado pelo ORACLE na resposta
```

---

## 5. ARQUITETURA DO PIPELINE SDR

### Fluxo completo (6 etapas)

```
ENTRADA (qualquer canal)
  ↓
POST /api/sdr/intake  ← ponto único de entrada
  ↓
Cria crm_leads + sdr_pipelines (step=0)
  ↓
STEP 0 — HARBOR qualifica (automático, < 30s)
  → score 0–10 + temperatura + diagnóstico
  → salva em crm_scores
  → se score < 3: move para 'Frio', encerra pipeline
  ↓
STEP 1 — IRIS enriquece (automático, 1–2min)
  → busca Instagram + site do lead via Apify
  → salva em lead_enrichments
  → atualiza crm_leads.enriched_at
  ↓
STEP 2 — ORACLE gera mensagem de primeiro contato (automático)
  → usa score + enriquecimento + DNA da agência
  → salva em sdr_actions (status: 'pending')
  → notifica usuário para aprovar
  → usuário aprova/edita com 1 clique → dispara
  ↓
STEP 3 — Aguarda resposta (D0 → D+2)
  → Cron a cada 1h verifica respostas
  → Sem resposta em 48h → ORACLE gera follow-up 1
  → Com resposta → ORACLE detecta interesse (0–10)
  → Interesse ≥ 6 → notifica usuário + status 'waiting_human'
  ↓
STEP 4 — Follow-up 2 se necessário (D+2 → D+5)
  → Sem resposta → nova abordagem, ângulo diferente
  → Limite: 3 contatos. Sem resposta → 'dead'
  ↓
HANDOFF HUMANO
  → Usuário assume a conversa
  → Sistema gera briefing da reunião via NEXUS
  → Sistema gera proposta via VANCE quando pedido
  → Lead convertido em cliente com 1 clique
```

---

## 6. ROTAS DE API

```
POST /api/sdr/intake                    ← entrada unificada de leads (formulário, webhook, manual)
POST /api/sdr/intake/webhook/[token]    ← endpoint público para ManyChat, Zapier, etc
GET  /api/sdr/pipeline/[lead_id]        ← status do pipeline de um lead
POST /api/sdr/action/[action_id]/approve ← aprovar mensagem gerada pelo ORACLE
POST /api/sdr/action/[action_id]/edit   ← editar e aprovar mensagem
GET  /api/sdr/actions/pending           ← listar ações aguardando aprovação
POST /api/sdr/pipeline/[lead_id]/pause  ← pausar pipeline de um lead
POST /api/sdr/pipeline/[lead_id]/resume ← retomar pipeline
POST /api/sdr/outbound/prospect         ← disparar prospecção ativa por nicho (IRIS + ORACLE)
GET  /api/cron/sdr-runner               ← cron horário: executa próximas ações agendadas
```

### Rota pública de formulário
```
GET  /captacao                          ← página pública de captação (sem auth)
POST /api/sdr/intake/form               ← submit do formulário público
```

---

## 7. AGENTES E SEUS PAPÉIS NO SDR

### HARBOR — Qualificador
```
System prompt adicional para modo SDR:
"Você está qualificando um prospect para uma agência de marketing digital.
Avalie o fit com base em: tipo de negócio, porte aparente, necessidade de marketing,
capacidade de investimento estimada, urgência. Score 0–10 com justificativa em 1 frase."

Input: { name, company, niche, notes, source }
Output JSON: { score, temperature: 'hot|warm|cold', diagnosis, recommended_channel }
```

### IRIS — Enriquecedor de leads
```
Caso de uso NOVO (hoje só enriquece clientes/concorrentes):
- Input: { name, company, instagram_handle?, website? }
- Apify: Instagram scraper se @ disponível
- Apify: Website Content Crawler se URL disponível
- Google Maps: se endereço disponível
- Output: lead_enrichment completo

System prompt:
"Analise os dados coletados do prospect e identifique:
1. Nicho real do negócio
2. Presença digital atual (forte/média/fraca)
3. 3 dores prováveis de marketing que ele tem
4. Momento de compra estimado (imediato/médio prazo/longo prazo)
Seja específico. Use os dados coletados — não invente."
```

### ORACLE — Modo SDR
```
Prompt especializado para primeiro contato:
- NÃO é o ORACLE de gestão de jobs — é um modo específico
- Recebe: DNA da agência + score + enriquecimento + canal
- Gera mensagem que:
  • Menciona algo específico do negócio do prospect (não genérico)
  • Apresenta 1 problema relevante que o prospect provavelmente tem
  • Faz 1 pergunta aberta (não pitch de vendas)
  • Tom: direto, humano, sem "espero que esta mensagem te encontre bem"
  • WhatsApp: máximo 3 parágrafos curtos
  • E-mail: máximo 5 linhas

Follow-up 1 (D+2): ângulo diferente — case ou resultado
Follow-up 2 (D+5): pergunta direta — "faz sentido falarmos?"

Detecção de interesse na resposta:
- Analisa resposta do prospect
- Score de interesse 0–10
- ≥ 6: "interesse detectado" → notifica usuário
- < 6: "resposta fria" → continua sequência ou encerra
```

### NEXUS — Preparação de reunião
```
Quando lead confirma reunião:
- Input: histórico completo do lead + enriquecimento
- Output: briefing de reunião com
  • Resumo do prospect (3 bullets)
  • Dores identificadas pelo IRIS
  • Perguntas sugeridas para a call
  • Objeções prováveis e como responder
  • Serviços recomendados para propor
```

---

## 8. FORMULÁRIO PÚBLICO /captacao

### Campos mínimos (v1)
```typescript
interface CaptacaoForm {
  name: string          // obrigatório
  whatsapp: string      // obrigatório — principal canal BR
  company?: string      // opcional
  instagram?: string    // opcional — para enriquecimento
  niche?: string        // dropdown: e-commerce, serviços locais, saúde, educação, outro
  pain?: string         // como chegou e o que precisa (textarea livre)
  source_token: string  // identificador da fonte (qual campanha/canal)
}
```

### Comportamento após submit
```
1. Mostra "Recebemos! Em breve entramos em contato" 
2. POST /api/sdr/intake → pipeline SDR inicia automaticamente
3. Não redireciona para o dashboard — é página pública
4. Tracking: UTM params salvos em lead_sources.config
```

---

## 9. PAINEL SDR NO DASHBOARD

### Nova seção em /crm — aba "SDR"

```
┌─────────────────────────────────────────────────────────┐
│ SDR Autônomo                         [+ Prospectar]     │
├──────────────┬──────────────┬────────────┬──────────────┤
│ Aguardando   │ Em contato   │ Interesse  │ Convertidos  │
│ aprovação    │              │ detectado  │ este mês     │
│      3       │      8       │     2      │      1       │
└──────────────┴──────────────┴────────────┴──────────────┘

AÇÕES PENDENTES (requerem sua aprovação)
─────────────────────────────────────────
[Lead: João Silva | Academia Fitness | Score: 8/10 | WhatsApp]
"Olá João, vi que a Academia Fitness está crescendo..."
[Aprovar e enviar] [Editar] [Pular]

[Lead: Maria Costa | Clínica Estética | Score: 7/10 | E-mail]
"Maria, identificamos que clínicas no seu segmento..."
[Aprovar e enviar] [Editar] [Pular]
```

### Componentes necessários
```
components/sdr/
├── SDRDashboard.tsx       ← visão geral com métricas
├── PendingActions.tsx     ← ações aguardando aprovação
├── SDRPipelineCard.tsx    ← card de lead no pipeline
├── LeadEnrichmentView.tsx ← dados do IRIS sobre o lead
├── MessageApproval.tsx    ← modal de aprovação/edição
├── OutboundProspector.tsx ← interface para prospecção ativa
└── SDRMetrics.tsx         ← conversão por etapa, fonte, etc
```

---

## 10. CRON SDR-RUNNER

### Lógica do cron (roda a cada 1 hora)

```typescript
// GET /api/cron/sdr-runner
// 1. Busca pipelines com next_action_at <= NOW() e status = 'running'
// 2. Para cada pipeline:
//    a. Identifica o step atual
//    b. Executa a ação correspondente:
//       step 0: chamar HARBOR
//       step 1: chamar IRIS + Apify
//       step 2: ORACLE gera mensagem → sdr_action pending → notifica
//       step 3: verificar se houve resposta → detectar interesse
//       step 4: ORACLE gera follow-up 1 → sdr_action pending
//       step 5: ORACLE gera follow-up 2 → sdr_action pending
//    c. Avança step ou encerra pipeline
//    d. Define next_action_at para próxima ação
// 3. Notifica usuário sobre ações pendentes acumuladas
```

---

## 11. PROSPECÇÃO ATIVA (OUTBOUND)

Fase posterior ao SDR inbound funcionando.
O usuário define:
- Nicho alvo (ex: "clínicas de estética em Salvador")
- Volume (ex: 20 prospects/semana)
- IRIS busca no Google Maps/Instagram empresas do nicho
- HARBOR qualifica cada uma antes de contatar
- ORACLE aborda apenas as com score ≥ 6
- Requer aprovação humana antes de disparar (sem exceção)

```
POST /api/sdr/outbound/prospect
Body: { niche, location, volume, min_score }
→ Cria batch de prospects
→ IRIS enriquece cada um assincronamente
→ HARBOR qualifica
→ Leads qualificados aparecem em "Aguardando aprovação de abordagem"
```

---

## 12. O QUE NÃO ENTRA NESTA FASE

```
❌ WhatsApp Business API autônoma (requer aprovação Meta — usar aprovação humana v1)
❌ Instagram DM automático direto (Graph API tem restrições severas)
❌ Ligação telefônica automática (VOX/Fase 8)
❌ A/B test de mensagens automatizado
❌ Integração com LinkedIn
❌ Prospecção ativa automática sem aprovação humana
```

---

## 13. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Já existem:
OPENROUTER_API_KEY     # ORACLE, HARBOR, IRIS
APIFY_API_KEY          # Enriquecimento via Apify
RESEND_API_KEY         # Follow-up por e-mail

# Novas (opcionais por canal):
TWILIO_ACCOUNT_SID     # WhatsApp via Twilio (já na Fase 3)
TWILIO_AUTH_TOKEN      # WhatsApp via Twilio
TWILIO_WHATSAPP_FROM   # Número WhatsApp Business
```

