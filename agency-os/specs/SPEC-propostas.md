# SPEC — Agency OS | Propostas Comerciais + Apresentações
> SDD Etapa 2 · Plano tático · Abril 2026
> Baseado em: PRD-propostas.md

---

## ORDEM DE IMPLEMENTAÇÃO

```
BLOCO 0 — Migration SQL + Storage bucket
BLOCO 1 — Rota POST /api/proposals/generate
BLOCO 2 — Rota POST /api/proposals/[id]/pdf
BLOCO 3 — Rota GET /api/proposals/[id]/share + rota pública
BLOCO 4 — Componente ProposalPreview (HTML)
BLOCO 5 — Componente ProposalPDF (@react-pdf/renderer)
BLOCO 6 — UI: Modal de geração no CRM KanbanCard
BLOCO 7 — UI: Botão Relatório na página do cliente
BLOCO 8 — PATCH status + update crm_leads.proposal_id
```

---

## BLOCO 0 — MIGRATION + STORAGE

### 0.1 — SQL (rodar no Supabase SQL Editor)

```sql
-- proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('commercial', 'results')),
  title         TEXT NOT NULL,
  status        TEXT DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','negotiating','approved','rejected')),
  content       JSONB NOT NULL DEFAULT '{}',
  pdf_url       TEXT,
  share_token   TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  share_expires TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_lead     ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client   ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token    ON proposals(share_token);
CREATE INDEX IF NOT EXISTS idx_proposals_created  ON proposals(created_at DESC);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_auth" ON proposals
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Coluna em crm_leads (só adicionar se não existir)
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
```

### 0.2 — Storage bucket (Supabase Dashboard)
```
Nome: proposals
Public: NÃO (private)
MIME permitidos: application/pdf
Max: 20MB
```

---

## BLOCO 1 — POST /api/proposals/generate

### 1.1 — CRIAR `app/api/proposals/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { type, lead_id, client_id, services, budget_range, period } = body

    if (!type) return NextResponse.json({ error: 'type obrigatório' }, { status: 400 })

    // ── TIPO: commercial ──────────────────────────────────────────
    if (type === 'commercial') {
      if (!lead_id) return NextResponse.json({ error: 'lead_id obrigatório para commercial' }, { status: 400 })

      // 1. Buscar dados do lead
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('name, company, niche, notes, budget, contact_email')
        .eq('id', lead_id)
        .single()

      if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

      // 2. Buscar workspace/agência (perfil do admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      // 3. VANCE — gera diagnóstico + escopo
      const vancePrompt = `
Você é VANCE, estrategista de marketing digital.
Analise este prospect e gere um diagnóstico + escopo de serviços em JSON:

PROSPECT:
- Nome: ${lead.name} | Empresa: ${lead.company ?? 'N/A'}
- Nicho: ${lead.niche ?? 'Não informado'}
- Orçamento estimado: ${budget_range ?? lead.budget ?? 'A definir'}
- Serviços de interesse: ${services?.join(', ') ?? 'A definir'}
- Notas: ${lead.notes ?? 'Nenhuma'}

Retorne SOMENTE JSON válido (sem markdown, sem explicações):
{
  "diagnosis": "string — 2-3 frases sobre as dores identificadas",
  "services": [
    { "name": "string", "description": "string", "deliverables": ["string"] }
  ],
  "timeline": "string — ex: 30 dias para onboarding + operação contínua",
  "next_steps": ["string", "string", "string"]
}
`

      const vanceResult = await IntelligenceRouter.routeChat('vance', [
        { role: 'user', content: vancePrompt }
      ], { maxTokens: 1000 })

      let vanceData: Record<string, unknown> = {}
      try {
        const clean = vanceResult.content.replace(/```json|```/g, '').trim()
        vanceData = JSON.parse(clean)
      } catch { vanceData = { diagnosis: vanceResult.content, services: [], timeline: '', next_steps: [] } }

      // 4. LEDGER — sugere investimento
      const ledgerPrompt = `
Você é LEDGER, especialista financeiro de agência de marketing.
Sugira um valor de investimento mensal para este cliente em JSON:

NICHO: ${lead.niche ?? 'Marketing Digital'}
SERVIÇOS: ${JSON.stringify(vanceData.services ?? services ?? [])}
ORÇAMENTO DECLARADO: ${budget_range ?? lead.budget ?? 'Não informado'}
MERCADO: Brasil (BRL)

Retorne SOMENTE JSON válido:
{
  "monthly": 2500,
  "setup": 0,
  "billing": "monthly",
  "justification": "string curta"
}
`

      const ledgerResult = await IntelligenceRouter.routeChat('ledger', [
        { role: 'user', content: ledgerPrompt }
      ], { maxTokens: 300 })

      let ledgerData: Record<string, unknown> = { monthly: 2500, setup: 0, billing: 'monthly' }
      try {
        const clean = ledgerResult.content.replace(/```json|```/g, '').trim()
        ledgerData = JSON.parse(clean)
      } catch { /* usa default */ }

      // 5. Montar content final
      const content = {
        agency: {
          name: profile?.name ?? 'Agency OS',
          tagline: 'Marketing com Inteligência Artificial',
          logo_url: '',
          primary_color: '#F59E0B',
        },
        prospect: {
          name: lead.name,
          company: lead.company ?? '',
          niche: lead.niche ?? '',
          pain_points: lead.notes ?? '',
          goals: services?.join(', ') ?? '',
          estimated_budget: budget_range ?? lead.budget ?? '',
          contact_email: lead.contact_email ?? '',
        },
        diagnosis: vanceData.diagnosis ?? '',
        services: vanceData.services ?? [],
        investment: {
          monthly: ledgerData.monthly ?? 2500,
          setup: ledgerData.setup ?? 0,
          currency: 'BRL',
          billing: ledgerData.billing ?? 'monthly',
        },
        timeline: vanceData.timeline ?? '30 dias',
        next_steps: vanceData.next_steps ?? [],
        validity_days: 15,
      }

      // 6. Salvar no banco
      const { data: proposal, error } = await supabase
        .from('proposals')
        .insert({
          lead_id,
          type: 'commercial',
          title: `Proposta Comercial — ${lead.company ?? lead.name}`,
          status: 'draft',
          content,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, proposal })
    }

    // ── TIPO: results ─────────────────────────────────────────────
    if (type === 'results') {
      if (!client_id) return NextResponse.json({ error: 'client_id obrigatório para results' }, { status: 400 })

      const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = period ?? {}

      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate   = new Date(year, month, 0, 23, 59, 59).toISOString()

      // Buscar cliente
      const { data: client } = await supabase
        .from('clients')
        .select('name, logo_url, niche')
        .eq('id', client_id)
        .single()

      // Buscar jobs do período
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status')
        .eq('client_id', client_id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      const jobIds = (jobs ?? []).map(j => j.id)
      const completedJobs = (jobs ?? []).filter(j => j.status === 'done').length

      // Buscar outputs aprovados
      const { data: outputs } = await supabase
        .from('job_outputs')
        .select('id, output_type, status')
        .in('job_id', jobIds.length ? jobIds : ['none'])
        .eq('status', 'approved')

      // Buscar criativos aprovados
      const { data: creatives } = await supabase
        .from('creative_assets')
        .select('image_url, format, style')
        .eq('client_id', client_id)
        .eq('status', 'approved')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .limit(9)

      // ORACLE gera narrativa
      const oraclePrompt = `
Você é ORACLE. Gere um resumo executivo e plano do próximo mês em JSON para o relatório de ${month}/${year}:

CLIENTE: ${client?.name} — ${client?.niche}
JOBS CONCLUÍDOS: ${completedJobs}
OUTPUTS APROVADOS: ${(outputs ?? []).length}
CRIATIVOS GERADOS: ${(creatives ?? []).length}

Retorne SOMENTE JSON válido:
{
  "summary": "string — 2-3 frases sobre o mês, conquistas e contexto",
  "highlights": ["conquista 1", "conquista 2", "conquista 3"],
  "next_month_plan": "string — 2-3 frases sobre o que vem pela frente"
}
`

      const oracleResult = await IntelligenceRouter.routeChat('oracle', [
        { role: 'user', content: oraclePrompt }
      ], { maxTokens: 500 })

      let narrative: Record<string, unknown> = {}
      try {
        const clean = oracleResult.content.replace(/```json|```/g, '').trim()
        narrative = JSON.parse(clean)
      } catch { narrative = { summary: oracleResult.content, highlights: [], next_month_plan: '' } }

      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

      const content = {
        client: { name: client?.name ?? '', logo_url: client?.logo_url ?? '' },
        period: { month: monthNames[month - 1], year },
        summary: narrative.summary ?? '',
        metrics: {
          jobs_completed: completedJobs,
          outputs_approved: (outputs ?? []).length,
          creatives_generated: (creatives ?? []).length,
        },
        highlights: narrative.highlights ?? [],
        creatives: (creatives ?? []).slice(0, 9).map(c => ({
          image_url: c.image_url,
          format: c.format,
          type: 'criativo',
        })),
        next_month_plan: narrative.next_month_plan ?? '',
      }

      const { data: proposal, error } = await supabase
        .from('proposals')
        .insert({
          client_id,
          type: 'results',
          title: `Relatório ${monthNames[month - 1]} ${year} — ${client?.name}`,
          status: 'draft',
          content,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, proposal })
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 })

  } catch (error) {
    console.error('[proposals/generate]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
```

---

## BLOCO 2 — POST /api/proposals/[id]/pdf

### 2.1 — CRIAR `app/api/proposals/[id]/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { CommercialPDF } from '@/components/proposals/CommercialPDF'
import { ResultsPDF } from '@/components/proposals/ResultsPDF'
import React from 'react'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: proposal } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })

    // Renderizar PDF com o componente correto
    const element = proposal.type === 'commercial'
      ? React.createElement(CommercialPDF, { content: proposal.content })
      : React.createElement(ResultsPDF, { content: proposal.content })

    const pdfBuffer = await renderToBuffer(element)

    // Upload no Supabase Storage
    const path = `${params.id}.pdf`
    const { error: storageErr } = await supabase.storage
      .from('proposals')
      .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (storageErr) throw storageErr

    const { data: urlData } = await supabase.storage
      .from('proposals')
      .createSignedUrl(path, 60 * 60 * 24 * 30) // 30 dias

    const pdfUrl = urlData?.signedUrl ?? ''

    await supabase.from('proposals').update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() }).eq('id', params.id)

    return NextResponse.json({ success: true, pdf_url: pdfUrl })
  } catch (error) {
    console.error('[proposals/pdf]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro' }, { status: 500 })
  }
}
```

---

## BLOCO 3 — SHARE + ROTA PÚBLICA

### 3.1 — CRIAR `app/api/proposals/[id]/share/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: proposal } = await supabase
    .from('proposals')
    .select('share_token, share_expires')
    .eq('id', params.id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agencyos-cyan.vercel.app'
  const shareUrl = `${baseUrl}/p/${proposal.share_token}`

  return NextResponse.json({ url: shareUrl, expires: proposal.share_expires })
}
```

### 3.2 — CRIAR `app/p/[token]/page.tsx` (rota pública, sem auth)

```tsx
import { createAdminClient } from '@/lib/supabase/server'
import { ProposalPublicView } from '@/components/proposals/ProposalPublicView'
import { notFound } from 'next/navigation'

export default async function PublicProposalPage({
  params,
}: {
  params: { token: string }
}) {
  const supabase = createAdminClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('share_token', params.token)
    .gt('share_expires', new Date().toISOString())
    .single()

  if (!proposal) notFound()

  return <ProposalPublicView proposal={proposal} />
}
```

---

## BLOCO 4 — COMPONENTE ProposalPublicView (preview HTML)

### 4.1 — CRIAR `components/proposals/ProposalPublicView.tsx`

```tsx
'use client'
// Renderiza proposta em HTML para preview na tela e na rota /p/[token]

interface Props {
  proposal: {
    type: 'commercial' | 'results'
    title: string
    content: Record<string, unknown>
    pdf_url?: string | null
  }
}

export function ProposalPublicView({ proposal }: Props) {
  const c = proposal.content as Record<string, unknown>

  if (proposal.type === 'commercial') {
    const agency = c.agency as Record<string, string>
    const prospect = c.prospect as Record<string, string>
    const investment = c.investment as Record<string, unknown>
    const services = (c.services as Array<Record<string, unknown>>) ?? []

    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white">
        {/* Header com branding da agência */}
        <div className="border-b border-white/10 px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-[var(--color-accent)] text-sm font-semibold">{agency?.name}</p>
            <p className="text-white/40 text-xs">{agency?.tagline}</p>
          </div>
          <span className="text-xs text-white/30">Proposta válida por {String(c.validity_days ?? 15)} dias</span>
        </div>

        <div className="max-w-3xl mx-auto px-8 py-12 space-y-10">
          {/* Título */}
          <div>
            <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Proposta Comercial</p>
            <h1 className="text-3xl font-bold">{prospect?.company || prospect?.name}</h1>
            <p className="text-white/50 mt-1">{prospect?.niche}</p>
          </div>

          {/* Diagnóstico */}
          <section>
            <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-3">Diagnóstico</h2>
            <p className="text-white/80 leading-relaxed">{String(c.diagnosis ?? '')}</p>
          </section>

          {/* Serviços */}
          <section>
            <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-4">Escopo de Serviços</h2>
            <div className="space-y-4">
              {services.map((svc, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-5">
                  <p className="font-semibold mb-1">{String(svc.name)}</p>
                  <p className="text-white/60 text-sm mb-3">{String(svc.description)}</p>
                  <div className="flex flex-wrap gap-2">
                    {((svc.deliverables as string[]) ?? []).map((d, j) => (
                      <span key={j} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1">{d}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Investimento */}
          <section className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-2xl p-8">
            <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-4">Investimento</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                  .format(Number(investment?.monthly ?? 0))}
              </span>
              <span className="text-white/40">/mês</span>
            </div>
            {Number(investment?.setup ?? 0) > 0 && (
              <p className="text-white/40 text-sm mt-2">
                + Setup: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(investment.setup))}
              </p>
            )}
          </section>

          {/* Próximos passos */}
          <section>
            <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-4">Próximos Passos</h2>
            <ol className="space-y-2">
              {((c.next_steps as string[]) ?? []).map((step, i) => (
                <li key={i} className="flex gap-3 text-white/70">
                  <span className="text-[var(--color-accent)] font-bold">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* Download PDF */}
          {proposal.pdf_url && (
            <div className="text-center pt-4">
              <a href={proposal.pdf_url} download
                className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-black
                  font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">
                Baixar PDF
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Results view — similar mas com métricas e criativos
  const client = c.client as Record<string, string>
  const metrics = c.metrics as Record<string, number>
  const creatives = (c.creatives as Array<Record<string, string>>) ?? []
  const period = c.period as Record<string, unknown>

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-3xl mx-auto px-8 py-12 space-y-10">
        <div>
          <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Relatório de Resultados</p>
          <h1 className="text-3xl font-bold">{client?.name}</h1>
          <p className="text-white/50">{String(period?.month)} {String(period?.year)}</p>
        </div>

        <p className="text-white/80 leading-relaxed">{String(c.summary ?? '')}</p>

        <section>
          <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-4">Números do Mês</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Jobs concluídos', value: metrics?.jobs_completed ?? 0 },
              { label: 'Outputs aprovados', value: metrics?.outputs_approved ?? 0 },
              { label: 'Criativos gerados', value: metrics?.creatives_generated ?? 0 },
            ].map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[var(--color-accent)]">{m.value}</p>
                <p className="text-white/40 text-xs mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        {creatives.length > 0 && (
          <section>
            <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-4">Criativos do Mês</h2>
            <div className="grid grid-cols-3 gap-3">
              {creatives.map((cr, i) => (
                <img key={i} src={cr.image_url} alt={cr.format}
                  className="aspect-square object-cover rounded-xl w-full" />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[var(--color-accent)] text-xs uppercase tracking-widest mb-3">Plano do Próximo Mês</h2>
          <p className="text-white/80 leading-relaxed">{String(c.next_month_plan ?? '')}</p>
        </section>
      </div>
    </div>
  )
}
```

---

## BLOCO 5 — PDF COMPONENTS (@react-pdf/renderer)

### 5.1 — CRIAR `components/proposals/CommercialPDF.tsx`

```tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Registrar fontes (usar Inter via CDN ou arquivo local)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: { fontFamily: 'Inter', backgroundColor: '#0D0D0D', color: '#F5F2EC', padding: 48 },
  accent: { color: '#F59E0B' },
  label: { fontSize: 8, color: '#888880', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#888880', marginBottom: 32 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 8, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  body: { fontSize: 11, lineHeight: 1.6, color: '#D4D0C8' },
  serviceCard: { border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, marginBottom: 10 },
  serviceName: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  serviceDesc: { fontSize: 10, color: '#888880', marginBottom: 8 },
  deliverable: { fontSize: 9, color: '#A8A49C', marginLeft: 8, marginBottom: 2 },
  investBox: { backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 24, marginBottom: 28 },
  investValue: { fontSize: 36, fontWeight: 700, color: '#F59E0B' },
  investPeriod: { fontSize: 14, color: '#888880' },
  step: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stepNum: { fontSize: 11, color: '#F59E0B', fontWeight: 700, width: 16 },
  stepText: { fontSize: 11, color: '#D4D0C8', flex: 1 },
})

interface CommercialPDFProps {
  content: Record<string, unknown>
}

export function CommercialPDF({ content }: CommercialPDFProps) {
  const c = content
  const agency = c.agency as Record<string, string>
  const prospect = c.prospect as Record<string, string>
  const investment = c.investment as Record<string, unknown>
  const services = (c.services as Array<Record<string, unknown>>) ?? []
  const nextSteps = (c.next_steps as string[]) ?? []

  const formatBRL = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <Text style={[styles.label, styles.accent]}>{agency?.name}</Text>
          <Text style={styles.title}>{prospect?.company || prospect?.name}</Text>
          <Text style={styles.subtitle}>{prospect?.niche}</Text>
        </View>

        {/* Diagnóstico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          <Text style={styles.body}>{String(c.diagnosis ?? '')}</Text>
        </View>

        {/* Serviços */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escopo de Serviços</Text>
          {services.map((svc, i) => (
            <View key={i} style={styles.serviceCard}>
              <Text style={styles.serviceName}>{String(svc.name)}</Text>
              <Text style={styles.serviceDesc}>{String(svc.description)}</Text>
              {((svc.deliverables as string[]) ?? []).map((d, j) => (
                <Text key={j} style={styles.deliverable}>• {d}</Text>
              ))}
            </View>
          ))}
        </View>

        {/* Investimento */}
        <View style={styles.investBox}>
          <Text style={styles.sectionTitle}>Investimento</Text>
          <Text style={styles.investValue}>
            {formatBRL(Number(investment?.monthly ?? 0))}
            <Text style={styles.investPeriod}>/mês</Text>
          </Text>
          {Number(investment?.setup ?? 0) > 0 && (
            <Text style={{ fontSize: 10, color: '#888880', marginTop: 4 }}>
              + Setup: {formatBRL(Number(investment.setup))}
            </Text>
          )}
        </View>

        {/* Próximos Passos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos Passos</Text>
          {nextSteps.map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 9, color: '#888880', textAlign: 'center' }}>
            Proposta válida por {String(c.validity_days ?? 15)} dias · {agency?.name}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
```

### 5.2 — CRIAR `components/proposals/ResultsPDF.tsx`

```tsx
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
})

const S = StyleSheet.create({
  page: { fontFamily: 'Inter', backgroundColor: '#0D0D0D', color: '#F5F2EC', padding: 48 },
  label: { fontSize: 8, color: '#888880', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  period: { fontSize: 12, color: '#888880', marginBottom: 32 },
  sTitle: { fontSize: 8, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  body: { fontSize: 11, lineHeight: 1.6, color: '#D4D0C8', marginBottom: 24 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  metricCard: { flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: 700, color: '#F59E0B' },
  metricLabel: { fontSize: 8, color: '#888880', marginTop: 4, textAlign: 'center' },
  creativesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 },
  creativeImg: { width: '31%', aspectRatio: 1, borderRadius: 6 },
})

interface ResultsPDFProps {
  content: Record<string, unknown>
}

export function ResultsPDF({ content }: ResultsPDFProps) {
  const c = content
  const client = c.client as Record<string, string>
  const metrics = c.metrics as Record<string, number>
  const period = c.period as Record<string, unknown>
  const creatives = (c.creatives as Array<Record<string, string>>) ?? []
  const highlights = (c.highlights as string[]) ?? []

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={{ marginBottom: 40 }}>
          <Text style={S.label}>Relatório de Resultados</Text>
          <Text style={S.title}>{client?.name}</Text>
          <Text style={S.period}>{String(period?.month)} {String(period?.year)}</Text>
        </View>

        <Text style={S.body}>{String(c.summary ?? '')}</Text>

        <View style={{ marginBottom: 8 }}>
          <Text style={S.sTitle}>Números do Mês</Text>
        </View>
        <View style={S.metricsRow}>
          {[
            { v: metrics?.jobs_completed ?? 0, l: 'Jobs' },
            { v: metrics?.outputs_approved ?? 0, l: 'Aprovados' },
            { v: metrics?.creatives_generated ?? 0, l: 'Criativos' },
          ].map((m, i) => (
            <View key={i} style={S.metricCard}>
              <Text style={S.metricValue}>{m.v}</Text>
              <Text style={S.metricLabel}>{m.l}</Text>
            </View>
          ))}
        </View>

        {highlights.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={S.sTitle}>Destaques</Text>
            {highlights.map((h, i) => (
              <Text key={i} style={{ fontSize: 11, color: '#D4D0C8', marginBottom: 4 }}>• {h}</Text>
            ))}
          </View>
        )}

        {creatives.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={S.sTitle}>Criativos do Mês</Text>
            <View style={S.creativesGrid}>
              {creatives.slice(0, 9).map((cr, i) => (
                <Image key={i} src={cr.image_url} style={S.creativeImg} />
              ))}
            </View>
          </View>
        )}

        <View>
          <Text style={S.sTitle}>Plano do Próximo Mês</Text>
          <Text style={S.body}>{String(c.next_month_plan ?? '')}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

---

## BLOCO 6 — UI: MODAL DE GERAÇÃO NO CRM

### 6.1 — CRIAR `components/proposals/GenerateProposalModal.tsx`

```tsx
'use client'
import { useState } from 'react'
import { Loader2, FileText, X } from 'lucide-react'
import { ProposalPublicView } from './ProposalPublicView'

const SERVICES_OPTIONS = [
  'Gestão de Redes Sociais', 'Tráfego Pago (Meta Ads)', 'Tráfego Pago (Google Ads)',
  'Produção de Conteúdo', 'Branding e Identidade Visual', 'Gestão de CRM',
  'E-mail Marketing', 'SEO', 'Copywriting', 'Automação de Marketing',
]

interface Props {
  leadId: string
  leadName: string
  onClose: () => void
}

type Step = 'form' | 'generating' | 'preview'

export function GenerateProposalModal({ leadId, leadName, onClose }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [budgetRange, setBudgetRange] = useState('')
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const toggleService = (s: string) =>
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  async function generate() {
    setStep('generating')
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'commercial', lead_id: leadId, services: selectedServices, budget_range: budgetRange }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProposal(data.proposal)
      setStep('preview')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar')
      setStep('form')
    }
  }

  async function generatePdf() {
    if (!proposal) return
    setIsGeneratingPdf(true)
    const res = await fetch(`/api/proposals/${proposal.id}/pdf`, { method: 'POST' })
    const data = await res.json()
    setPdfUrl(data.pdf_url ?? null)
    setIsGeneratingPdf(false)
  }

  async function getShareLink() {
    if (!proposal) return
    const res = await fetch(`/api/proposals/${proposal.id}/share`)
    const data = await res.json()
    setShareUrl(data.url ?? null)
    if (data.url) navigator.clipboard.writeText(data.url)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '16px', width: '100%', maxWidth: step === 'preview' ? '800px' : '560px', maxHeight: '90vh', overflow: 'auto', margin: '16px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={16} color="#f59e0b" />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {step === 'preview' ? 'Proposta gerada' : `Gerar proposta — ${leadName}`}
            </span>
          </div>
          <button onClick={onClose}><X size={16} color="var(--color-text-secondary)" /></button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* STEP: form */}
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>Serviços de interesse</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SERVICES_OPTIONS.map(s => (
                    <button key={s} onClick={() => toggleService(s)}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                        background: selectedServices.includes(s) ? '#fef3c7' : 'var(--color-background-secondary)',
                        color: selectedServices.includes(s) ? '#b45309' : 'var(--color-text-secondary)',
                        border: selectedServices.includes(s) ? '0.5px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Orçamento estimado do prospect</p>
                <input value={budgetRange} onChange={e => setBudgetRange(e.target.value)}
                  placeholder="Ex: R$ 2.000 a R$ 3.000/mês"
                  style={{ width: '100%', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-primary)' }} />
              </div>
              <button onClick={generate} disabled={selectedServices.length === 0}
                style={{ background: '#f59e0b', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: selectedServices.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedServices.length === 0 ? 0.4 : 1, border: 'none' }}>
                Gerar com ORACLE + VANCE
              </button>
            </div>
          )}

          {/* STEP: generating */}
          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <Loader2 size={32} color="#f59e0b" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>ORACLE + VANCE estão gerando a proposta...</p>
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && proposal && (
            <div>
              <div style={{ maxHeight: '60vh', overflow: 'auto', borderRadius: '10px', marginBottom: '1rem' }}>
                <ProposalPublicView proposal={proposal as Parameters<typeof ProposalPublicView>[0]['proposal']} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={generatePdf} disabled={isGeneratingPdf}
                  style={{ flex: 1, background: '#f59e0b', color: '#000', fontWeight: 700, padding: '10px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                  {isGeneratingPdf ? 'Gerando PDF...' : pdfUrl ? 'PDF gerado ✓' : 'Gerar PDF'}
                </button>
                {pdfUrl && (
                  <a href={pdfUrl} download
                    style={{ flex: 1, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontWeight: 600, padding: '10px', borderRadius: '8px', fontSize: '13px', border: '0.5px solid var(--color-border-tertiary)', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Baixar PDF
                  </a>
                )}
                <button onClick={getShareLink}
                  style={{ flex: 1, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontWeight: 600, padding: '10px', borderRadius: '8px', fontSize: '13px', border: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}>
                  {shareUrl ? 'Link copiado ✓' : 'Copiar link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## BLOCO 7 — UI: BOTÃO RELATÓRIO NA PÁGINA DO CLIENTE

### 7.1 — MODIFICAR `app/(dashboard)/clients/[id]/page.tsx`
Adicionar botão "Relatório do mês" na aba Overview:

```tsx
// Importar no topo:
import { GenerateResultsModal } from '@/components/proposals/GenerateResultsModal'

// Estado:
const [showResultsModal, setShowResultsModal] = useState(false)

// No JSX da aba Overview, ao lado dos KPIs:
<button
  onClick={() => setShowResultsModal(true)}
  className="flex items-center gap-2 rounded-lg border border-white/10 
    px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:border-white/20 transition-all"
>
  <BarChart2 size={14} />
  Relatório do mês
</button>

{showResultsModal && (
  <GenerateResultsModal
    clientId={params.id}
    clientName={client.name}
    onClose={() => setShowResultsModal(false)}
  />
)}
```

### 7.2 — CRIAR `components/proposals/GenerateResultsModal.tsx`
Similar ao `GenerateProposalModal` mas para type='results'. Tem seletor de mês/ano e chama
`POST /api/proposals/generate` com `{ type: 'results', client_id, period: { month, year } }`.

---

## BLOCO 8 — PATCH STATUS + UPDATE CRM

### 8.1 — CRIAR `app/api/proposals/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('lead_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sincronizar status no lead do CRM
  if (proposal.lead_id && status === 'sent') {
    await supabase
      .from('crm_leads')
      .update({ proposal_id: params.id, status: 'proposta_enviada' })
      .eq('id', proposal.lead_id)
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data } = await supabase.from('proposals').select('*').eq('id', params.id).single()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
```

---

## CHECKLIST DE VALIDAÇÃO

**Proposta Comercial:**
- [ ] Migration SQL aplicada (proposals + crm_leads.proposal_id)
- [ ] Bucket `proposals` criado no Supabase Storage
- [ ] `@react-pdf/renderer` instalado: `npm install @react-pdf/renderer`
- [ ] CRM kanban card tem botão "Gerar Proposta"
- [ ] Modal abre, serviços selecionados, clique em Gerar
- [ ] Proposta aparece em preview < 30s
- [ ] "Gerar PDF" cria arquivo e URL de download funciona
- [ ] "Copiar link" gera URL `/p/[token]` acessível sem login
- [ ] Status do lead atualiza para "proposta_enviada" após envio

**Relatório de Resultados:**
- [ ] Botão "Relatório do mês" visível na Overview do cliente
- [ ] Modal abre com seletor de mês/ano
- [ ] Relatório gerado com métricas reais do banco
- [ ] Criativos do mês aparecem como grid de thumbnails no PDF
- [ ] Link compartilhável expira em 30 dias

---

## COMANDO PARA O CLAUDE CODE

```
Leia o SPEC-propostas.md e implemente seguindo a ordem dos blocos.
Comece pelo BLOCO 0 (SQL Migration).

Antes de criar qualquer arquivo, execute:
grep -rn "proposals" --include="*.tsx" --include="*.ts" . | grep -v node_modules

Se não houver resultados, prossiga com a criação.
Após cada bloco: git add -A && git commit -m "feat(proposals): bloco N - descrição"
```

