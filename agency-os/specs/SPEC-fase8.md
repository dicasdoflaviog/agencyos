# SPEC-fase8 — Agency OS
> Software Design Document · Fase 10 — Intelligence Layer

---

## 1. Arquivos a Criar

```
web/
├── supabase/migration_intelligence.sql
├── app/api/intelligence/
│   ├── maps/route.ts
│   ├── ads/route.ts
│   └── crawl/route.ts
├── components/intelligence/
│   ├── IntelligencePanel.tsx
│   └── SnapshotCard.tsx
└── lib/intelligence/
    ├── apify.ts            # cliente Apify reutilizável
    └── oracle-inject.ts    # helper de injeção no system prompt
```

```
web/app/(dashboard)/clients/[id]/
└── tabs/IntelligenceTab.tsx   # aba nova na página do cliente
```

---

## 2. BLOCO 0 — Migration

```sql
-- supabase/migration_intelligence.sql

CREATE TABLE IF NOT EXISTS intelligence_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE,
  workspace_id uuid,
  type         text NOT NULL CHECK (type IN ('maps', 'ads', 'crawl')),
  query        text,
  data         jsonb NOT NULL DEFAULT '{}',
  summary      text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_client_type
  ON intelligence_snapshots(client_id, type, created_at DESC);

-- RLS
ALTER TABLE intelligence_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members" ON intelligence_snapshots
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 3. BLOCO 1 — lib/intelligence/apify.ts

```typescript
// lib/intelligence/apify.ts
// Cliente Apify centralizado — reutilizado pelas 3 rotas

const APIFY_BASE = 'https://api.apify.com/v2'

interface ApifyRunOptions {
  actorId: string
  input: Record<string, unknown>
  timeoutSecs?: number
}

export async function runApifyActor<T = unknown>(options: ApifyRunOptions): Promise<T[]> {
  const apiKey = process.env.APIFY_API_KEY
  if (!apiKey) throw new Error('APIFY_API_KEY não configurada')

  const { actorId, input, timeoutSecs = 120 } = options

  // Inicia run síncrona (waitForFinish)
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=${timeoutSecs}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )

  if (!runRes.ok) {
    const err = await runRes.text()
    throw new Error(`Apify error (${actorId}): ${err}`)
  }

  const data = await runRes.json() as T[]
  return Array.isArray(data) ? data : []
}
```

---

## 4. BLOCO 2 — Rotas de Inteligência

### 4.1 — /api/intelligence/maps/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runApifyActor } from '@/lib/intelligence/apify'

export const dynamic = 'force-dynamic'

interface MapsResult {
  title?: string
  website?: string
  phone?: string
  address?: string
  totalScore?: number
  reviewsCount?: number
  categoryName?: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query    = searchParams.get('query')
  const location = searchParams.get('location') ?? 'Brasil'
  const clientId = searchParams.get('client_id')

  if (!query) return Response.json({ error: 'query obrigatório' }, { status: 400 })

  let results: MapsResult[]
  try {
    results = await runApifyActor<MapsResult>({
      actorId: 'nwua9Gu5YrADL7ZDj',
      input: {
        searchStringsArray: [`${query} ${location}`],
        maxCrawledPlaces: 20,
        language: 'pt',
        exportPlaceUrls: false,
      },
      timeoutSecs: 90,
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }

  // Salvar snapshot
  const { data: snapshot } = await supabase
    .from('intelligence_snapshots')
    .insert({
      client_id: clientId,
      type: 'maps',
      query: `${query} — ${location}`,
      data: results,
    })
    .select('id')
    .single()

  return Response.json({ results, snapshotId: snapshot?.id })
}
```

### 4.2 — /api/intelligence/ads/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runApifyActor } from '@/lib/intelligence/apify'

export const dynamic = 'force-dynamic'

interface AdResult {
  id?: string
  adCreativeBody?: string
  adCreativeLinkCaption?: string
  adCreativeLinkTitle?: string
  startDate?: string
  status?: string
  impressionsWithIndex?: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = searchParams.get('page')       // URL da página do Facebook
  const days     = Number(searchParams.get('days') ?? '30')
  const clientId = searchParams.get('client_id')

  if (!page) return Response.json({ error: 'page (URL) obrigatório' }, { status: 400 })

  let ads: AdResult[]
  try {
    ads = await runApifyActor<AdResult>({
      actorId: 'moJRLRc85AitArpNN',
      input: {
        startUrls: [{ url: page }],
        maxAdsCount: 50,
        activeAdsOnly: true,
      },
      timeoutSecs: 120,
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }

  const { data: snapshot } = await supabase
    .from('intelligence_snapshots')
    .insert({
      client_id: clientId,
      type: 'ads',
      query: page,
      data: { ads, days },
    })
    .select('id')
    .single()

  return Response.json({ ads, snapshotId: snapshot?.id })
}
```

### 4.3 — /api/intelligence/crawl/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runApifyActor } from '@/lib/intelligence/apify'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

interface CrawlResult {
  url?: string
  text?: string
  metadata?: { title?: string; description?: string }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, client_id, depth = 1 } = await req.json() as {
    url: string
    client_id?: string
    depth?: number
  }

  if (!url) return Response.json({ error: 'url obrigatória' }, { status: 400 })

  let pages: CrawlResult[]
  try {
    pages = await runApifyActor<CrawlResult>({
      actorId: 'aYG0l9s7dbB7j3gbS',
      input: {
        startUrls: [{ url }],
        maxCrawlDepth: depth,
        maxCrawlPages: 10,
        contentSelector: 'body',
      },
      timeoutSecs: 150,
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }

  // ORACLE gera resumo competitivo
  const contentText = pages
    .map(p => `[${p.url}]\n${p.metadata?.title ?? ''}\n${p.text?.slice(0, 2000) ?? ''}`)
    .join('\n\n')
    .slice(0, 8000)

  let summary = ''
  try {
    const result = await routeChat('iris', [
      {
        role: 'user',
        content: `Analise o conteúdo deste site concorrente e extraia em bullets: 
          1) Proposta de valor principal, 2) Público-alvo, 3) CTAs principais, 
          4) Diferenciais mencionados, 5) Tom de comunicação.
          
          Conteúdo:\n${contentText}`,
      },
    ], { maxTokens: 500 })
    summary = result.content
  } catch { /* resumo é melhor-esforço */ }

  const { data: snapshot } = await supabase
    .from('intelligence_snapshots')
    .insert({
      client_id: client_id,
      type: 'crawl',
      query: url,
      data: pages,
      summary,
    })
    .select('id')
    .single()

  return Response.json({ content: pages, summary, snapshotId: snapshot?.id })
}
```

---

## 5. BLOCO 3 — lib/intelligence/oracle-inject.ts

```typescript
// lib/intelligence/oracle-inject.ts
// Injeta contexto competitivo no system prompt do ORACLE

import { SupabaseClient } from '@supabase/supabase-js'

export async function getCompetitiveContext(
  clientId: string,
  supabase: SupabaseClient,
): Promise<string> {
  try {
    const { data: snapshots } = await supabase
      .from('intelligence_snapshots')
      .select('type, query, summary, data, created_at')
      .eq('client_id', clientId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (!snapshots?.length) return ''

    const lines: string[] = ['INTELIGÊNCIA COMPETITIVA (últimos 7 dias):']

    for (const snap of snapshots) {
      const date = new Date(snap.created_at).toLocaleDateString('pt-BR')

      if (snap.type === 'maps' && Array.isArray(snap.data)) {
        const names = (snap.data as Array<{title?: string}>)
          .map(r => r.title).filter(Boolean).slice(0, 5).join(', ')
        lines.push(`- Concorrentes locais mapeados (${date}): ${names}`)
      }

      if (snap.type === 'ads' && snap.data) {
        const ads = (snap.data as {ads?: unknown[]}).ads ?? []
        lines.push(`- Anúncios ativos detectados (${date}): ${ads.length} anúncios — ${snap.query}`)
      }

      if (snap.type === 'crawl' && snap.summary) {
        lines.push(`- Site analisado (${date}): ${snap.query}\n  Resumo: ${snap.summary}`)
      }
    }

    return '\n\n' + lines.join('\n')
  } catch {
    return ''
  }
}
```

### Injetar no oracle/chat/route.ts

```typescript
// Importar no topo:
import { getCompetitiveContext } from '@/lib/intelligence/oracle-inject'

// Na seção "6. Client DNA context" (após igContext):
let competitiveContext = ''
if (client_id) {
  competitiveContext = await getCompetitiveContext(client_id, supabase)
}

// Adicionar ao systemPrompt:
let systemPrompt = AGENT_SYSTEMS[agent] + dnaContext + igContext + competitiveContext
```

---

## 6. BLOCO 4 — UI: IntelligencePanel

```tsx
// components/intelligence/IntelligencePanel.tsx
'use client'

import { useState } from 'react'
import { Search, Globe, BarChart2, Loader2, ChevronRight } from 'lucide-react'

interface IntelligencePanelProps {
  clientId: string
}

type ToolType = 'maps' | 'ads' | 'crawl'

export function IntelligencePanel({ clientId }: IntelligencePanelProps) {
  const [activeTool, setActiveTool] = useState<ToolType>('maps')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('São Paulo, SP')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)

  const TOOLS = [
    { id: 'maps' as ToolType, label: 'Concorrentes Locais', icon: Search, 
      placeholder: 'Ex: academia de ginástica', hint: 'Mapeia concorrentes no Google Maps' },
    { id: 'ads' as ToolType, label: 'Anúncios Meta',    icon: BarChart2,
      placeholder: 'URL da página do Facebook/IG', hint: 'Analisa anúncios ativos na Meta Ads Library' },
    { id: 'crawl' as ToolType, label: 'Site Concorrente', icon: Globe,
      placeholder: 'https://concorrente.com.br', hint: 'Extrai posicionamento e CTAs do site' },
  ]

  async function run() {
    setIsLoading(true)
    setResult(null)
    try {
      if (activeTool === 'maps') {
        const res = await fetch(`/api/intelligence/maps?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&client_id=${clientId}`)
        setResult(await res.json())
      } else if (activeTool === 'ads') {
        const res = await fetch(`/api/intelligence/ads?page=${encodeURIComponent(query)}&client_id=${clientId}`)
        setResult(await res.json())
      } else {
        const res = await fetch('/api/intelligence/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: query, client_id: clientId }),
        })
        setResult(await res.json())
      }
    } catch (err) {
      setResult({ error: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  const active = TOOLS.find(t => t.id === activeTool)!

  return (
    <div className="space-y-4">
      {/* Tool selector */}
      <div className="flex gap-2">
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === tool.id
                ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'
            }`}>
            <tool.icon size={12} /> {tool.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-2">
        <p className="text-[10px] text-[var(--color-text-muted)]">{active.hint}</p>
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={active.placeholder}
            className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]
              px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/40" />
          {activeTool === 'maps' && (
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Localização"
              className="w-40 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]
                px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]/40" />
          )}
          <button onClick={run} disabled={!query.trim() || isLoading}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-text-inverse)]
              px-4 py-2 text-sm font-semibold disabled:opacity-40 transition-all">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            Analisar
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <pre className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]
          p-4 text-[10px] text-[var(--color-text-secondary)] overflow-auto max-h-64">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
```

---

## 7. Checklist pré-deploy

- [ ] `APIFY_API_KEY` adicionada no Vercel e `.env.local`
- [ ] `migration_intelligence.sql` aplicado no Supabase
- [ ] Testar `GET /api/intelligence/maps?query=test&location=SP` em localhost
- [ ] Verificar que `getCompetitiveContext` não quebra o ORACLE quando sem snapshots
- [ ] `npm run build` sem erros
