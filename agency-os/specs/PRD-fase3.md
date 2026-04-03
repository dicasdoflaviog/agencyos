# PRD — Agency OS | Fase 3
> Product Requirements Document · Maio 2026

---

## 1. CONTEXTO

### 1.1 O que foi entregue nas Fases 1 e 2

#### Fase 1 — Núcleo Operacional

A Fase 1 estabeleceu a fundação do produto:

- **Auth:** Supabase Auth com email/password, RLS por role (`admin` / `collaborator`)
- **Clientes:** CRUD completo — cadastro, edição, lista com status, upload de logo via Supabase Storage
- **Jobs:** Kanban de 4 colunas (backlog → em andamento → revisão → concluído), CRUD com detalhe
- **Agentes IA (21):** Selector + chat com cada agente via Anthropic API (`claude-sonnet-4-5`) + outputs salvos na tabela `job_outputs`
- **Galeria:** Grid de outputs aprovados com filtro por cliente
- **Financeiro:** MRR total + tabela de contratos por cliente
- **Stack:** Next.js 14, TypeScript, Tailwind CSS v3 + shadcn/ui, Supabase (Postgres + RLS + Auth + Storage), Anthropic API, Vercel

#### Fase 2 — Qualidade, Rastreabilidade e Automação

A Fase 2 adicionou profundidade operacional:

- **Bloco A — Briefing Estruturado:** Formulário por job com campos específicos por tipo de conteúdo (`post`, `reel`, `stories`, `email`, `video`, `blog`, `ad`). Briefing injetado automaticamente no contexto de todos os agentes do job.
- **Bloco B — Pipeline de Aprovação Formal:** Estágios `draft → internal_review → client_review → approved → published → rejected` na tabela `job_outputs`. Tabela `output_approval_events` com audit trail completo (quem aprovou, quando, notas).
- **Bloco C — Analytics Dashboard:** `/analytics` com MRR, total de outputs, taxa de aprovação, top agentes, jobs por status. `/analytics/[clientId]` com métricas por cliente.
- **Bloco D — Multi-Agent Pipelines:** Tabelas `agent_pipelines` + `pipeline_runs`. Execução sequencial de agentes em cadeia para jobs recorrentes.
- **Bloco E — Infraestrutura Complementar:** Notificações in-app (bell icon), templates de jobs, anexos de arquivos via Supabase Storage.

#### Stack atual ao fim da Fase 2

```
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui
Supabase (Postgres + Auth + Storage + RLS + Realtime disponível)
Anthropic API (claude-sonnet-4-6)
Vercel (deploy contínuo)
```

---

### 1.2 Por que a Fase 3 é necessária

Com as Fases 1 e 2, a agência tem uma operação interna funcional: os colaboradores criam jobs com briefing, acionam agentes, seguem o pipeline de aprovação e visualizam analytics. **O que ainda falta é a conexão com o mundo externo.**

Cinco lacunas críticas impedem a escala do negócio:

1. **Loop de aprovação manual com clientes:** Hoje, para o cliente aprovar um output, um colaborador precisa exportar o conteúdo (WhatsApp, e-mail, PDF manual) e aguardar resposta fora do sistema. Isso cria atrito, perde rastreabilidade e atrasa o pipeline de `client_review → approved`.

2. **Operações distribuídas sem tempo real:** Quando múltiplos colaboradores trabalham simultaneamente, o kanban não se atualiza — cada um vê uma versão desatualizada. Não há presença, não há live updates.

3. **Ausência de automação de comunicação:** Notificações de atraso de jobs, envio de outputs para aprovação, relatórios mensais — tudo é feito manualmente. Isso é insustentável à medida que a carteira de clientes cresce.

4. **Sem integração com as plataformas onde o trabalho existe:** A agência produz conteúdo para Instagram, Facebook Ads e WhatsApp, mas o sistema não sabe nada sobre o desempenho pós-publicação. Não há ciclo de feedback para os agentes.

5. **Pipeline comercial desconectado da operação:** Novos clientes passam por uma jornada de prospecção que existe em planilhas separadas. Não há visibilidade de conversão nem vínculo entre leads e clientes cadastrados.

A Fase 3 resolve essas cinco lacunas entregando: **Portal do Cliente**, **Colaboração em Tempo Real**, **Automação Avançada**, **Integrações Externas**, **CRM de Leads**, **Relatórios Exportáveis** e **Versionamento de Outputs**.

---

## 2. OBJETIVOS DA FASE 3

| # | Objetivo | Métrica de sucesso |
|---|----------|--------------------|
| O1 | Eliminar o loop de aprovação fora do sistema através de um portal dedicado para clientes | 100% das aprovações de `client_review` feitas dentro da plataforma; tempo médio de aprovação reduzido em 40% |
| O2 | Habilitar colaboração em tempo real entre colaboradores da agência no dashboard | Latência de update no kanban < 500ms para múltiplos usuários simultâneos; presença visível |
| O3 | Automatizar comunicações recorrentes (atraso de job, outputs prontos, relatórios mensais) | Zero notificações manuais para tarefas cobertas por automação; ≥90% de deliverability de e-mail |
| O4 | Conectar a plataforma às APIs das redes sociais e campanhas pagas para fechar o ciclo de feedback | Métricas de Instagram e Meta Ads visíveis no `/analytics/[clientId]` sem exportação manual |
| O5 | Gerar e compartilhar relatórios de performance por cliente em PDF/Excel | Relatórios gerados em < 30 segundos; link compartilhável com expiração configurável |
| O6 | Estruturar o pipeline comercial da agência dentro da plataforma com CRM de leads | 100% dos prospects rastreados no sistema; taxa de conversão visível no dashboard |
| O7 | Manter histórico completo de revisões de outputs com capacidade de rollback | Toda edição de conteúdo registrada; rollback disponível para qualquer versão anterior |

---

## 3. FUNCIONALIDADES — PRIORIDADE

---

### BLOCO A: Portal do Cliente ⚡ PRIORIDADE ALTA

**Descrição**

O Portal do Cliente é um ambiente separado dentro da Agency OS onde clientes externos podem fazer login (via magic link ou senha) e visualizar apenas os outputs produzidos para eles. O cliente **não acessa** o dashboard interno — ele vê apenas uma interface simplificada de revisão e aprovação.

**Motivação**

O gargalo mais crítico da operação atual é o loop de aprovação fora do sistema. Um output produzido pelo agente fica em `client_review` esperando o cliente responder um WhatsApp ou e-mail. A resposta volta para um colaborador, que manualmente muda o estágio. Isso introduz erro humano, atrasa entregas e não é rastreável.

Com o Portal, o cliente recebe um link de convite, faz login, vê todos os outputs em `client_review` da conta dele, adiciona notas e aprova ou solicita revisão — tudo dentro do sistema, com audit trail automático.

**Usuário alvo:** Cliente externo da agência (não é colaborador nem admin)

**Regras de acesso:**
- Role: `client` na tabela `profiles`
- Campo `client_id` em `profiles` vincula o usuário ao cliente
- RLS: cliente só vê `job_outputs` onde `client_id = profiles.client_id` e `approval_stage IN ('client_review', 'approved', 'published')`
- Cliente NÃO pode criar, editar ou deletar outputs — apenas aprovar ou solicitar revisão

**Fluxo de onboarding:**
1. Admin cria convite: `POST /api/client-portal/invite` — insere em `client_invites` e dispara magic link via Supabase Auth
2. Cliente recebe e-mail com link de acesso
3. Ao clicar, Supabase autentica e redireciona para `/client/outputs`
4. Profile é criado com `role='client'` e `client_id` vinculado

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/client` | Redirect | Redireciona para `/client/outputs` |
| `/client/outputs` | Page | Lista de outputs do cliente em `client_review` + `approved` + `published` |
| `/client/outputs/[id]` | Page | Detalhe do output com visualização + botões aprovar/solicitar revisão |
| `/client/login` | Page | Página de login para clientes (email magic link) |
| `/api/client-portal/invite` | API Route | POST — admin cria convite para cliente |
| `/api/outputs/[id]/approve` | API Route | POST — cliente aprova ou solicita revisão (mesmo endpoint do interno) |

**Componentes**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `ClientLayout` | `app/(client)/layout.tsx` | Layout isolado sem sidebar do dashboard interno; header com logo da agência + nome do cliente |
| `ClientOutputList` | `components/client-portal/ClientOutputList.tsx` | Grid de cards de outputs com filtros por estágio |
| `ClientOutputCard` | `components/client-portal/ClientOutputCard.tsx` | Card com preview do conteúdo, agente que gerou, job vinculado |
| `ClientOutputDetail` | `components/client-portal/ClientOutputDetail.tsx` | Visualização completa do conteúdo + formulário de feedback |
| `ClientApproveForm` | `components/client-portal/ClientApproveForm.tsx` | Formulário com radio (aprovar / solicitar revisão) + textarea de notas |
| `ClientInviteDialog` | `components/client-portal/ClientInviteDialog.tsx` | Modal no dashboard interno para admin convidar cliente |
| `ClientPortalGuard` | `components/client-portal/ClientPortalGuard.tsx` | Middleware de proteção de rota para role='client' |

---

### BLOCO B: Integrações Externas 🔗 PRIORIDADE MÉDIA-ALTA

**Descrição**

Conectar a Agency OS com as APIs das plataformas onde o trabalho do cliente vive: Instagram (publicação e insights), Meta Ads (métricas de campanhas) e WhatsApp Business (notificações e aprovações por mensagem).

#### B.1 — WhatsApp Business API

**Provedor:** Twilio WhatsApp Business API (ou direct Meta WABA para alto volume)

**Casos de uso:**
- Notificar cliente quando um output entra em `client_review` com link para o Portal
- Receber aprovação/rejeição via resposta de mensagem (webhook)
- Alertas de jobs atrasados para o manager do cliente

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/api/integrations/whatsapp/send` | POST | Enviar mensagem via Twilio |
| `/api/integrations/whatsapp/webhook` | POST | Receber status de entrega + respostas do cliente |
| `/settings/integrations/whatsapp` | Page | Configuração do número, templates, mapeamento cliente ↔ número |

**Tabelas:**
- `integration_configs` — tokens e configurações por cliente/tipo
- `whatsapp_messages` — log de mensagens enviadas e recebidas

#### B.2 — Instagram Graph API

**Casos de uso:**
- Agendar publicação de outputs aprovados diretamente na conta do cliente
- Puxar insights de posts (impressões, alcance, engajamento) de volta para o analytics

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/api/integrations/instagram/auth` | GET | OAuth flow — Instagram Business Login |
| `/api/integrations/instagram/callback` | GET | Callback OAuth, salva token |
| `/api/integrations/instagram/schedule` | POST | Agendar publicação de output |
| `/api/integrations/instagram/insights/[postId]` | GET | Buscar insights de post específico |
| `/settings/integrations/instagram` | Page | Conectar conta Instagram do cliente |

**Tabelas:**
- `scheduled_posts` — posts agendados com `publish_at` e `status`
- `post_insights` — métricas por post puxadas da API

#### B.3 — Meta Ads API

**Casos de uso:**
- Puxar métricas de campanhas ativas do cliente (impressões, cliques, CTR, CPC, gasto)
- Exibir no `/analytics/[clientId]` ao lado dos outputs

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/api/integrations/meta-ads/sync/[clientId]` | POST | Sincronizar métricas de campanhas do cliente |
| `/api/integrations/meta-ads/campaigns/[clientId]` | GET | Listar campanhas ativas com métricas |

**Tabelas:**
- `meta_campaigns` — campanhas sincronizadas com métricas

---

### BLOCO C: Relatórios e Exportação 📊 PRIORIDADE MÉDIA

**Descrição**

Geração de relatórios de performance por cliente em PDF e Excel, com histórico de outputs, timeline de aprovações, uso de agentes e métricas de ROI. Links compartilháveis com expiração configurável para enviar ao cliente sem necessidade de login.

**Relatório mensal automático:** Gerado no primeiro dia de cada mês via Vercel Cron Job (Bloco F), enviado por e-mail ao admin e, opcionalmente, ao cliente.

**Estrutura do relatório PDF:**
1. Capa: logo do cliente + período + logo da agência
2. Resumo executivo: total de outputs, aprovados, publicados, rejeitados
3. Timeline de aprovações por output (gantt simplificado)
4. Uso de agentes IA: quais agentes foram mais utilizados, outputs gerados
5. Métricas de Instagram (se integrado): top posts do período
6. Métricas de Meta Ads (se integrado): gasto total, CTR médio, conversões

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/reports` | Page | Lista de relatórios gerados (todos os clientes, admin only) |
| `/reports/[clientId]` | Page | Relatórios de um cliente específico |
| `/reports/[clientId]/new` | Page | Configurar e gerar novo relatório |
| `/r/[token]` | Page | Link público compartilhável (sem auth) |
| `/api/reports/generate` | POST | Gerar PDF ou Excel — retorna URL do arquivo |
| `/api/reports/[id]/share` | POST | Criar link compartilhável com expiração |

**Componentes**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `ReportBuilder` | `components/reports/ReportBuilder.tsx` | Configurar período, seções incluídas, formato |
| `ReportPreview` | `components/reports/ReportPreview.tsx` | Preview do relatório antes de exportar |
| `ReportCard` | `components/reports/ReportCard.tsx` | Card de relatório gerado com link de download |
| `PDFTemplate` | `components/reports/PDFTemplate.tsx` | Template React para react-pdf |
| `ReportShareDialog` | `components/reports/ReportShareDialog.tsx` | Modal para gerar link compartilhável |

**Bibliotecas:** `@react-pdf/renderer` para PDF, `exceljs` para Excel.

**Tabelas:**
- `reports` — metadados do relatório gerado
- `report_shares` — links compartilháveis com token + expiração

---

### BLOCO D: Colaboração em Tempo Real ⚡ PRIORIDADE MÉDIA

**Descrição**

Habilitar Supabase Realtime em tabelas críticas para que múltiplos colaboradores vejam o kanban, as notificações e o feed de atividade atualizados em tempo real — sem necessidade de refresh manual.

**Tabelas com Realtime habilitado:**
- `jobs` — atualização ao vivo no kanban (drag-drop sincronizado)
- `job_outputs` — mudanças de estágio de aprovação ao vivo
- `notifications` — entrega instantânea de notificações
- `pipeline_runs` — progresso de pipelines ao vivo

**Funcionalidades**

| Feature | Descrição |
|---------|-----------|
| **Live Kanban** | Quando colaborador A move job de coluna, colaborador B vê a mudança em < 500ms |
| **Live Notifications** | Bell icon atualiza badge em tempo real quando nova notificação chega |
| **Presence Indicators** | Avatares mostram quais usuários estão visualizando o mesmo job |
| **Live Output Stage** | Badge de estágio de aprovação atualiza ao vivo quando muda |
| **Pipeline Progress** | Barra de progresso de pipeline_runs atualiza enquanto executa |

**Rotas afetadas**

| Rota | Feature adicionada |
|------|--------------------|
| `/jobs` | Live kanban + presence |
| `/jobs/[id]` | Live stage badge + comentários ao vivo |
| `/jobs/[id]/outputs` | Live approval stage |
| `(notificações)` | Live bell badge |

**Componentes**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `useRealtimeJobs` | `hooks/useRealtimeJobs.ts` | Hook para canal Realtime de `jobs` |
| `useRealtimeOutputs` | `hooks/useRealtimeOutputs.ts` | Hook para canal Realtime de `job_outputs` |
| `useRealtimeNotifications` | `hooks/useRealtimeNotifications.ts` | Hook para canal Realtime de `notifications` |
| `PresenceAvatars` | `components/realtime/PresenceAvatars.tsx` | Mostra avatares de usuários presentes na página |
| `LiveBadge` | `components/realtime/LiveBadge.tsx` | Badge animado indicando atualização ao vivo |

---

### BLOCO E: CRM de Leads 🤝 PRIORIDADE MÉDIA

**Descrição**

Pipeline comercial integrado para rastrear prospects desde o primeiro contato até a assinatura do contrato. Quando um lead é convertido (`won`), pode ser transformado em cliente com um clique.

**Estágios do pipeline:**

```
prospect → contacted → proposal_sent → negotiation → won / lost
```

**Métricas do CRM:**
- Total de leads por estágio
- Taxa de conversão por estágio
- Tempo médio em cada estágio
- Receita projetada (soma dos `deal_value` dos leads em negociação + won)
- Leads por responsável

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/crm` | Page | Dashboard do pipeline Kanban de leads |
| `/crm/leads/[id]` | Page | Detalhe do lead com histórico de atividades |
| `/crm/leads/new` | Page | Criar novo lead |
| `/crm/leads/[id]/edit` | Page | Editar lead |
| `/crm/leads/[id]/convert` | Page | Converter lead em cliente Agency OS |
| `/api/crm/leads` | GET/POST | Listar + criar leads |
| `/api/crm/leads/[id]` | GET/PUT/DELETE | Operações individuais |
| `/api/crm/leads/[id]/activities` | GET/POST | Histórico de atividades |
| `/api/crm/leads/[id]/convert` | POST | Converter em cliente |

**Componentes**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `CRMKanban` | `components/crm/CRMKanban.tsx` | Kanban de leads por estágio com drag-and-drop |
| `LeadCard` | `components/crm/LeadCard.tsx` | Card do lead com valor, responsável, última atividade |
| `LeadDetail` | `components/crm/LeadDetail.tsx` | Detalhe com informações completas + timeline |
| `LeadForm` | `components/crm/LeadForm.tsx` | Formulário de criação/edição de lead |
| `ActivityFeed` | `components/crm/ActivityFeed.tsx` | Timeline de atividades do lead |
| `ActivityForm` | `components/crm/ActivityForm.tsx` | Registrar nova atividade (call, email, meeting, note) |
| `ConvertLeadDialog` | `components/crm/ConvertLeadDialog.tsx` | Modal para converter lead em cliente |
| `CRMMetricsBar` | `components/crm/CRMMetricsBar.tsx` | Barra de métricas no topo do CRM |
| `LeadTagSelector` | `components/crm/LeadTagSelector.tsx` | Seletor de tags para categorizar leads |

**Tabelas:**
- `leads` — dados do lead
- `lead_activities` — log de atividades
- `lead_tags` — tags disponíveis
- `lead_tag_assignments` — N:N entre leads e tags

---

### BLOCO F: Automação Avançada ⚙️ PRIORIDADE MÉDIA-BAIXA

**Descrição**

Combinar Vercel Cron Jobs com Resend (e-mail transacional) para automatizar comunicações e tarefas recorrentes que hoje são feitas manualmente.

#### F.1 — E-mail Transacional (Resend)

**Triggers de e-mail:**

| Evento | Destinatário | Template |
|--------|-------------|----------|
| Output entra em `client_review` | Cliente (via Portal) | "Você tem um conteúdo para aprovar" |
| Output aprovado pelo cliente | Colaborador responsável | "Output aprovado pelo cliente" |
| Output com revisão solicitada | Colaborador responsável | "Cliente solicitou revisão" |
| Job com atraso (due_date < hoje + status != done) | Admin + responsável | "Job atrasado: {job.title}" |
| Pipeline concluído | Admin | "Pipeline executado com sucesso" |
| Convite para Portal do Cliente | Cliente | "Você foi convidado para o portal" |
| Relatório mensal gerado | Admin | "Relatório de {client.name} - {mês}" |

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/api/email/send` | POST | Enviar e-mail via Resend (uso interno) |
| `/api/email/templates` | GET | Listar templates disponíveis |

#### F.2 — Vercel Cron Jobs

**Jobs agendados:**

| Cron | Horário | Ação |
|------|---------|------|
| `check-overdue-jobs` | Todo dia às 09:00 | Busca jobs com `due_date < HOJE` e status != `done`, cria notifications + envia e-mails |
| `send-pending-approvals` | Todo dia às 10:00 | Busca outputs em `client_review` há mais de 48h sem mudança, reenvia lembrete ao cliente |
| `generate-monthly-reports` | Dia 1 de cada mês às 08:00 | Gera relatório PDF de todos os clientes ativos, envia por e-mail ao admin |
| `pipeline-health-check` | Todo dia às 07:00 | Verifica `pipeline_runs` em `running` há mais de 1h e marca como `failed` |
| `cleanup-expired-shares` | Todo domingo às 03:00 | Deleta `report_shares` expiradas |

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/api/cron/check-overdue-jobs` | GET | Executado pelo Vercel Cron |
| `/api/cron/send-pending-approvals` | GET | Executado pelo Vercel Cron |
| `/api/cron/generate-monthly-reports` | GET | Executado pelo Vercel Cron |
| `/api/cron/pipeline-health-check` | GET | Executado pelo Vercel Cron |
| `/api/cron/cleanup-expired-shares` | GET | Executado pelo Vercel Cron |

**Tabelas:**
- `email_logs` — log de todos os e-mails enviados
- `automation_rules` — regras configuráveis de automação (trigger → ação)

---

### BLOCO G: Output Versioning 📝 PRIORIDADE BAIXA

**Descrição**

Cada vez que o conteúdo de um `job_output` é editado (por colaborador ou pelo agente após solicitação de revisão), uma nova versão é criada na tabela `output_versions`. A versão atual continua em `job_outputs.content`, mas o histórico completo fica disponível. Admin ou colaborador pode fazer rollback para qualquer versão anterior.

**Lógica de versionamento:**
- A coluna `output_version` já existe em `job_outputs` (adicionada na Fase 2)
- A cada update em `job_outputs.content`, um trigger insere o conteúdo anterior em `output_versions`
- A versão N está em `output_versions`, a versão mais recente fica em `job_outputs`

**Funcionalidades:**
- Histórico de versões no detalhe do output
- Diff visual entre versão atual e qualquer versão anterior (biblioteca `diff`)
- Rollback: substituir conteúdo atual pelo de qualquer versão anterior
- Autor e timestamp em cada versão

**Rotas**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/jobs/[id]/outputs/[outputId]/versions` | Page | Histórico de versões |
| `/api/outputs/[id]/versions` | GET | Listar versões |
| `/api/outputs/[id]/versions/[versionId]/rollback` | POST | Fazer rollback para versão |

**Componentes**

| Componente | Localização | Responsabilidade |
|------------|-------------|------------------|
| `VersionHistory` | `components/outputs/VersionHistory.tsx` | Lista de versões com autor e timestamp |
| `VersionDiff` | `components/outputs/VersionDiff.tsx` | Diff visual entre duas versões |
| `RollbackDialog` | `components/outputs/RollbackDialog.tsx` | Confirmação de rollback |

---

## 4. DATABASE CHANGES

### 4.1 Resumo das tabelas novas

| Tabela | Bloco | Descrição |
|--------|-------|-----------|
| `client_invites` | A | Convites para Portal do Cliente |
| `integration_configs` | B | Configurações de integrações por cliente |
| `whatsapp_messages` | B | Log de mensagens WhatsApp |
| `scheduled_posts` | B | Posts agendados para Instagram/Facebook |
| `post_insights` | B | Métricas de posts das redes sociais |
| `meta_campaigns` | B | Campanhas Meta Ads sincronizadas |
| `reports` | C | Relatórios gerados |
| `report_shares` | C | Links compartilháveis de relatórios |
| `leads` | E | Pipeline de leads do CRM |
| `lead_activities` | E | Histórico de atividades por lead |
| `lead_tags` | E | Tags para leads |
| `lead_tag_assignments` | E | N:N leads ↔ tags |
| `email_logs` | F | Log de e-mails enviados |
| `automation_rules` | F | Regras de automação configuráveis |
| `output_versions` | G | Histórico de versões de outputs |

### 4.2 Alterações em tabelas existentes

| Tabela | Coluna adicionada | Tipo | Descrição |
|--------|-------------------|------|-----------|
| `profiles` | `client_id` | UUID FK → clients | Vínculo do usuário cliente ao cliente da agência |
| `profiles` | `phone` | TEXT | Número WhatsApp do usuário/cliente |
| `notifications` | `channels` | TEXT[] | Canais de entrega: `['in_app', 'email', 'whatsapp']` |
| `notifications` | `sent_at` | TIMESTAMPTZ | Timestamp do envio externo |

### 4.3 SQL Completo — Migration Fase 3

```sql
-- ============================================================
-- Agency OS — Migration Fase 3
-- Execute no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ALTERAÇÕES EM TABELAS EXISTENTES
-- ============================================================

-- profiles: suporte a role='client'
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'collaborator', 'client'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone     TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- notifications: suporte a canais externos
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS channels TEXT[]       DEFAULT ARRAY['in_app'],
  ADD COLUMN IF NOT EXISTS sent_at  TIMESTAMPTZ;

-- ============================================================
-- BLOCO A: Portal do Cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS client_invites (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  email        TEXT NOT NULL,
  invited_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client invites" ON client_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'collaborator')
    )
  );

CREATE INDEX IF NOT EXISTS idx_client_invites_email     ON client_invites(email);
CREATE INDEX IF NOT EXISTS idx_client_invites_client_id ON client_invites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invites_token     ON client_invites(token);

-- RLS para clientes na tabela job_outputs
-- Clientes só veem seus próprios outputs em estágios adequados
DROP POLICY IF EXISTS "Clients view own outputs" ON job_outputs;

CREATE POLICY "Clients view own outputs" ON job_outputs
  FOR SELECT USING (
    -- usuários internos veem tudo
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'collaborator')
      )
    )
    OR
    -- clientes veem apenas seus outputs em estágios públicos
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'client'
          AND p.client_id = job_outputs.client_id
          AND job_outputs.approval_stage IN ('client_review', 'approved', 'published')
      )
    )
  );

-- Clientes podem inserir approval events (aprovar/rejeitar)
DROP POLICY IF EXISTS "Clients insert approval events" ON output_approval_events;

CREATE POLICY "Clients insert approval events" ON output_approval_events
  FOR INSERT WITH CHECK (
    -- usuários internos
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'collaborator')
    )
    OR
    -- clientes só podem aprovar/rejeitar seus próprios outputs
    (
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN job_outputs jo ON jo.client_id = p.client_id
        WHERE p.id = auth.uid()
          AND p.role = 'client'
          AND jo.id = output_approval_events.output_id
          AND output_approval_events.to_stage IN ('approved', 'rejected')
      )
    )
  );

-- Clientes veem apenas approval events dos seus outputs
DROP POLICY IF EXISTS "Clients view own approval events" ON output_approval_events;

CREATE POLICY "Clients view own approval events" ON output_approval_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'collaborator')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN job_outputs jo ON jo.client_id = p.client_id
      WHERE p.id = auth.uid()
        AND p.role = 'client'
        AND jo.id = output_approval_events.output_id
    )
  );

-- ============================================================
-- BLOCO B: Integrações Externas
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_configs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('whatsapp', 'instagram', 'meta_ads', 'google_analytics')),
  config       JSONB NOT NULL DEFAULT '{}',
  -- config contém: access_token, refresh_token, account_id, phone_number_id, etc.
  -- tokens são criptografados em nível de aplicação antes de salvar
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, type)
);

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage integration configs" ON integration_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'collaborator')
    )
  );

CREATE TRIGGER set_integration_configs_updated_at
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_integration_configs_client ON integration_configs(client_id, type);

-- WhatsApp Messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  direction    TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  to_number    TEXT,
  from_number  TEXT,
  message_body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'interactive')),
  template_name TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  twilio_sid   TEXT,
  output_id    UUID REFERENCES job_outputs(id) ON DELETE SET NULL,
  metadata     JSONB DEFAULT '{}',
  sent_at      TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage whatsapp messages" ON whatsapp_messages
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_client   ON whatsapp_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_output   ON whatsapp_messages(output_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_twilio   ON whatsapp_messages(twilio_sid);

-- Scheduled Posts (Instagram / Facebook)
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  output_id       UUID REFERENCES job_outputs(id) ON DELETE CASCADE NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'both')),
  caption         TEXT,
  media_urls      TEXT[] DEFAULT '{}',
  publish_at      TIMESTAMPTZ NOT NULL,
  published_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  platform_post_id TEXT,  -- ID do post na plataforma após publicação
  error_message   TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage scheduled posts" ON scheduled_posts
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_client     ON scheduled_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_publish_at ON scheduled_posts(publish_at)
  WHERE status = 'scheduled';

-- Post Insights (Instagram / Facebook)
CREATE TABLE IF NOT EXISTS post_insights (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  client_id        UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  platform_post_id TEXT NOT NULL,
  platform         TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  impressions      INTEGER DEFAULT 0,
  reach            INTEGER DEFAULT 0,
  likes            INTEGER DEFAULT 0,
  comments         INTEGER DEFAULT 0,
  shares           INTEGER DEFAULT 0,
  saves            INTEGER DEFAULT 0,
  engagement_rate  NUMERIC(5,2),
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view post insights" ON post_insights
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_post_insights_client ON post_insights(client_id, fetched_at DESC);

-- Meta Ads Campaigns
CREATE TABLE IF NOT EXISTS meta_campaigns (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id     TEXT NOT NULL,  -- ID na Meta
  campaign_name   TEXT NOT NULL,
  status          TEXT,
  objective       TEXT,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  spend           NUMERIC(12,2) DEFAULT 0,
  ctr             NUMERIC(5,4),   -- click-through rate decimal
  cpc             NUMERIC(10,2),
  conversions     INTEGER DEFAULT 0,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, campaign_id, period_start, period_end)
);

ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view meta campaigns" ON meta_campaigns
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_client ON meta_campaigns(client_id, period_end DESC);

-- ============================================================
-- BLOCO C: Relatórios e Exportação
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('monthly', 'custom', 'campaign')),
  format      TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'both')),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  file_url    TEXT,
  storage_path TEXT,
  sections    JSONB DEFAULT '[]',
  -- sections: [{type: 'summary'|'outputs'|'agents'|'instagram'|'meta_ads', enabled: true}]
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES profiles(id),
  error_message TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage reports" ON reports
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_reports_client ON reports(client_id, created_at DESC);

-- Report Shares (links públicos)
CREATE TABLE IF NOT EXISTS report_shares (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id  UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage report shares" ON report_shares
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Acesso público via token (sem auth)
CREATE POLICY "Public access to valid share links" ON report_shares
  FOR SELECT USING (
    expires_at IS NULL OR expires_at > NOW()
  );

CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(token);

-- ============================================================
-- BLOCO E: CRM de Leads
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  website         TEXT,
  niche           TEXT,
  stage           TEXT NOT NULL DEFAULT 'prospect'
    CHECK (stage IN ('prospect', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost')),
  deal_value      NUMERIC(12,2),
  lost_reason     TEXT,
  converted_to    UUID REFERENCES clients(id) ON DELETE SET NULL,
  -- preenchido quando lead é convertido em cliente
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source          TEXT CHECK (source IN ('referral', 'instagram', 'website', 'cold_outreach', 'event', 'other')),
  notes           TEXT,
  next_follow_up  DATE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage leads" ON leads
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leads_stage      ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned   ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_next_fu    ON leads(next_follow_up) WHERE stage NOT IN ('won','lost');

-- Lead Activities
CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'whatsapp', 'note', 'stage_change', 'proposal')),
  title       TEXT NOT NULL,
  description TEXT,
  outcome     TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage lead activities" ON lead_activities
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);

-- Lead Tags
CREATE TABLE IF NOT EXISTS lead_tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#6366F1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage lead tags" ON lead_tags
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Lead Tag Assignments (N:N)
CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  lead_id    UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES lead_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, tag_id)
);

ALTER TABLE lead_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage lead tag assignments" ON lead_tag_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================
-- BLOCO F: Automação — Email Logs + Automation Rules
-- ============================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email        TEXT NOT NULL,
  to_name         TEXT,
  subject         TEXT NOT NULL,
  template_name   TEXT,
  resend_id       TEXT,  -- ID do e-mail no Resend
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  related_type    TEXT,   -- 'output', 'job', 'report', 'invite', etc.
  related_id      UUID,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view email logs" ON email_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_logs_created  ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_related  ON email_logs(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status   ON email_logs(status);

-- Automation Rules (configuráveis)
CREATE TABLE IF NOT EXISTS automation_rules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'output_stage_changed', 'job_overdue', 'pipeline_completed',
    'lead_stage_changed', 'report_generated', 'scheduled'
  )),
  trigger_config JSONB DEFAULT '{}',
  action_type  TEXT NOT NULL CHECK (action_type IN (
    'send_email', 'send_whatsapp', 'create_notification',
    'create_lead_activity', 'trigger_pipeline'
  )),
  action_config JSONB DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation rules" ON automation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE TRIGGER set_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- BLOCO G: Output Versioning
-- ============================================================

CREATE TABLE IF NOT EXISTS output_versions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id      UUID REFERENCES job_outputs(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  content        TEXT NOT NULL,
  agent_id       TEXT,
  edited_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  edit_reason    TEXT,
  -- 'initial', 'revision', 'agent_regeneration', 'manual_edit'
  edit_type      TEXT NOT NULL DEFAULT 'manual_edit'
    CHECK (edit_type IN ('initial', 'revision', 'agent_regeneration', 'manual_edit')),
  approval_stage TEXT,
  -- estágio de aprovação no momento desta versão
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE output_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view output versions" ON output_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert output versions" ON output_versions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_output_versions_output   ON output_versions(output_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_output_versions_created  ON output_versions(created_at DESC);

-- Trigger: ao atualizar content em job_outputs, salva versão anterior
CREATE OR REPLACE FUNCTION save_output_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO output_versions (
      output_id, version_number, content, agent_id,
      edited_by, edit_type, approval_stage
    ) VALUES (
      OLD.id,
      OLD.output_version,
      OLD.content,
      OLD.agent_id,
      auth.uid(),
      CASE
        WHEN OLD.approval_stage = 'draft' THEN 'revision'
        ELSE 'manual_edit'
      END,
      OLD.approval_stage
    );
    NEW.output_version = OLD.output_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_save_output_version ON job_outputs;

CREATE TRIGGER trg_save_output_version
  BEFORE UPDATE ON job_outputs
  FOR EACH ROW EXECUTE FUNCTION save_output_version();

-- ============================================================
-- REALTIME: Habilitar nas tabelas críticas
-- ============================================================
-- Execute os comandos abaixo no Supabase Dashboard > Database > Replication
-- ou via SQL:

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE job_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

CREATE OR REPLACE VIEW client_portal_outputs AS
  SELECT
    jo.id,
    jo.job_id,
    jo.client_id,
    jo.agent_id,
    jo.content,
    jo.approval_stage,
    jo.output_version,
    jo.created_at,
    jo.updated_at,
    j.title   AS job_title,
    c.name    AS client_name,
    c.slug    AS client_slug,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'stage', oae.to_stage,
          'notes', oae.notes,
          'created_at', oae.created_at
        ) ORDER BY oae.created_at DESC
      )
      FROM output_approval_events oae
      WHERE oae.output_id = jo.id
    ) AS approval_history
  FROM job_outputs jo
  JOIN jobs j ON j.id = jo.job_id
  JOIN clients c ON c.id = jo.client_id
  WHERE jo.approval_stage IN ('client_review', 'approved', 'published');

-- View: CRM funnel metrics
CREATE OR REPLACE VIEW crm_funnel_metrics AS
  SELECT
    stage,
    COUNT(*)                          AS total_leads,
    SUM(deal_value)                   AS total_value,
    AVG(
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400
    )::INTEGER                        AS avg_days_in_stage
  FROM leads
  GROUP BY stage;

-- ============================================================
-- FIM DA MIGRATION FASE 3
-- ============================================================
```

---

## 5. STACK CHANGES

### 5.1 Novos pacotes npm

| Pacote | Versão | Bloco | Uso |
|--------|--------|-------|-----|
| `resend` | `^3.x` | F | E-mail transacional |
| `@react-pdf/renderer` | `^3.x` | C | Geração de PDF no servidor |
| `exceljs` | `^4.x` | C | Geração de Excel |
| `twilio` | `^5.x` | B | WhatsApp Business API |
| `diff` | `^5.x` | G | Diff de texto para versioning |
| `date-fns` | `^3.x` | F/C | Formatação e manipulação de datas |
| `@tanstack/react-table` | `^8.x` | E | Tabela do CRM com sorting/filtering |
| `react-dropzone` | `^14.x` | C/B | Upload de arquivos em relatórios |
| `recharts` | `^2.x` | C | Gráficos em relatórios PDF (se já não usado) |

### 5.2 Variáveis de ambiente novas

```env
# Resend (email transacional)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@agencyos.com.br
RESEND_FROM_NAME=Agency OS

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Meta / Instagram
META_APP_ID=xxxxxxxxx
META_APP_SECRET=xxxxxxxxx
META_VERIFY_TOKEN=xxxxxxxxx  # para verificação do webhook

# Vercel Cron (secret para proteção das rotas)
CRON_SECRET=xxxxxxxxx

# Supabase (já existentes, confirmar)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 5.3 Configuração Vercel

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue-jobs",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/send-pending-approvals",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/generate-monthly-reports",
      "schedule": "0 8 1 * *"
    },
    {
      "path": "/api/cron/pipeline-health-check",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/cleanup-expired-shares",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

### 5.4 Supabase features necessárias

| Feature | Status | Ação |
|---------|--------|------|
| Realtime | Disponível, não habilitado | Habilitar publicação nas tabelas críticas |
| Storage | Já ativo | Criar bucket `reports` (público read) |
| Edge Functions | Opcional | Alternativa para cron jobs pesados |
| Auth Magic Link | Disponível | Habilitar templates de e-mail para magic link |

---

## 6. FORA DO ESCOPO DA FASE 3

Os itens abaixo são conscientemente excluídos da Fase 3 para manter o escopo controlável:

| Item | Motivo da exclusão |
|------|--------------------|
| **Google Sheets sync** | Complexidade de OAuth + mapeamento bidirecional; baixa demanda |
| **Figma REST API** | Dependente de workflow de design definido; prematuro |
| **Real-time collaboration de conteúdo** (edição simultânea, tipo Google Docs) | Requer CRDT ou OT; escopo de produto separado |
| **Portal do cliente mobile app** | Derivado do Portal Web; necessita validação de demanda primeiro |
| **Relatórios automatizados para leads/CRM** | CRM é novo — primeiro ciclo manual, depois automatizar |
| **Inteligência de Meta Ads** (otimização automática de campanhas) | Requer modelos de ML; fora do escopo do produto |
| **Multi-tenant isolado** (múltiplas agências rodando Agency OS) | Requer refatoração arquitetural; Fase 4+ |
| **Gamificação / pontuação de agentes** | Feature nice-to-have sem demanda validada |

---

## 7. MVP DA FASE 3

O MVP da Fase 3 foca nos dois blocos de maior impacto no negócio imediato: **Portal do Cliente** (eliminar loop manual de aprovação) e **Automação de E-mail** (notificações proativas). Os demais blocos são iterações seguintes.

### MVP Mínimo (Fase 3.0)

**Entregar:**
- ✅ **Portal do Cliente** completo (Bloco A) — incluindo convite, auth, lista de outputs, aprovação/rejeição
- ✅ **E-mail transacional via Resend** para: convite do portal, output em `client_review`, aprovação/rejeição pelo cliente
- ✅ **Migration SQL** completa (todas as tabelas da Fase 3)
- ✅ **RLS atualizada** para suporte a `role='client'`

**Critérios de aceitação do MVP:**
1. Admin consegue convidar cliente pelo e-mail; cliente recebe magic link, faz login, vê seus outputs
2. Cliente consegue aprovar ou solicitar revisão com notas; colaborador recebe notificação in-app + e-mail
3. Outputs em `client_review` ficam bloqueados para publicação até o cliente aprovar
4. Zero acesso de cliente a dados de outros clientes (verificar via RLS test)

### Fase 3.1 — Relatórios + Realtime

- Relatórios PDF/Excel (Bloco C)
- Supabase Realtime no kanban (Bloco D)
- Presence indicators

### Fase 3.2 — CRM + Automação Avançada

- CRM de Leads completo (Bloco E)
- Vercel Cron Jobs (Bloco F)
- Output Versioning (Bloco G)

### Fase 3.3 — Integrações Externas

- WhatsApp Business API (Bloco B.1)
- Instagram Graph API (Bloco B.2)
- Meta Ads API (Bloco B.3)

---

## APÊNDICE A — Matriz de Prioridade × Esforço

| Bloco | Impacto | Esforço | Prioridade final |
|-------|---------|---------|-----------------|
| A — Portal do Cliente | 🔴 Alto | 🟡 Médio | ⚡ Fase 3.0 |
| F — E-mail (Resend) | 🔴 Alto | 🟢 Baixo | ⚡ Fase 3.0 |
| D — Realtime | 🟡 Médio | 🟡 Médio | 🔵 Fase 3.1 |
| C — Relatórios | 🟡 Médio | 🔴 Alto | 🔵 Fase 3.1 |
| E — CRM | 🟡 Médio | 🟡 Médio | 🟢 Fase 3.2 |
| F — Cron Jobs | 🟡 Médio | 🟢 Baixo | 🟢 Fase 3.2 |
| G — Versioning | 🟢 Baixo | 🟢 Baixo | 🟢 Fase 3.2 |
| B — WhatsApp | 🟡 Médio | 🔴 Alto | ⬜ Fase 3.3 |
| B — Instagram API | 🟡 Médio | 🔴 Alto | ⬜ Fase 3.3 |
| B — Meta Ads | 🟢 Baixo | 🔴 Alto | ⬜ Fase 3.3 |

---

## APÊNDICE B — Diagrama de Dependências

```
Fase 3.0:
  Migration SQL ──→ RLS client ──→ Portal do Cliente
  Migration SQL ──→ email_logs ──→ Resend Integration

Fase 3.1:
  Portal do Cliente (completo) ──→ Relatórios (inclui dados de aprovação de cliente)
  job_outputs Realtime ──→ Live Kanban
  notifications Realtime ──→ Live Bell

Fase 3.2:
  leads table ──→ CRM Kanban ──→ Lead Activities ──→ Convert to Client
  email_logs + Resend ──→ Cron Jobs (usa mesma infra de e-mail)
  output_versions trigger ──→ VersionHistory component

Fase 3.3:
  integration_configs ──→ WhatsApp ──→ Instagram ──→ Meta Ads
  reports (Fase 3.1) ──→ relatórios com métricas de Meta Ads
```

---

*Documento gerado para Agency OS | Fase 3 | Maio 2026*
*Próximo documento: SPEC-fase3.md — Especificação de Implementação*
