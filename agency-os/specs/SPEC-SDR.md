# SPEC — Agency OS | CRM Inteligente + SDR Autônomo
> SDD Etapa 2 · Plano tático · Abril 2026
> Baseado em: PRD-SDR.md

---

## ORDEM DE IMPLEMENTAÇÃO

```
BLOCO 0 — Migration SQL (tabelas novas + ALTER em crm_leads)
BLOCO 1 — Ponto de entrada unificado: /api/sdr/intake
BLOCO 2 — Formulário público /captacao
BLOCO 3 — Pipeline automático: HARBOR → IRIS → ORACLE (steps 0-2)
BLOCO 4 — Cron SDR-Runner (sequência D0/D+2/D+5)
BLOCO 5 — Painel SDR no dashboard + aprovação de mensagens
BLOCO 6 — Prospecção ativa (outbound) — implementar por último
```

---

## BLOCO 0 — MIGRATION SQL

### 0.1 — Rodar no Supabase SQL Editor

```sql
-- ─── TABELAS NOVAS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sdr_pipelines (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id          UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  workspace_id     UUID NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running','paused','converted','dead','waiting_human')),
  current_step     INTEGER DEFAULT 0,
  next_action_at   TIMESTAMPTZ DEFAULT NOW(),
  interest_detected         BOOLEAN DEFAULT FALSE,
  interest_detected_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON sdr_pipelines (lead_id);
CREATE INDEX ON sdr_pipelines (workspace_id, status);
CREATE INDEX ON sdr_pipelines (next_action_at) WHERE status = 'running';
ALTER TABLE sdr_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdr_pipelines_auth" ON sdr_pipelines FOR ALL USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sdr_actions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id  UUID REFERENCES sdr_pipelines(id) ON DELETE CASCADE NOT NULL,
  lead_id      UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  step         INTEGER NOT NULL,
  agent        TEXT NOT NULL,
  action_type  TEXT NOT NULL,
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','sent','failed','skipped')),
  input        JSONB DEFAULT '{}',
  output       JSONB DEFAULT '{}',
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON sdr_actions (pipeline_id, step);
CREATE INDEX ON sdr_actions (status) WHERE status = 'pending';
ALTER TABLE sdr_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdr_actions_auth" ON sdr_actions FOR ALL USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_sources (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('form','webhook','manual','outbound')),
  webhook_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  config        JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  leads_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON lead_sources (workspace_id);
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_sources_auth" ON lead_sources FOR ALL USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_enrichments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id               UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  instagram_handle      TEXT,
  instagram_followers   INTEGER,
  instagram_posts_freq  TEXT,
  instagram_content_type TEXT,
  website_url           TEXT,
  website_summary       TEXT,
  niche_detected        TEXT,
  pain_points           TEXT[] DEFAULT '{}',
  raw_data              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)
);
ALTER TABLE lead_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_enrichments_auth" ON lead_enrichments FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── ALTER EM TABELAS EXISTENTES ─────────────────────────────────────────

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sdr_pipeline_id UUID REFERENCES sdr_pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_score SMALLINT;
```

---

## BLOCO 1 — PONTO DE ENTRADA UNIFICADO

### 1.1 — CRIAR `app/api/sdr/intake/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { startSDRPipeline } from '@/lib/sdr/pipeline'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, whatsapp, company, instagram, niche, pain, source_id } = body

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'name e whatsapp são obrigatórios' }, { status: 400 })
    }

    // Buscar workspace do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single()

    const workspace_id = profile?.workspace_id ?? user.id

    // Criar lead
    const { data: lead, error: leadErr } = await supabase
      .from('crm_leads')
      .insert({
        name,
        phone: whatsapp,
        company: company ?? null,
        niche: niche ?? null,
        notes: pain ?? null,
        source_id: source_id ?? null,
        status: 'novo',
        workspace_id,
      })
      .select()
      .single()

    if (leadErr || !lead) throw leadErr

    // Criar pipeline SDR
    const { data: pipeline } = await supabase
      .from('sdr_pipelines')
      .insert({
        lead_id: lead.id,
        workspace_id,
        status: 'running',
        current_step: 0,
        next_action_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Vincular pipeline ao lead
    await supabase
      .from('crm_leads')
      .update({ sdr_pipeline_id: pipeline?.id })
      .eq('id', lead.id)

    // Iniciar pipeline assincronamente (não aguarda)
    if (pipeline) {
      startSDRPipeline(lead.id, pipeline.id, workspace_id).catch(console.error)
    }

    return NextResponse.json({ success: true, lead_id: lead.id })
  } catch (error) {
    console.error('[sdr/intake]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

### 1.2 — CRIAR `app/api/sdr/intake/webhook/[token]/route.ts`
**Endpoint público — sem auth — para ManyChat, Zapier, formulário externo**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { startSDRPipeline } from '@/lib/sdr/pipeline'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createAdminClient()

    // Validar token
    const { data: source } = await supabase
      .from('lead_sources')
      .select('id, workspace_id, config, is_active')
      .eq('webhook_token', params.token)
      .single()

    if (!source?.is_active) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    }

    const body = await request.json()

    // Normalizar campos (ManyChat usa campos diferentes de formulário)
    const fieldMap = (source.config as Record<string, string>) ?? {}
    const name     = body[fieldMap.name     ?? 'name']     ?? body.first_name ?? 'Lead'
    const whatsapp = body[fieldMap.whatsapp  ?? 'whatsapp'] ?? body.phone ?? body.number ?? ''
    const company  = body[fieldMap.company   ?? 'company']  ?? body.empresa ?? null
    const instagram = body[fieldMap.instagram ?? 'instagram'] ?? body.instagram ?? null
    const niche    = body[fieldMap.niche     ?? 'niche']    ?? body.nicho ?? null
    const pain     = body[fieldMap.pain      ?? 'pain']     ?? body.notes ?? body.mensagem ?? null

    // Criar lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .insert({
        name,
        phone: whatsapp,
        company,
        niche,
        notes: pain,
        source_id: source.id,
        workspace_id: source.workspace_id,
        status: 'novo',
      })
      .select()
      .single()

    if (error || !lead) throw error

    // Pipeline
    const { data: pipeline } = await supabase
      .from('sdr_pipelines')
      .insert({
        lead_id: lead.id,
        workspace_id: source.workspace_id,
        status: 'running',
        current_step: 0,
        next_action_at: new Date().toISOString(),
      })
      .select()
      .single()

    await supabase
      .from('crm_leads')
      .update({ sdr_pipeline_id: pipeline?.id })
      .eq('id', lead.id)

    if (pipeline) {
      startSDRPipeline(lead.id, pipeline.id, source.workspace_id).catch(console.error)
    }

    // Incrementar contador da fonte
    await supabase.rpc('increment_source_count', { source_id: source.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sdr/webhook]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

## BLOCO 2 — FORMULÁRIO PÚBLICO /captacao

### 2.1 — CRIAR `app/captacao/page.tsx` (sem auth, rota pública)

```tsx
// app/captacao/page.tsx
// Rota pública — não precisa de layout do dashboard
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fale com a gente',
  description: 'Preencha seus dados e entraremos em contato',
}

export default function CaptacaoPage({
  searchParams,
}: {
  searchParams: { token?: string; utm_source?: string; utm_campaign?: string }
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <CaptacaoForm
        sourceToken={searchParams.token ?? ''}
        utmSource={searchParams.utm_source}
        utmCampaign={searchParams.utm_campaign}
      />
    </div>
  )
}
```

### 2.2 — CRIAR `components/sdr/CaptacaoForm.tsx`

```tsx
'use client'
import { useState } from 'react'

const NICHES = [
  'E-commerce', 'Serviços Locais', 'Saúde e Estética', 'Educação',
  'Alimentação', 'Imóveis', 'Moda', 'Tecnologia', 'Outro'
]

interface Props {
  sourceToken: string
  utmSource?: string
  utmCampaign?: string
}

type Step = 'form' | 'sending' | 'done' | 'error'

export function CaptacaoForm({ sourceToken, utmSource, utmCampaign }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState({
    name: '', whatsapp: '', company: '', instagram: '', niche: '', pain: ''
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    if (!form.name.trim() || !form.whatsapp.trim()) return
    setStep('sending')
    try {
      const endpoint = sourceToken
        ? `/api/sdr/intake/webhook/${sourceToken}`
        : '/api/sdr/intake/form'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, utm_source: utmSource, utm_campaign: utmCampaign }),
      })
      if (!res.ok) throw new Error()
      setStep('done')
    } catch {
      setStep('error')
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    padding: '12px 14px', fontSize: '14px', color: '#F5F2EC', outline: 'none',
  }

  if (step === 'done') return (
    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
      <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✓</div>
      <h2 style={{ fontSize: '22px', color: '#F5F2EC', marginBottom: '8px' }}>Recebemos!</h2>
      <p style={{ color: '#888880', fontSize: '14px', lineHeight: 1.6 }}>
        Em breve entraremos em contato pelo WhatsApp informado.
      </p>
    </div>
  )

  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', color: '#F5F2EC', fontWeight: 500, marginBottom: '8px' }}>
          Fale com a gente
        </h1>
        <p style={{ color: '#888880', fontSize: '14px' }}>
          Preencha e nossa equipe entra em contato em breve
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          placeholder="Seu nome *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="WhatsApp com DDD *"
          value={form.whatsapp}
          onChange={e => set('whatsapp', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Nome da empresa (opcional)"
          value={form.company}
          onChange={e => set('company', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="@instagram da empresa (opcional)"
          value={form.instagram}
          onChange={e => set('instagram', e.target.value)}
          style={inputStyle}
        />
        <select
          value={form.niche}
          onChange={e => set('niche', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Segmento do negócio (opcional)</option>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <textarea
          placeholder="O que você precisa? Como podemos ajudar? (opcional)"
          value={form.pain}
          onChange={e => set('pain', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <button
          onClick={submit}
          disabled={!form.name.trim() || !form.whatsapp.trim() || step === 'sending'}
          style={{
            background: '#F59E0B', color: '#000', fontWeight: 700,
            padding: '14px', borderRadius: '10px', fontSize: '15px',
            border: 'none', cursor: 'pointer', marginTop: '4px',
            opacity: (!form.name.trim() || !form.whatsapp.trim()) ? 0.4 : 1,
          }}
        >
          {step === 'sending' ? 'Enviando...' : 'Quero saber mais →'}
        </button>
        {step === 'error' && (
          <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
            Erro ao enviar. Tente novamente.
          </p>
        )}
      </div>
    </div>
  )
}
```

### 2.3 — CRIAR `app/api/sdr/intake/form/route.ts` (versão sem auth para formulário próprio)

```typescript
// Igual ao webhook mas sem validar token — para o formulário /captacao da própria agência
// Busca o lead_source padrão do workspace (type: 'form', name: 'Formulário Principal')
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { startSDRPipeline } from '@/lib/sdr/pipeline'

export async function POST(request: NextRequest) {
  // Implementação similar ao webhook — busca workspace padrão pelo domínio
  // ou usa um workspace_id configurado via env var AGENCY_WORKSPACE_ID
  const supabase = createAdminClient()
  const body = await request.json()
  const workspaceId = process.env.AGENCY_WORKSPACE_ID

  if (!workspaceId) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  const { data: lead } = await supabase.from('crm_leads').insert({
    name: body.name,
    phone: body.whatsapp,
    company: body.company ?? null,
    niche: body.niche ?? null,
    notes: body.pain ?? null,
    workspace_id: workspaceId,
    status: 'novo',
  }).select().single()

  if (!lead) return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 })

  const { data: pipeline } = await supabase.from('sdr_pipelines').insert({
    lead_id: lead.id, workspace_id: workspaceId,
    status: 'running', current_step: 0, next_action_at: new Date().toISOString(),
  }).select().single()

  if (pipeline) {
    await supabase.from('crm_leads').update({ sdr_pipeline_id: pipeline.id }).eq('id', lead.id)
    startSDRPipeline(lead.id, pipeline.id, workspaceId).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
```

---

## BLOCO 3 — PIPELINE CORE (HARBOR → IRIS → ORACLE)

### 3.1 — CRIAR `lib/sdr/pipeline.ts` (orquestrador central)

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { runHarborQualify } from './steps/qualify'
import { runIrisEnrich } from './steps/enrich'
import { runOracleDraft } from './steps/draft'

export async function startSDRPipeline(
  leadId: string,
  pipelineId: string,
  workspaceId: string,
) {
  const supabase = createAdminClient()

  try {
    // STEP 0 — HARBOR qualifica
    await updateStep(supabase, pipelineId, 0)
    const score = await runHarborQualify(leadId, pipelineId, workspaceId)

    // Score muito baixo → encerrar
    if (score < 3) {
      await supabase.from('sdr_pipelines')
        .update({ status: 'dead', updated_at: new Date().toISOString() })
        .eq('id', pipelineId)
      await supabase.from('crm_leads').update({ status: 'perdido' }).eq('id', leadId)
      return
    }

    // STEP 1 — IRIS enriquece
    await updateStep(supabase, pipelineId, 1)
    await runIrisEnrich(leadId, pipelineId, workspaceId)

    // STEP 2 — ORACLE gera mensagem (fica pendente de aprovação)
    await updateStep(supabase, pipelineId, 2)
    await runOracleDraft(leadId, pipelineId, workspaceId, 0)

    // Pipeline fica aguardando aprovação humana
    const followupAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // D+2
    await supabase.from('sdr_pipelines').update({
      current_step: 2,
      next_action_at: followupAt.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', pipelineId)

  } catch (error) {
    console.error('[sdr/pipeline]', error)
    await supabase.from('sdr_pipelines')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', pipelineId)
  }
}

async function updateStep(supabase: ReturnType<typeof createAdminClient>, pipelineId: string, step: number) {
  await supabase.from('sdr_pipelines')
    .update({ current_step: step, updated_at: new Date().toISOString() })
    .eq('id', pipelineId)
}
```

### 3.2 — CRIAR `lib/sdr/steps/qualify.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

export async function runHarborQualify(
  leadId: string,
  pipelineId: string,
  workspaceId: string,
): Promise<number> {
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('crm_leads')
    .select('name, company, niche, notes, phone, source_id')
    .eq('id', leadId)
    .single()

  // Registrar ação
  const { data: action } = await supabase.from('sdr_actions').insert({
    pipeline_id: pipelineId,
    lead_id: leadId,
    step: 0,
    agent: 'harbor',
    action_type: 'qualify',
    status: 'pending',
    input: { lead },
  }).select().single()

  const prompt = `Você é HARBOR, especialista em qualificação de leads para agência de marketing.

Analise este prospect e retorne APENAS JSON válido:
{
  "score": 0-10,
  "temperature": "hot|warm|cold",
  "diagnosis": "diagnóstico em 1 frase curta",
  "recommended_channel": "whatsapp|email",
  "reasoning": "por que esse score"
}

PROSPECT:
- Nome: ${lead?.name ?? 'N/D'}
- Empresa: ${lead?.company ?? 'Não informado'}
- Nicho: ${lead?.niche ?? 'Não informado'}
- Como chegou / O que disse: ${lead?.notes ?? 'Nenhuma informação'}
- Tem WhatsApp: ${lead?.phone ? 'Sim' : 'Não'}

Score 0-3: lead frio, pouco fit
Score 4-6: lead morno, potencial médio
Score 7-10: lead quente, alta prioridade`

  const result = await IntelligenceRouter.routeChat('harbor', [
    { role: 'user', content: prompt }
  ], { maxTokens: 300 })

  let data: Record<string, unknown> = { score: 5, temperature: 'warm' }
  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    data = JSON.parse(clean)
  } catch { /* usa default */ }

  const score = Number(data.score ?? 5)

  // Salvar score
  await supabase.from('crm_scores').upsert({
    lead_id: leadId,
    score,
    justification: String(data.diagnosis ?? ''),
    scored_by: 'harbor',
  }, { onConflict: 'lead_id' })

  // Atualizar ação
  await supabase.from('sdr_actions').update({
    status: 'sent',
    output: data,
  }).eq('id', action?.id)

  // Atualizar lead com temperatura
  const stageMap: Record<string, string> = { hot: 'quente', warm: 'morno', cold: 'frio' }
  await supabase.from('crm_leads')
    .update({ status: stageMap[String(data.temperature)] ?? 'novo' })
    .eq('id', leadId)

  return score
}
```

### 3.3 — CRIAR `lib/sdr/steps/enrich.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { runApifyActor } from '@/lib/intelligence/apify'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

export async function runIrisEnrich(
  leadId: string,
  pipelineId: string,
  workspaceId: string,
) {
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('crm_leads')
    .select('name, company, niche, notes')
    .eq('id', leadId)
    .single()

  const { data: action } = await supabase.from('sdr_actions').insert({
    pipeline_id: pipelineId, lead_id: leadId, step: 1,
    agent: 'iris', action_type: 'enrich', status: 'pending',
    input: { lead },
  }).select().single()

  const enrichment: Record<string, unknown> = {}

  // Buscar Instagram se @ disponível nas notas
  const igMatch = (lead?.notes ?? '').match(/@([\w.]+)/)
  const igHandle = igMatch?.[1]

  if (igHandle) {
    try {
      const igData = await runApifyActor({
        actorId: 'nH2AHrwxeTRJoN5hX', // Instagram Profile Scraper
        input: { usernames: [igHandle] },
        timeoutSecs: 60,
      })
      const profile = (igData as Array<Record<string, unknown>>)[0]
      if (profile) {
        enrichment.instagram_handle = igHandle
        enrichment.instagram_followers = profile.followersCount
        enrichment.instagram_posts_count = profile.postsCount
      }
    } catch { /* enriquecimento é melhor-esforço */ }
  }

  // IRIS analisa o que coletou + o que sabe do lead
  const irisPrompt = `Você é IRIS. Analise os dados deste prospect e retorne APENAS JSON:
{
  "niche_detected": "nicho real identificado",
  "instagram_posts_freq": "diário|semanal|raramente|sem_dados",
  "instagram_content_type": "produto|serviço|educacional|misto|sem_dados",
  "pain_points": ["dor 1", "dor 2", "dor 3"],
  "website_summary": "resumo breve se tiver site, senão null"
}

DADOS DO PROSPECT:
- Nome: ${lead?.name}
- Empresa: ${lead?.company ?? 'Não informado'}
- Nicho declarado: ${lead?.niche ?? 'Não informado'}
- O que disse: ${lead?.notes ?? 'Nada'}
- Instagram: ${igHandle ? `@${igHandle} (${enrichment.instagram_followers ?? 'N/D'} seguidores)` : 'Não informado'}

Seja específico. Se não tiver dados suficientes, diga que não tem.`

  const irisResult = await IntelligenceRouter.routeChat('iris', [
    { role: 'user', content: irisPrompt }
  ], { maxTokens: 400 })

  let irisData: Record<string, unknown> = {}
  try {
    const clean = irisResult.content.replace(/```json|```/g, '').trim()
    irisData = JSON.parse(clean)
  } catch { /* usa vazio */ }

  const finalEnrichment = { ...enrichment, ...irisData }

  // Salvar enriquecimento
  await supabase.from('lead_enrichments').upsert({
    lead_id: leadId,
    instagram_handle: String(finalEnrichment.instagram_handle ?? ''),
    instagram_followers: Number(finalEnrichment.instagram_followers ?? 0),
    instagram_posts_freq: String(finalEnrichment.instagram_posts_freq ?? ''),
    instagram_content_type: String(finalEnrichment.instagram_content_type ?? ''),
    website_summary: finalEnrichment.website_summary as string ?? null,
    niche_detected: String(finalEnrichment.niche_detected ?? ''),
    pain_points: (finalEnrichment.pain_points as string[]) ?? [],
    raw_data: finalEnrichment,
  }, { onConflict: 'lead_id' })

  await supabase.from('crm_leads')
    .update({ enriched_at: new Date().toISOString() })
    .eq('id', leadId)

  await supabase.from('sdr_actions').update({
    status: 'sent', output: finalEnrichment,
  }).eq('id', action?.id)
}
```

### 3.4 — CRIAR `lib/sdr/steps/draft.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

export async function runOracleDraft(
  leadId: string,
  pipelineId: string,
  workspaceId: string,
  followupNumber: number, // 0 = primeiro contato, 1 = follow-up 1, 2 = follow-up 2
) {
  const supabase = createAdminClient()

  const [leadRes, scoreRes, enrichRes] = await Promise.all([
    supabase.from('crm_leads').select('*').eq('id', leadId).single(),
    supabase.from('crm_scores').select('*').eq('lead_id', leadId).single(),
    supabase.from('lead_enrichments').select('*').eq('lead_id', leadId).single(),
  ])

  const lead = leadRes.data
  const score = scoreRes.data
  const enrich = enrichRes.data

  const followupContext = [
    'Primeiro contato — apresentar relevância e fazer 1 pergunta aberta.',
    'Follow-up 1 — ângulo diferente. Mencionar um resultado ou caso relevante. Chamar para conversa.',
    'Follow-up 2 — pergunta direta e curta. "Faz sentido trocar uma ideia?"',
  ][followupNumber] ?? ''

  const prompt = `Você é ORACLE no modo SDR de uma agência de marketing digital.
Escreva uma mensagem de prospecção para WhatsApp.

REGRAS OBRIGATÓRIAS:
- Máximo 3 parágrafos CURTOS
- Mencione algo ESPECÍFICO do negócio deste prospect (não genérico)
- Faça 1 pergunta aberta no final
- Tom: direto, humano, sem "espero que esta mensagem te encontre bem"
- NUNCA comece com "Olá, somos uma agência" — seja humano
- Retorne APENAS o texto da mensagem, sem explicações

CONTEXTO: ${followupContext}

PROSPECT:
- Nome: ${lead?.name}
- Empresa: ${lead?.company ?? 'N/D'}
- Nicho: ${enrich?.niche_detected ?? lead?.niche ?? 'N/D'}
- Instagram: ${enrich?.instagram_handle ? `@${enrich.instagram_handle} (${enrich.instagram_followers} seguidores)` : 'N/D'}
- Frequência de posts: ${enrich?.instagram_posts_freq ?? 'N/D'}
- Dores identificadas: ${(enrich?.pain_points ?? []).join(', ') || 'N/D'}
- Score de qualificação: ${score?.score ?? 'N/D'}/10
- O que disse ao se cadastrar: ${lead?.notes ?? 'Nada'}`

  const result = await IntelligenceRouter.routeChat('oracle', [
    { role: 'user', content: prompt }
  ], { maxTokens: 400 })

  const draftMessage = result.content.trim()
  const channel = score?.justification?.includes('email') ? 'email' : 'whatsapp'

  // Criar ação pendente de aprovação
  await supabase.from('sdr_actions').insert({
    pipeline_id: pipelineId,
    lead_id: leadId,
    step: 2 + followupNumber,
    agent: 'oracle',
    action_type: 'draft_message',
    status: 'pending',
    input: { followup_number: followupNumber, channel },
    output: { message: draftMessage, channel },
  })

  // Notificar usuário (via notifications existente)
  await supabase.from('notifications').insert({
    workspace_id: workspaceId,
    title: `SDR: mensagem para ${lead?.name} aguarda aprovação`,
    body: draftMessage.slice(0, 100) + '...',
    type: 'sdr_approval',
    metadata: { lead_id: leadId, pipeline_id: pipelineId },
  }).catch(() => {}) // notificação é melhor-esforço
}
```

---

## BLOCO 4 — CRON SDR-RUNNER

### 4.1 — CRIAR `app/api/cron/sdr-runner/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runOracleDraft } from '@/lib/sdr/steps/draft'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Validar CRON_SECRET
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Buscar pipelines prontos para próxima ação
  const { data: pipelines } = await supabase
    .from('sdr_pipelines')
    .select('*, crm_leads(*)')
    .eq('status', 'running')
    .lte('next_action_at', new Date().toISOString())
    .order('next_action_at', { ascending: true })
    .limit(50)

  const results = []

  for (const pipeline of pipelines ?? []) {
    try {
      const step = pipeline.current_step

      // Step 3 ou 4 — verificar se houve mensagem aprovada e enviada, gerar follow-up
      if (step === 2 || step === 3) {
        // Verificar se a mensagem do step atual foi enviada
        const { data: lastAction } = await supabase
          .from('sdr_actions')
          .select('status, output, created_at')
          .eq('pipeline_id', pipeline.id)
          .eq('step', step)
          .single()

        if (lastAction?.status === 'sent') {
          // Mensagem enviada — verificar resposta (simulado: checar lead_activities)
          const { data: replies } = await supabase
            .from('lead_activities')
            .select('id')
            .eq('lead_id', pipeline.lead_id)
            .eq('type', 'whatsapp')
            .eq('direction', 'inbound')
            .gte('created_at', lastAction.created_at)
            .limit(1)

          if (replies?.length) {
            // Houve resposta — detectar interesse
            await detectInterest(pipeline.id, pipeline.lead_id, pipeline.workspace_id, supabase)
          } else {
            // Sem resposta — gerar follow-up
            const followupNum = step - 1 // step 2 → followup 1, step 3 → followup 2
            if (followupNum <= 2) {
              await runOracleDraft(pipeline.lead_id, pipeline.id, pipeline.workspace_id, followupNum)
              const nextAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
              await supabase.from('sdr_pipelines').update({
                current_step: step + 1,
                next_action_at: nextAt.toISOString(),
              }).eq('id', pipeline.id)
            } else {
              // Esgotou follow-ups → dead
              await supabase.from('sdr_pipelines')
                .update({ status: 'dead' }).eq('id', pipeline.id)
              await supabase.from('crm_leads')
                .update({ status: 'perdido' }).eq('id', pipeline.lead_id)
            }
          }
        }
        // Se status é 'pending' → aguardando aprovação humana, não faz nada
      }

      results.push({ pipeline_id: pipeline.id, step, processed: true })
    } catch (err) {
      results.push({ pipeline_id: pipeline.id, error: String(err) })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function detectInterest(
  pipelineId: string,
  leadId: string,
  workspaceId: string,
  supabase: ReturnType<typeof createAdminClient>,
) {
  // Buscar última resposta do lead
  const { data: lastReply } = await supabase
    .from('lead_activities')
    .select('notes')
    .eq('lead_id', leadId)
    .eq('type', 'whatsapp')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastReply?.notes) return

  // ORACLE avalia interesse
  const { IntelligenceRouter } = await import('@/lib/openrouter/IntelligenceRouter')
  const result = await IntelligenceRouter.routeChat('oracle', [{
    role: 'user',
    content: `Avalie o nível de interesse desta resposta de um prospect.
Retorne APENAS JSON: {"interest_score": 0-10, "assessment": "descrição curta"}

RESPOSTA DO PROSPECT: "${lastReply.notes}"`
  }], { maxTokens: 150 })

  let data: Record<string, unknown> = { interest_score: 5 }
  try { data = JSON.parse(result.content.replace(/```json|```/g, '').trim()) } catch {}

  const score = Number(data.interest_score ?? 5)

  await supabase.from('crm_leads').update({ interest_score: score }).eq('id', leadId)

  if (score >= 6) {
    // Interesse real → handoff humano
    await supabase.from('sdr_pipelines').update({
      status: 'waiting_human',
      interest_detected: true,
      interest_detected_at: new Date().toISOString(),
    }).eq('id', pipelineId)

    await supabase.from('crm_leads').update({ status: 'quente' }).eq('id', leadId)

    // Notificar urgente
    await supabase.from('notifications').insert({
      workspace_id: workspaceId,
      title: '🔥 Lead com interesse detectado!',
      body: `Interesse ${score}/10: "${lastReply.notes.slice(0, 80)}..."`,
      type: 'sdr_interest',
      metadata: { lead_id: leadId },
    }).catch(() => {})
  }
}
```

### 4.2 — Adicionar ao `vercel.json`

```json
{ "path": "/api/cron/sdr-runner", "schedule": "0 * * * *" }
```

---

## BLOCO 5 — PAINEL SDR NO DASHBOARD

### 5.1 — CRIAR `app/(dashboard)/crm/sdr/page.tsx`

```tsx
// Página do painel SDR — métricas + ações pendentes
import { createServerClient } from '@/lib/supabase/server'
import { PendingActions } from '@/components/sdr/PendingActions'
import { SDRMetrics } from '@/components/sdr/SDRMetrics'

export default async function SDRPage() {
  const supabase = createServerClient()

  const [pendingRes, metricsRes] = await Promise.all([
    supabase
      .from('sdr_actions')
      .select('*, crm_leads(name, company, niche, phone), crm_scores(score)')
      .eq('status', 'pending')
      .eq('action_type', 'draft_message')
      .order('created_at', { ascending: true }),
    supabase
      .from('sdr_pipelines')
      .select('status')
  ])

  return (
    <div className="p-6 space-y-8">
      <SDRMetrics pipelines={metricsRes.data ?? []} />
      <PendingActions actions={pendingRes.data ?? []} />
    </div>
  )
}
```

### 5.2 — CRIAR `components/sdr/PendingActions.tsx`

```tsx
'use client'
import { useState } from 'react'

interface Action {
  id: string
  output: { message: string; channel: string }
  crm_leads: { name: string; company?: string; niche?: string; phone?: string }
  crm_scores?: { score: number }
}

export function PendingActions({ actions }: { actions: Action[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>(
    Object.fromEntries(actions.map(a => [a.id, a.output?.message ?? '']))
  )

  async function approve(actionId: string, edited: boolean) {
    await fetch(`/api/sdr/action/${actionId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messages[actionId], edited }),
    })
    // Remover da lista localmente
    window.location.reload()
  }

  if (!actions.length) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
      Nenhuma ação pendente — o SDR está operando normalmente.
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        Aguardando aprovação ({actions.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {actions.map(action => (
          <div key={action.id} style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: '12px', padding: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {action.crm_leads?.name}
                {action.crm_leads?.company && ` · ${action.crm_leads.company}`}
              </span>
              {action.crm_scores?.score && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                  borderRadius: '10px', background: '#fef3c7', color: '#b45309',
                }}>
                  Score {action.crm_scores.score}/10
                </span>
              )}
              <span style={{
                fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
                background: action.output?.channel === 'whatsapp' ? '#dcfce7' : '#dbeafe',
                color: action.output?.channel === 'whatsapp' ? '#15803d' : '#1d4ed8',
              }}>
                {action.output?.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
              </span>
            </div>

            {editingId === action.id ? (
              <textarea
                value={messages[action.id]}
                onChange={e => setMessages(p => ({ ...p, [action.id]: e.target.value }))}
                rows={4}
                style={{
                  width: '100%', background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-secondary)', borderRadius: '8px',
                  padding: '10px', fontSize: '13px', color: 'var(--color-text-primary)',
                  resize: 'vertical', marginBottom: '10px',
                }}
              />
            ) : (
              <p style={{
                fontSize: '13px', color: 'var(--color-text-secondary)',
                lineHeight: 1.6, background: 'var(--color-background-secondary)',
                borderRadius: '8px', padding: '10px', marginBottom: '10px',
                whiteSpace: 'pre-wrap',
              }}>
                {messages[action.id]}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => approve(action.id, editingId === action.id)}
                style={{
                  flex: 1, background: '#f59e0b', color: '#000', fontWeight: 700,
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer',
                }}
              >
                Aprovar e enviar
              </button>
              <button
                onClick={() => setEditingId(editingId === action.id ? null : action.id)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                  background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  color: 'var(--color-text-primary)', cursor: 'pointer',
                }}
              >
                {editingId === action.id ? 'Cancelar' : 'Editar'}
              </button>
              <button
                onClick={async () => {
                  await fetch(`/api/sdr/action/${action.id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ skipped: true }),
                  })
                  window.location.reload()
                }}
                style={{
                  padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                  background: 'transparent', border: '0.5px solid var(--color-border-tertiary)',
                  color: 'var(--color-text-secondary)', cursor: 'pointer',
                }}
              >
                Pular
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 5.3 — CRIAR `app/api/sdr/action/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, edited, skipped } = await request.json()

  if (skipped) {
    await supabase.from('sdr_actions').update({ status: 'skipped' }).eq('id', params.id)
    return NextResponse.json({ success: true })
  }

  // Atualizar mensagem se foi editada
  const { data: action } = await supabase
    .from('sdr_actions')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      output: { message, channel: 'whatsapp', edited: !!edited },
    })
    .eq('id', params.id)
    .select('lead_id, output')
    .single()

  // Registrar na lead_activities para rastreamento
  if (action?.lead_id) {
    await supabase.from('lead_activities').insert({
      lead_id: action.lead_id,
      type: 'whatsapp',
      direction: 'outbound',
      notes: message,
      created_by: user.id,
    }).catch(() => {})

    await supabase.from('crm_leads')
      .update({ first_contacted_at: new Date().toISOString(), status: 'contatado' })
      .eq('id', action.lead_id)
      .is('first_contacted_at', null)
  }

  // TODO Fase 2: disparar via Twilio WhatsApp API automaticamente
  // Por ora: mensagem aprovada e registrada — usuário envia manualmente

  return NextResponse.json({ success: true, message })
}
```

---

## BLOCO 6 — PROSPECÇÃO ATIVA (implementar por último)

### 6.1 — CRIAR `app/api/sdr/outbound/prospect/route.ts`

```typescript
// Implementar após SDR inbound funcionando e validado
// POST { niche, location, volume: 20, min_score: 6 }
// 1. IRIS busca empresas via Google Maps API (Apify)
// 2. HARBOR qualifica cada uma
// 3. Leads com score >= min_score aparecem em "Aguardando aprovação de abordagem"
// 4. Usuário aprova → ORACLE gera mensagem → aprovação final → envio
```

---

## CHECKLIST DE VALIDAÇÃO

**Infraestrutura:**
- [ ] Migration SQL aplicada — verificar todas as tabelas novas
- [ ] `AGENCY_WORKSPACE_ID` adicionado no Vercel (ID do workspace padrão)
- [ ] Cron adicionado ao `vercel.json`
- [ ] `CRON_SECRET` no Vercel

**Fluxo inbound básico:**
- [ ] `/captacao` abre sem login e submete formulário
- [ ] Lead aparece no CRM após submit
- [ ] HARBOR pontua o lead automaticamente (< 60s)
- [ ] IRIS enriquece o lead (1–2min)
- [ ] Mensagem aparece em "Aguardando aprovação" no painel SDR
- [ ] Botão "Aprovar e enviar" funciona
- [ ] Lead_activities registra o envio
- [ ] Cron D+2 gera follow-up se sem resposta

**Webhook ManyChat:**
- [ ] `GET /api/sdr/intake/webhook/[token]` retorna 200 com token válido
- [ ] Payload do ManyChat mapeado corretamente para crm_leads
- [ ] Lead criado e pipeline iniciado

**Detecção de interesse:**
- [ ] ORACLE analisa resposta e atribui score
- [ ] Score >= 6 → notificação aparece no sino
- [ ] Pipeline muda para 'waiting_human'
- [ ] Lead muda para status 'quente'

---

## COMANDO PARA O CLAUDE CODE

```
Leia o SPEC-SDR.md e implemente na ordem dos blocos.
Comece pelo BLOCO 0 (SQL).

Antes de criar qualquer arquivo verifique:
grep -rn "sdr_pipeline\|lead_enrichment\|lead_source\|sdr_action" --include="*.tsx" --include="*.ts" . | grep -v node_modules

Se não houver resultados, prossiga.

IMPORTANTE: lib/intelligence/apify.ts já existe (Fase 10).
NÃO recriar — apenas importar e reutilizar.

Após cada bloco: git add -A && git commit -m "feat(sdr): bloco N - descrição"
Após tudo: npm run build + git push
```
