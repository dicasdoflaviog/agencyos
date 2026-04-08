# PRD — Agency OS | Propostas Comerciais + Apresentações
> SDD Research Output · Abril 2026
> Fase: PROPOSTAS (entre Fase 9 e Fase 10)

---

## 1. CONTEXTO

### Problema
Criar uma proposta comercial hoje exige: pesquisa manual do prospect, escrita do documento,
formatação, exportação, envio. Processo de 2-4 horas por proposta. Com múltiplos prospects
no CRM, isso vira gargalo direto de vendas.

### Solução
O sistema coleta dados do prospect (já no CRM), aciona VANCE (estrategista) + LEDGER
(financeiro) via ORACLE, gera proposta completa e exporta em PDF profissional.
Dois documentos distintos:

- **Proposta Comercial** — para CONVERTER: escopo, entregáveis, investimento, CTA
- **Apresentação de Resultados** — para RETER: métricas do mês, criativos, próximos passos

### Dependências obrigatórias (fases anteriores)
- `crm_leads` table (Fase 3) — dados do prospect
- `clients` + `client_dna` (Fase 1) — DNA da agência
- `job_outputs` + `creative_assets` (Fase 1 + ATLAS) — criativos para o relatório
- `IntelligenceRouter.ts` (todas as fases) — orquestração de agentes
- `@react-pdf/renderer` (mencionado Fase 3, PRD-fase4) — geração de PDF

---

## 2. OBJETIVOS

| # | Objetivo | Métrica |
|---|----------|---------|
| O1 | Gerar proposta completa em < 3 minutos | Tempo cronometrado do clique ao PDF |
| O2 | Proposta com dados reais do prospect (do CRM) | 100% dos campos preenchidos automaticamente |
| O3 | PDF com branding da agência (logo, cores) | Visual consistente com design system |
| O4 | Relatório mensal gerado com 1 clique | Zero preenchimento manual de dados |
| O5 | Status da proposta rastreado no CRM | Lead atualiza para "proposta_enviada" automaticamente |

---

## 3. ARQUIVOS RELEVANTES EXISTENTES

```
app/(dashboard)/crm/page.tsx              ← kanban de leads (adicionar botão Proposta)
app/(dashboard)/clients/[id]/page.tsx     ← adicionar botão Relatório
app/api/agents/oracle/chat/route.ts       ← referência de pattern para nova rota
lib/openrouter/IntelligenceRouter.ts      ← usar routeChat() para gerar conteúdo
components/crm/KanbanCard.tsx             ← adicionar botão "Gerar proposta"
```

---

## 4. SCHEMA DO BANCO

### Tabela nova: `proposals`
```sql
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
  share_token   TEXT UNIQUE,
  share_expires TIMESTAMPTZ,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON proposals (lead_id);
CREATE INDEX ON proposals (client_id);
CREATE INDEX ON proposals (share_token);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_auth" ON proposals
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### Coluna nova em `crm_leads`
```sql
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
```

---

## 5. CONTEÚDO JSONB DA PROPOSTA

```typescript
// proposals.content — estrutura para tipo 'commercial'
interface CommercialContent {
  agency: {
    name: string
    tagline: string
    logo_url: string
    primary_color: string
  }
  prospect: {
    name: string
    niche: string
    pain_points: string
    goals: string
    estimated_budget: string
  }
  diagnosis: string          // ORACLE analisa dores e gera diagnóstico
  services: Array<{
    name: string
    description: string
    deliverables: string[]
  }>
  investment: {
    monthly: number
    setup?: number
    currency: 'BRL'
    billing: 'monthly' | 'project'
  }
  timeline: string
  next_steps: string[]
  validity_days: number      // quantos dias a proposta é válida
}

// proposals.content — estrutura para tipo 'results'
interface ResultsContent {
  client: { name: string; logo_url: string }
  period: { month: string; year: number }
  summary: string            // ORACLE gera narrativa do mês
  metrics: {
    jobs_completed: number
    outputs_approved: number
    creatives_generated: number
    ig_followers_delta?: number
    ig_engagement_avg?: number
    ads_spend?: number
    ads_roas?: number
  }
  highlights: string[]       // 3 conquistas do mês
  creatives: Array<{         // thumbnails dos criativos aprovados
    image_url: string
    format: string
    type: string
  }>
  next_month_plan: string    // ORACLE gera plano do próximo mês
}
```

---

## 6. AGENTES ENVOLVIDOS

| Agente | Papel | Prompt base |
|--------|-------|-------------|
| VANCE | Estrategista — define escopo de serviços e diagnóstico | Analisa dores + goals do prospect |
| LEDGER | Financeiro — sugere valor de investimento | Baseado em niche + serviços + mercado BR |
| ORACLE | Orquestra os dois e monta o JSON final | Consolida outputs em estrutura tipada |
| VECTOR | Analytics — coleta métricas do mês para relatório | Busca job_outputs + creative_assets |

---

## 7. ROTAS DE API

```
POST /api/proposals/generate        — gerar proposta (commercial ou results)
GET  /api/proposals/[id]            — buscar proposta
PATCH /api/proposals/[id]           — atualizar status
POST /api/proposals/[id]/pdf        — gerar PDF e salvar Storage
GET  /api/proposals/[id]/share      — gerar link compartilhável (share_token)
GET  /api/proposals/share/[token]   — rota pública de visualização
```

---

## 8. FLUXO COMERCIAL

```
Lead no CRM (status: proposta)
  → Botão "Gerar Proposta" no KanbanCard
  → Modal: revisar dados do prospect + selecionar serviços de interesse
  → POST /api/proposals/generate { lead_id, services, budget_range }
    → VANCE gera diagnóstico + escopo
    → LEDGER sugere investimento
    → ORACLE consolida em CommercialContent JSON
    → INSERT proposals (status: draft, content: JSON)
  → Preview da proposta na tela (HTML renderizado)
  → Botão "Gerar PDF" → POST /api/proposals/[id]/pdf
    → @react-pdf/renderer renderiza ProposalPDF component
    → Upload no Supabase Storage (proposals/{id}.pdf)
    → UPDATE proposals.pdf_url
  → Botão "Compartilhar" → gera share_token + link público
  → UPDATE crm_leads.proposal_id + status = 'proposta_enviada'
```

## 9. FLUXO RELATÓRIO

```
Cliente ativo → aba Overview → botão "Relatório do Mês"
  → Seleciona mês/ano
  → POST /api/proposals/generate { client_id, type: 'results', period }
    → VECTOR busca jobs + outputs + creative_assets do período
    → ORACLE gera narrativa + plano próximo mês
    → INSERT proposals (type: results, content: ResultsContent)
  → Preview HTML do relatório
  → Botão "Gerar PDF" → mesmo flow do comercial
  → Botão "Compartilhar" → link público com expiração 30 dias
```

---

## 10. O QUE NÃO ENTRA NESTA FASE

```
❌ Assinatura digital da proposta — futura integração DocuSign
❌ Proposta interativa em HTML (scroll-telling) — fase posterior
❌ Multi-idioma (EN/ES) — fase posterior
❌ Templates customizáveis pelo usuário — fase posterior
❌ Pagamento direto na proposta — Fase SaaS
```

