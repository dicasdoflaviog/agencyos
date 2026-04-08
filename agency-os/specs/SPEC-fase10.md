# SPEC-fase10 — Agency OS
> Software Design Document · Fase 12 — Agent Autonomy + Integrations

---

## 1. Arquivos a Criar

```
web/
├── supabase/migration_autonomy.sql
├── app/
│   ├── api/
│   │   ├── agents/
│   │   │   └── vulcan/
│   │   │       └── analyze/route.ts   # VULCAN v2 — análise financeira avançada
│   │   ├── integrations/
│   │   │   ├── notion/
│   │   │   │   ├── sync/route.ts
│   │   │   │   └── callback/route.ts
│   │   │   └── zapier/
│   │   │       └── trigger/route.ts
│   │   └── cron/
│   │       ├── followup/route.ts      # cron job: follow-ups automáticos
│   │       └── reports/route.ts       # cron job: relatórios semanais
│   └── (dashboard)/
│       ├── settings/
│       │   └── integrations/
│       │       └── page.tsx           # página de integrações
│       └── agents/
│           └── autopilot/
│               └── page.tsx           # painel de automação
└── components/
    ├── settings/
    │   └── IntegrationCard.tsx
    └── autopilot/
        ├── AgentScheduleCard.tsx
        └── AutopilotDashboard.tsx
```

---

## 2. BLOCO 0 — Migration

```sql
-- supabase/migration_autonomy.sql

-- Tarefas agendadas para agentes (autopilot)
CREATE TABLE IF NOT EXISTS agent_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  agent        text NOT NULL,           -- 'harbor', 'vox', 'nexus', etc.
  trigger_type text NOT NULL CHECK (trigger_type IN ('cron', 'event', 'manual')),
  cron_expr    text,                    -- ex: '0 9 * * 1' (toda segunda 9h)
  event_name   text,                    -- ex: 'lead.status_changed'
  action       jsonb NOT NULL,          -- { type, params }
  is_active    boolean DEFAULT true,
  last_run     timestamptz,
  next_run     timestamptz,
  run_count    integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Logs de execução do autopilot
CREATE TABLE IF NOT EXISTS autopilot_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id  uuid REFERENCES agent_schedules(id) ON DELETE CASCADE,
  status       text CHECK (status IN ('running', 'success', 'failed')),
  input        jsonb,
  output       text,
  error        text,
  duration_ms  integer,
  created_at   timestamptz DEFAULT now()
);

-- Mapeamentos Notion
CREATE TABLE IF NOT EXISTS notion_mappings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL,
  notion_page_id  text,
  notion_db_id    text,
  entity_type     text NOT NULL,  -- 'client', 'lead', 'job'
  sync_direction  text DEFAULT 'bidirectional',
  last_synced_at  timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace schedules" ON agent_schedules
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

ALTER TABLE autopilot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace logs" ON autopilot_logs
  FOR ALL USING (
    schedule_id IN (
      SELECT id FROM agent_schedules WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

ALTER TABLE notion_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace notion" ON notion_mappings
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
```

---

## 3. BLOCO 1 — VULCAN v2: /api/agents/vulcan/analyze/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

interface FinancialContext {
  contracts: { value: number; status: string; client_name?: string }[]
  jobs: { budget?: number; status: string; title: string }[]
  totalMRR: number
  totalChurn: number
  netGrowth: number
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { period = '30d', context: extraContext } = await req.json() as {
    period?: string
    context?: string
  }

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()
  const workspaceId = profile?.workspace_id

  // Calcular período
  const days = parseInt(period) || 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Buscar dados financeiros
  const [contractsRes, jobsRes] = await Promise.all([
    supabase.from('contracts')
      .select('value, status, client_id, clients(name)')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since),
    supabase.from('jobs')
      .select('budget, status, title')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since),
  ])

  const contracts = (contractsRes.data ?? []).map(c => ({
    value: c.value ?? 0,
    status: c.status ?? 'unknown',
    client_name: (c.clients as { name?: string } | null)?.name,
  }))

  const jobs = (jobsRes.data ?? []).map(j => ({
    budget: j.budget ?? 0,
    status: j.status ?? 'unknown',
    title: j.title ?? '',
  }))

  const activeContracts = contracts.filter(c => c.status === 'active')
  const totalMRR = activeContracts.reduce((sum, c) => sum + c.value, 0)
  const churnedContracts = contracts.filter(c => c.status === 'cancelled')
  const totalChurn = churnedContracts.reduce((sum, c) => sum + c.value, 0)
  const netGrowth = totalMRR - totalChurn

  const ctx: FinancialContext = { contracts, jobs, totalMRR, totalChurn, netGrowth }

  const prompt = `Você é VULCAN, CFO digital especializado em agências de marketing.

Analise os dados financeiros e gere um relatório executivo com:
1. **Saúde Financeira** — MRR atual, tendência, risco de churn
2. **Projetos** — taxa de aprovação, projetos em risco, estimativa de receita
3. **Alertas** — top 3 ações urgentes (ordenadas por impacto)
4. **Previsão** — estimativa de receita próximos 30 dias com base no pipeline

DADOS (últimos ${days} dias):
- Contratos ativos: ${activeContracts.length} → MRR: R$ ${totalMRR.toLocaleString('pt-BR')}
- Contratos cancelados: ${churnedContracts.length} → Churn: R$ ${totalChurn.toLocaleString('pt-BR')}
- Crescimento líquido: R$ ${netGrowth.toLocaleString('pt-BR')}
- Projetos: ${jobs.length} total
  - Concluídos: ${jobs.filter(j => j.status === 'completed').length}
  - Em andamento: ${jobs.filter(j => j.status === 'in_progress').length}
  - Aguardando aprovação: ${jobs.filter(j => j.status === 'pending').length}

${extraContext ? `Contexto adicional: ${extraContext}` : ''}

Seja direto, use markdown, evite floreios.`

  const result = await routeChat('vulcan', [{ role: 'user', content: prompt }], { maxTokens: 1000 })

  return Response.json({
    analysis: result.content,
    metrics: { totalMRR, totalChurn, netGrowth, activeContracts: activeContracts.length },
    period: `${days}d`,
  })
}
```

---

## 4. BLOCO 2 — Notion Sync: /api/integrations/notion/sync/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

interface NotionBlock {
  id: string
  url: string
}

async function notionFetch(
  path: string,
  notionKey: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`Notion API error: ${await res.text()}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { entity_type, entity_id } = await req.json() as {
    entity_type: 'client' | 'lead' | 'job'
    entity_id: string
  }

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()
  const workspaceId = profile?.workspace_id

  // Verificar integração ativa
  const { data: integration } = await supabase
    .from('workspace_integrations')
    .select('access_token')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'notion')
    .maybeSingle()

  if (!integration?.access_token) {
    return Response.json({ error: 'Notion não conectado. Configure em Settings > Integrações.' }, { status: 400 })
  }

  const notionKey = integration.access_token

  // Buscar mapeamento existente
  const { data: mapping } = await supabase
    .from('notion_mappings')
    .select('notion_page_id, notion_db_id')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', entity_type)
    .maybeSingle()

  if (!mapping?.notion_db_id) {
    return Response.json({ error: `Nenhum banco Notion mapeado para ${entity_type}` }, { status: 400 })
  }

  // Buscar dados da entidade
  let entity: Record<string, unknown> = {}
  if (entity_type === 'client') {
    const { data } = await supabase.from('clients').select('*').eq('id', entity_id).single()
    entity = data ?? {}
  } else if (entity_type === 'lead') {
    const { data } = await supabase.from('crm_leads').select('*').eq('id', entity_id).single()
    entity = data ?? {}
  } else if (entity_type === 'job') {
    const { data } = await supabase.from('jobs').select('*').eq('id', entity_id).single()
    entity = data ?? {}
  }

  // Criar/atualizar página no Notion
  const properties: Record<string, unknown> = {
    'Name': { title: [{ text: { content: String(entity.name ?? entity.title ?? 'Sem nome') } }] },
    'Status': { select: { name: String(entity.status ?? 'active') } },
    'ID Origem': { rich_text: [{ text: { content: entity_id } }] },
  }

  let notionPage: NotionBlock
  try {
    notionPage = await notionFetch('/pages', notionKey, 'POST', {
      parent: { database_id: mapping.notion_db_id },
      properties,
    }) as NotionBlock
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }

  // Salvar referência
  await supabase.from('notion_mappings').upsert({
    workspace_id: workspaceId,
    notion_page_id: notionPage.id,
    notion_db_id: mapping.notion_db_id,
    entity_type,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,entity_type' })

  return Response.json({ notionPageId: notionPage.id, notionUrl: notionPage.url })
}
```

---

## 5. BLOCO 3 — Cron Jobs

### 5.1 — /api/cron/followup/route.ts

```typescript
// Trigger via Vercel Cron: diariamente às 9h BRT
// vercel.json: { "crons": [{ "path": "/api/cron/followup", "schedule": "0 12 * * 1-5" }] }

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Validar cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Buscar leads que precisam de follow-up (sem contato há 3+ dias)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const { data: staleLeads } = await supabase
    .from('crm_leads')
    .select('id, name, company, notes, workspace_id')
    .in('status', ['contacted', 'negotiating'])
    .lt('updated_at', threeDaysAgo)
    .limit(10)

  const results: { lead_id: string; status: string }[] = []

  for (const lead of staleLeads ?? []) {
    try {
      const result = await routeChat('harbor', [{
        role: 'user',
        content: `Lead ${lead.name} (${lead.company ?? 'N/D'}) sem contato há 3+ dias.
          Gere 1 parágrafo de follow-up direto, sem saudações formais.
          Notas: ${lead.notes ?? 'nenhuma'}`,
      }], { maxTokens: 200 })

      // Salvar sugestão de follow-up como nota no lead
      await supabase.from('crm_leads')
        .update({
          notes: `[AUTO FOLLOW-UP ${new Date().toLocaleDateString('pt-BR')}]\n${result.content}\n\n${lead.notes ?? ''}`,
        })
        .eq('id', lead.id)

      results.push({ lead_id: lead.id, status: 'ok' })
    } catch {
      results.push({ lead_id: lead.id, status: 'error' })
    }
  }

  return Response.json({ processed: results.length, results })
}
```

### 5.2 — /api/cron/reports/route.ts

```typescript
// Trigger via Vercel Cron: toda segunda às 8h BRT
// vercel.json: { "crons": [{ "path": "/api/cron/reports", "schedule": "0 11 * * 1" }] }

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Buscar todos os workspaces ativos
  const { data: workspaces } = await supabase
    .from('profiles')
    .select('workspace_id')
    .limit(50)

  const uniqueWorkspaceIds = [...new Set((workspaces ?? []).map(p => p.workspace_id).filter(Boolean))]
  const summaries: { workspace_id: string; status: string }[] = []

  for (const workspaceId of uniqueWorkspaceIds) {
    try {
      const [jobsRes, leadsRes] = await Promise.all([
        supabase.from('jobs')
          .select('status, title').eq('workspace_id', workspaceId).gte('created_at', weekAgo),
        supabase.from('crm_leads')
          .select('status').eq('workspace_id', workspaceId).gte('created_at', weekAgo),
      ])

      const jobs = jobsRes.data ?? []
      const leads = leadsRes.data ?? []
      if (!jobs.length && !leads.length) continue

      const weeklyReport = await routeChat('vox', [{
        role: 'user',
        content: `Gere um resumo executivo semanal (máx 150 palavras):
          Projetos criados: ${jobs.length}
          Projetos concluídos: ${jobs.filter(j => j.status === 'completed').length}
          Novos leads: ${leads.length}
          Leads convertidos: ${leads.filter(l => l.status === 'won').length}
          
          Tom: direto, positivo, foco em progresso e próximos passos.`,
      }], { maxTokens: 200 })

      // Salvar relatório como job_output para referência
      await supabase.from('job_outputs').insert({
        workspace_id: workspaceId,
        agent: 'vox',
        output_type: 'weekly_report',
        output_content: weeklyReport.content,
      })

      summaries.push({ workspace_id: workspaceId, status: 'ok' })
    } catch {
      summaries.push({ workspace_id: workspaceId, status: 'error' })
    }
  }

  return Response.json({ processed: summaries.length, summaries })
}
```

---

## 6. BLOCO 4 — vercel.json (adicionar crons)

```json
{
  "crons": [
    {
      "path": "/api/cron/followup",
      "schedule": "0 12 * * 1-5"
    },
    {
      "path": "/api/cron/reports",
      "schedule": "0 11 * * 1"
    }
  ]
}
```

---

## 7. BLOCO 5 — Settings > Integrações page

```tsx
// app/(dashboard)/settings/integrations/page.tsx
import { IntegrationCard } from '@/components/settings/IntegrationCard'
import { Calendar, FileText, Zap, Globe } from 'lucide-react'

export const metadata = { title: 'Integrações — Agency OS' }

const INTEGRATIONS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sincronize reuniões e follow-ups automaticamente.',
    icon: Calendar,
    status: 'available',
    docsUrl: 'https://calendar.google.com',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sincronize clientes, leads e projetos com seu workspace Notion.',
    icon: FileText,
    status: 'available',
    docsUrl: 'https://www.notion.so',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte Agency OS com +5000 apps via webhooks.',
    icon: Zap,
    status: 'coming_soon',
    docsUrl: 'https://zapier.com',
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Automação open-source para workflows avançados.',
    icon: Globe,
    status: 'coming_soon',
    docsUrl: 'https://n8n.io',
  },
]

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Integrações</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Conecte Agency OS com suas ferramentas de trabalho.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map(integration => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  )
}
```

---

## 8. Env Vars necessárias

```bash
# Vercel + .env.local
CRON_SECRET=<random_secret_para_validar_crons>
NOTION_CLIENT_ID=<da_integration_notion>
NOTION_CLIENT_SECRET=<da_integration_notion>

# Google (já devem existir para Calendar)
GOOGLE_CLIENT_ID=<google_oauth>
GOOGLE_CLIENT_SECRET=<google_oauth>
```

---

## 9. Checklist pré-deploy

- [ ] `migration_autonomy.sql` aplicado no Supabase
- [ ] `vercel.json` atualizado com crons
- [ ] `CRON_SECRET` adicionado no Vercel
- [ ] Verificar que `createAdminClient` existe em `lib/supabase/admin.ts`
- [ ] Testar manualmente `GET /api/cron/followup` com header `Authorization: Bearer <CRON_SECRET>`
- [ ] `npm run build` sem erros
