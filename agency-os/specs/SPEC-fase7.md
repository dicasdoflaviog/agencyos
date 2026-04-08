# SPEC-fase7 — Agency OS
> Software Design Document · Fase 9 — Bug Fix Sprint + ATLAS Completo

---

## 1. Arquivos a Modificar

```
web/app/
├── globals.css                                 # BLOCO 0-A: remover borda acidental
├── (dashboard)/
│   ├── clients/[id]/page.tsx                  # BLOCO 2-A: view/edit state
│   ├── financial/page.tsx                     # BLOCO 2-B: unificar query
│   ├── financial/advanced/page.tsx            # BLOCO 2-B: unificar query
│   ├── pipelines/new/page.tsx                 # BLOCO 0-B: violet→accent
│   ├── pipelines/[id]/edit/*.tsx              # BLOCO 0-B
│   ├── templates/new/page.tsx                 # BLOCO 0-B
│   └── templates/[id]/edit/*.tsx              # BLOCO 0-B
├── api/agents/
│   ├── atlas/approve/route.ts                 # BLOCO 3-A: criar diretório + arquivo
│   └── oracle/chat/route.ts                   # BLOCO 3-B: ATLAS tool_use

web/components/
├── layout/Sidebar.tsx                         # BLOCO 0-C: PT-BR labels
├── gallery/GalleryGrid.tsx                    # BLOCO 1-A: react-markdown
├── gallery/GalleryCard.tsx                    # BLOCO 1-A: render output_content
├── oracle/AtlasMessage.tsx                    # BLOCO 3-C: NOVO componente
├── oracle/OracleMessage.tsx                   # BLOCO 3-D: parsear marcador ATLAS
├── crm/KanbanBoard.tsx                        # BLOCO 1-B: scroll + gradient
├── dna/DNADocument.tsx                        # BLOCO 2-C: botão Editar DNA

web/app/(dashboard)/
├── settings/workspace/page.tsx                # BLOCO 0-D: color picker unificado
└── marketplace/page.tsx                       # BLOCO 0-E: /mês nos preços
```

---

## 2. BLOCO 0 — Visuais Rápidos (Grupo A)

### 0-A: Remover borda laranja no topo
```css
/* app/globals.css — procurar por: */
/* body, html, main, #__next, .layout-root ou qualquer seletor com: */
border-top: ... amber/orange ...
/* OU */
border-top-color: var(--color-accent);

/* Fix: comentar ou remover a linha. Alternativa: inspecionar com DevTools */
```

### 0-B: violet-* → accent nos botões primários
```bash
# Arquivos afetados (verificar cada um):
grep -rn "violet-" --include="*.tsx" app/(dashboard)/pipelines app/(dashboard)/templates

# Substituição:
# bg-violet-600  → bg-[var(--color-accent)]
# hover:bg-violet-700 → hover:bg-[var(--color-accent)]/90
# text-violet-* → text-[var(--color-accent)]
# border-violet-* → border-[var(--color-accent)]/40
# focus:ring-violet-* → focus:ring-[var(--color-accent)]/30
```

### 0-C: Sidebar PT-BR
```tsx
// components/layout/Sidebar.tsx — substituições no array de nav items:
// { label: 'Overview' }   → { label: 'Visão Geral' }
// { label: 'Jobs' }       → { label: 'Projetos' }
// { label: 'Reports' }    → { label: 'Relatórios' }
// MANTER em inglês: Settings, Marketplace (marca)
```

### 0-D: Title tags (5 páginas)
```tsx
// Padrão para cada página:
export const metadata = {
  title: 'CRM | Agency OS',
  description: 'Gerencie seu pipeline de vendas e leads',
}

// Páginas afetadas:
// crm/page.tsx          → 'CRM — Pipeline | Agency OS'
// marketplace/page.tsx  → 'Marketplace de Agentes | Agency OS'
// reports/page.tsx      → 'Relatórios | Agency OS'
// settings/workspace/page.tsx → 'Workspace | Configurações'
// financial/page.tsx    → 'Financeiro | Agency OS'
```

### 0-E: Marketplace /mês
```tsx
// Localizar o AgentCard ou lista de preços no marketplace
// Exemplo de fix:
// Antes:  <span>R$ 97</span>
// Depois: <span>R$ 97<span className="text-xs opacity-60">/mês</span></span>
```

### 0-F: Domain placeholder
```tsx
// settings/workspace — input do campo de domínio:
// Antes: placeholder="meudomain.com"
// Depois:
<label className="text-xs font-medium text-[var(--color-text-secondary)]">
  Domínio personalizado
</label>
<input
  placeholder="ex: agencia.com.br"
  // ...
/>
<p className="text-[10px] text-[var(--color-text-muted)] mt-1">
  Configure seu domínio white-label para relatórios e portal do cliente
</p>
```

### 0-G: Color picker unificado
```tsx
// settings/workspace — substituir 2 swatches por 1 input[type=color]
// Antes: 2 components separados com cores da marca
// Depois:
<div className="space-y-2">
  <label className="text-xs font-medium">Cor principal da marca</label>
  <div className="flex items-center gap-3">
    <input
      type="color"
      value={brandColor}
      onChange={e => setBrandColor(e.target.value)}
      className="h-10 w-20 rounded-lg border border-[var(--color-border-subtle)] cursor-pointer"
    />
    <span className="text-sm font-mono text-[var(--color-text-secondary)]">{brandColor}</span>
  </div>
</div>
```

---

## 3. BLOCO 1 — UX Médio (Grupo B)

### 1-A: react-markdown na galeria
```bash
npm install react-markdown
```

```tsx
// components/gallery/GalleryCard.tsx (ou GalleryGrid.tsx)
import ReactMarkdown from 'react-markdown'

// Onde renderiza output_content:
// Antes:
<p>{output.output_content}</p>

// Depois:
<div className="prose prose-sm prose-invert max-w-none text-[var(--color-text-secondary)]
  [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
  <ReactMarkdown>{output.output_content ?? ''}</ReactMarkdown>
</div>
```

### 1-B: CRM scroll horizontal com fade
```tsx
// components/crm/KanbanBoard.tsx (ou similar)
// Wrapper do kanban:
<div className="relative">
  {/* Fade right */}
  <div className="pointer-events-none absolute right-0 top-0 h-full w-16 
    bg-gradient-to-l from-[var(--color-bg-base)] to-transparent z-10" />
  
  <div className="flex gap-4 overflow-x-auto pb-4 
    scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--color-border-subtle)]
    hover:scrollbar-thumb-[var(--color-border-strong)]">
    {/* colunas */}
  </div>
</div>
```

### 1-C: Tooltip nos agentes do Job sidebar
```tsx
// Onde renderiza a lista de agentes no sidebar do job:
// Antes:
<button className="..."><AgentIcon /> {agent.name}</button>

// Depois:
<button
  title={`${agent.label} — ${agent.description}`}
  className="group relative ..."
>
  <AgentIcon />
  <span className="truncate">{agent.name}</span>
  {/* Tooltip */}
  <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2
    hidden group-hover:flex items-center whitespace-nowrap rounded-lg
    bg-[var(--color-bg-overlay)] border border-[var(--color-border-subtle)]
    px-3 py-1.5 text-xs text-[var(--color-text-primary)] shadow-xl z-50">
    {agent.label}
  </span>
</button>
```

### 1-D: Empty states com CTA
```tsx
// Padrão de empty state reutilizável:
function EmptyState({ icon: Icon, title, description, cta, href }: ...) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl 
      border border-dashed border-[var(--color-border-subtle)] py-16 text-center">
      <Icon size={28} className="mb-3 text-[var(--color-text-disabled)]" />
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      {cta && href && (
        <a href={href} className="mt-4 inline-flex items-center gap-2 rounded-lg
          bg-[var(--color-accent)] text-[var(--color-text-inverse)] px-4 py-2 text-xs font-semibold">
          {cta}
        </a>
      )}
    </div>
  )
}

// Overview: cta="Criar primeiro cliente" href="/clients/new"
// CRM: cta="Adicionar lead" href="/crm/new"
// Reports: cta="Gerar relatório" href="/reports/generate"
```

---

## 4. BLOCO 2 — Correções de Lógica (Grupo C)

### 2-A: Cliente — view/edit state separado
```tsx
// app/(dashboard)/clients/[id]/page.tsx (ou ClientTabs.tsx)
// Adicionar state:
const [isEditing, setIsEditing] = useState(false)

// Header do cliente:
<div className="flex items-center gap-3">
  <h2>{client.name}</h2>
  {!isEditing && (
    <button onClick={() => setIsEditing(true)} className="...">
      <Pencil size={14} /> Editar
    </button>
  )}
  {isEditing && (
    <>
      <button onClick={handleSave} className="... bg-accent">Salvar</button>
      <button onClick={() => setIsEditing(false)} className="...">Cancelar</button>
    </>
  )}
</div>

// Campos: renderizar <p>{valor}</p> quando !isEditing, <input> quando isEditing
```

### 2-B: Financial — unificar query de contratos ativos
```tsx
// Criar helper compartilhado:
// lib/queries/contracts.ts
export async function getActiveContracts(supabase, workspaceId?: string) {
  let query = supabase
    .from('contracts')
    .select('*, client:clients(id, name)')
    .eq('status', 'active')
    .order('end_date', { ascending: true })
  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  return query
}

// Importar em financial/page.tsx E financial/advanced/page.tsx
// Remover queries duplicadas/divergentes
```

### 2-C: DNA — botão Editar reabre Wizard preenchido
```tsx
// components/dna/DNADocument.tsx
// Adicionar prop onEdit + botão:
interface DNADocumentProps {
  dna: ClientDNA
  onEdit?: () => void   // callback para reabrir wizard
}

// No header do documento:
{onEdit && (
  <button onClick={onEdit} className="flex items-center gap-1.5 ... text-xs">
    <Pencil size={13} /> Editar DNA
  </button>
)}

// Na página do cliente (clients/[id]/page.tsx):
// Passar os dados existentes do DNA para o DNAWizard via initialValues
<DNAWizard
  clientId={clientId}
  initialValues={existingDna}  // preenche todos os campos
  onComplete={() => { setShowWizard(false); refetch() }}
/>
```

---

## 5. BLOCO 3 — ATLAS Completo (B5 + B6)

### 3-A: Criar approve/route.ts
> **PRÉ-REQUISITO:** executar no terminal antes:
> ```bash
> mkdir -p "web/app/api/agents/atlas/approve"
> ```

```typescript
// app/api/agents/atlas/approve/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { assetId, action } = await req.json() as {
    assetId: string
    action: 'approved' | 'rejected'
  }

  if (!assetId || !['approved', 'rejected'].includes(action)) {
    return Response.json({ error: 'assetId e action obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creative_assets')
    .update({ status: action })
    .eq('id', assetId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, asset: data })
}
```

### 3-B: ORACLE tool_use — adicionar ao oracle/chat/route.ts

Após o bloco de import, adicionar os helpers de detecção de intent (já implementados em sessão anterior como `ATLAS_IMAGE_INTENT_RE`, `extractImagePrompt`, `detectFormat`, `FORMAT_ASPECT_MAP`).

Na `ReadableStream.start()`, após o loop `for await`:
```typescript
// Depois de acumular fullContent, antes do finally block:

// Verificar se é ATLAS + intent de geração de imagem
if (agent === 'atlas' && ATLAS_IMAGE_INTENT_RE.test(message)) {
  try {
    const imagePrompt = extractImagePrompt(fullContent) ?? message
    const detectedFormat = detectFormat(message + ' ' + fullContent)
    const aspectRatio = FORMAT_ASPECT_MAP[detectedFormat] ?? '1:1'
    
    const { imageBase64, mimeType } = await generateImage({ 
      prompt: imagePrompt, 
      aspectRatio 
    })
    
    // Salvar asset com status pending + source oracle
    const { data: asset } = await supabase
      .from('creative_assets')
      .insert({
        client_id: client_id ?? null,
        format: detectedFormat,
        style: 'fotorrealista',
        type: detectedFormat,
        prompt: imagePrompt,
        image_url: `data:${mimeType};base64,${imageBase64}`,
        model: 'google/gemini-2.5-flash-image',
        status: 'pending',
        source: 'oracle',
        created_by: user.id,
      })
      .select('id')
      .single()
    
    // Emitir marcador no stream
    const marker = JSON.stringify({
      imageBase64,
      mimeType,
      assetId: asset?.id,
      format: detectedFormat,
      prompt: imagePrompt,
    })
    controller.enqueue(encoder.encode(`\n\n%%ATLAS_IMAGE%%${marker}%%`))
  } catch (imgErr) {
    console.error('[ORACLE ATLAS tool_use]', imgErr)
    // Não bloqueia — ORACLE respondeu com texto de qualquer forma
  }
}
```

### 3-C: AtlasMessage.tsx — novo componente

```tsx
// components/oracle/AtlasMessage.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, RefreshCw, Trash2, Loader2, Download } from 'lucide-react'

interface AtlasMessageProps {
  imageBase64: string
  mimeType: string
  assetId?: string
  format?: string
  prompt?: string
}

export function AtlasMessage({ imageBase64, mimeType, assetId, format, prompt }: AtlasMessageProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>('pending')
  const imageSrc = `data:${mimeType};base64,${imageBase64}`

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!assetId) return
    setStatus('loading')
    await fetch('/api/agents/atlas/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action }),
    })
    setStatus(action)
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border-subtle)]
      bg-[var(--color-bg-surface)] max-w-sm">
      <div className="relative aspect-square w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={prompt ?? 'ATLAS criativo'} className="h-full w-full object-cover" />
        
        {status === 'approved' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
              <Check size={16} /> Aprovado — na galeria
            </span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {format && (
          <span className="text-[10px] rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 
            text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
            {format}
          </span>
        )}
        {prompt && (
          <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">{prompt}</p>
        )}

        {status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => handleAction('approved')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg 
                bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 
                py-1.5 text-xs font-semibold hover:bg-emerald-500/25 transition-all">
              <Check size={12} /> Aprovar
            </button>
            <a href={imageSrc} download={`atlas-${Date.now()}.png`}
              className="flex items-center justify-center gap-1.5 rounded-lg 
                bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]
                px-3 py-1.5 text-xs hover:text-[var(--color-text-primary)] transition-all">
              <Download size={12} />
            </a>
            <button onClick={() => handleAction('rejected')}
              className="flex items-center justify-center gap-1.5 rounded-lg
                bg-red-500/10 border border-red-500/20 text-red-400
                px-3 py-1.5 text-xs hover:bg-red-500/20 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-[var(--color-text-muted)]">
            <Loader2 size={12} className="animate-spin" /> Salvando...
          </div>
        )}

        {status === 'rejected' && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">Descartado</p>
        )}
      </div>
    </div>
  )
}
```

### 3-D: Parser do marcador em OracleMessage (ou chat component)

```tsx
// No componente que renderiza as mensagens do ORACLE:
// Detectar e extrair o marcador %%ATLAS_IMAGE%%{...}%%

function parseAtlasMarker(content: string): {
  text: string
  atlasData?: {
    imageBase64: string; mimeType: string; assetId?: string;
    format?: string; prompt?: string
  }
} {
  const markerMatch = content.match(/%%ATLAS_IMAGE%%([\s\S]+?)%%/)
  if (!markerMatch) return { text: content }
  
  try {
    const atlasData = JSON.parse(markerMatch[1])
    const text = content.replace(/\n\n%%ATLAS_IMAGE%%[\s\S]+?%%/, '').trim()
    return { text, atlasData }
  } catch {
    return { text: content }
  }
}

// Na renderização:
const { text, atlasData } = parseAtlasMarker(message.content)
return (
  <>
    <MarkdownContent>{text}</MarkdownContent>
    {atlasData && <AtlasMessage {...atlasData} />}
  </>
)
```

---

## 6. Checklist pré-deploy

- [ ] `migration_atlas.sql` aplicado no Supabase SQL Editor
- [ ] `mkdir -p web/app/api/agents/atlas/approve` executado no terminal
- [ ] `creative-assets` bucket existe no Supabase Storage (private, 10MB)
- [ ] `npm run build` sem erros de TypeScript
- [ ] `git push origin main` → Vercel auto-deploy
