# SPEC — Agency OS | ATLAS Image Generation
> SDD Etapa 2 · Plano tático de implementação · Abril 2026
> Baseado em: PRD-ATLAS.md

---

## ORDEM DE IMPLEMENTAÇÃO

```
BLOCO 0 — Banco de dados + Storage
BLOCO 1 — IntelligenceRouter (adicionar modelo image)
BLOCO 2 — Rota /api/agents/atlas/generate (reescrever)
BLOCO 3 — Creative Studio UI (modo manual)
BLOCO 4 — Galeria (adaptar para creative_assets)
BLOCO 5 — ORACLE tool_use (modo automático)
BLOCO 6 — Aprovação inline no chat
```

---

## BLOCO 0 — BANCO DE DADOS + STORAGE

### 0.1 — SQL Migration (rodar no Supabase SQL Editor)

```sql
-- Criar tabela creative_assets
CREATE TABLE IF NOT EXISTS creative_assets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  format       TEXT NOT NULL CHECK (format IN ('feed','stories','banner','thumbnail','portrait','carousel')),
  style        TEXT NOT NULL CHECK (style IN ('fotorrealista','ilustracao','minimalista','bold','cinematografico')),
  prompt       TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  model        TEXT DEFAULT 'google/gemini-2.5-flash-image',
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  source       TEXT DEFAULT 'manual' CHECK (source IN ('manual','oracle')),
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_assets_client ON creative_assets (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_assets_job    ON creative_assets (job_id);
CREATE INDEX IF NOT EXISTS idx_creative_assets_status ON creative_assets (status);

ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creative_assets_auth" ON creative_assets
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 0.2 — Supabase Storage (fazer no dashboard)
```
1. Ir em Storage → Create bucket
2. Nome: creative-assets
3. Public: NÃO (private)
4. Allowed MIME types: image/png, image/jpeg, image/webp
5. Max file size: 10MB
```

---

## BLOCO 1 — INTELLIGENCEROUTER.TS

### 1.1 — MODIFICAR `lib/openrouter/models.ts`
**Ação:** adicionar entrada ATLAS_IMAGE

```typescript
// Adicionar junto aos outros modelos:
export const MODELS = {
  // ... modelos existentes ...

  // VISUAL — Image generation
  ATLAS_IMAGE: 'google/gemini-2.5-flash-image',
  
  // Fallback caso o modelo acima não esteja disponível:
  ATLAS_IMAGE_FALLBACK: 'openai/dall-e-3',
} as const
```

### 1.2 — MODIFICAR `lib/openrouter/IntelligenceRouter.ts`
**Ação:** adicionar método `generateImage`

```typescript
// Adicionar novo método na classe IntelligenceRouter:

static async generateImage({
  prompt,
  aspectRatio = '1:1',
  model = MODELS.ATLAS_IMAGE,
}: {
  prompt: string
  aspectRatio?: string
  model?: string
}): Promise<{ imageBase64: string; mimeType: string }> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://agencyos-cyan.vercel.app',
      'X-Title': 'Agency OS ATLAS',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image'],
      image_config: { aspect_ratio: aspectRatio },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`ATLAS generation failed: ${err}`)
  }

  const data = await response.json()
  const imageData = data?.choices?.[0]?.message?.images?.[0]

  if (!imageData) {
    throw new Error('ATLAS: nenhuma imagem retornada pelo modelo')
  }

  // imageData é uma data URL: "data:image/png;base64,iVBORw0..."
  const [header, base64] = imageData.split(',')
  const mimeType = header.match(/data:(.*);base64/)?.[1] ?? 'image/png'

  return { imageBase64: base64, mimeType }
}
```

---

## BLOCO 2 — ROTA /api/agents/atlas/generate

### 2.1 — REESCREVER `app/api/agents/atlas/generate/route.ts`
**Ação:** substituir completamente o conteúdo

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

const FORMAT_ASPECT_RATIO: Record<string, string> = {
  feed:      '1:1',
  stories:   '9:16',
  banner:    '16:9',
  thumbnail: '16:9',
  portrait:  '9:16',
  carousel:  '1:1',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { clientId, jobId, format, style, prompt } = body

    if (!clientId || !format || !style || !prompt) {
      return NextResponse.json({ error: 'Campos obrigatórios: clientId, format, style, prompt' }, { status: 400 })
    }

    // Buscar DNA do cliente para enriquecer o prompt
    const { data: client } = await supabase
      .from('clients')
      .select('name, niche')
      .eq('id', clientId)
      .single()

    // Montar prompt enriquecido com contexto do cliente
    const styleMap: Record<string, string> = {
      fotorrealista: 'photorealistic, high quality photography, professional',
      ilustracao: 'digital illustration, artistic, colorful, vector style',
      minimalista: 'minimalist, clean, simple, white space, modern',
      bold: 'bold graphic design, strong colors, high contrast, impactful typography',
      cinematografico: 'cinematic, dramatic lighting, film quality, atmospheric',
    }

    const enrichedPrompt = [
      prompt,
      styleMap[style] ?? style,
      client ? `Brand context: ${client.name}, ${client.niche}` : '',
      'Marketing creative, professional quality, no text overlays unless specified',
    ].filter(Boolean).join('. ')

    const aspectRatio = FORMAT_ASPECT_RATIO[format] ?? '1:1'

    // Gerar imagem via OpenRouter
    const { imageBase64, mimeType } = await IntelligenceRouter.generateImage({
      prompt: enrichedPrompt,
      aspectRatio,
    })

    // Converter base64 para Buffer e salvar no Supabase Storage
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const assetId = crypto.randomUUID()
    const storagePath = `${clientId}/${assetId}.png`

    const { error: storageError } = await supabase.storage
      .from('creative-assets')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (storageError) {
      throw new Error(`Storage error: ${storageError.message}`)
    }

    // Gerar URL pública (signed URL válida por 1 ano)
    const { data: urlData } = await supabase.storage
      .from('creative-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    const imageUrl = urlData?.signedUrl ?? ''

    // Salvar em creative_assets
    const { data: asset, error: dbError } = await supabase
      .from('creative_assets')
      .insert({
        client_id: clientId,
        job_id: jobId ?? null,
        format,
        style,
        prompt,
        image_url: imageUrl,
        model: 'google/gemini-2.5-flash-image',
        status: 'pending',
        source: 'manual',
        created_by: user.id,
      })
      .select()
      .single()

    if (dbError) throw new Error(`DB error: ${dbError.message}`)

    return NextResponse.json({
      success: true,
      asset,
      imageUrl,
    })

  } catch (error) {
    console.error('[ATLAS generate]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
```

### 2.2 — CRIAR `app/api/agents/atlas/approve/route.ts`
**Ação:** criar arquivo novo

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { assetId, action } = await request.json()
    // action: 'approved' | 'rejected'

    const { data, error } = await supabase
      .from('creative_assets')
      .update({ status: action })
      .eq('id', assetId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, asset: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
  }
}
```

---

## BLOCO 3 — CREATIVE STUDIO UI (MODO MANUAL)

### 3.1 — MODIFICAR `app/(dashboard)/clients/[id]/creative/page.tsx`
**Ação:** substituir lógica de geração para chamar a rota real

O componente já tem a UI de seleção de formato/estilo/prompt. As mudanças são:

```typescript
// REMOVER: qualquer código que gera prompts de texto
// ADICIONAR: chamada real para /api/agents/atlas/generate

// Estado novo necessário:
const [isGenerating, setIsGenerating] = useState(false)
const [generatedAsset, setGeneratedAsset] = useState<CreativeAsset | null>(null)
const [error, setError] = useState<string | null>(null)

// Função de geração:
const handleGenerate = async () => {
  if (!prompt.trim()) return
  setIsGenerating(true)
  setError(null)
  
  try {
    const response = await fetch('/api/agents/atlas/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: params.id,
        jobId: selectedJobId ?? null,
        format: selectedFormat,
        style: selectedStyle,
        prompt: prompt.trim(),
      }),
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    
    setGeneratedAsset(data.asset)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro ao gerar criativo')
  } finally {
    setIsGenerating(false)
  }
}

// Função de aprovação:
const handleApprove = async (action: 'approved' | 'rejected') => {
  if (!generatedAsset) return
  await fetch('/api/agents/atlas/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId: generatedAsset.id, action }),
  })
  if (action === 'approved') {
    // Mostrar toast de sucesso
    // Limpar estado para nova geração
    setGeneratedAsset(null)
    setPrompt('')
  }
}
```

### 3.2 — Preview da imagem gerada (substituir o painel direito vazio)

```tsx
// Painel direito do Creative Studio:
{isGenerating ? (
  // Skeleton com proporção correta do formato
  <div className={cn(
    'bg-[var(--color-surface)] rounded-lg animate-pulse',
    selectedFormat === 'feed' || selectedFormat === 'carousel' ? 'aspect-square' : '',
    selectedFormat === 'stories' || selectedFormat === 'portrait' ? 'aspect-[9/16]' : '',
    selectedFormat === 'banner' || selectedFormat === 'thumbnail' ? 'aspect-video' : '',
  )} />
) : generatedAsset ? (
  <div className="flex flex-col gap-3">
    <img
      src={generatedAsset.image_url}
      alt="Criativo gerado pelo ATLAS"
      className="w-full rounded-lg object-cover"
    />
    <div className="flex gap-2">
      <button
        onClick={() => handleApprove('approved')}
        className="flex-1 bg-[var(--color-accent)] text-black font-semibold py-2 rounded-lg text-sm"
      >
        Aprovar e salvar
      </button>
      <button
        onClick={handleGenerate}
        className="flex-1 border border-white/10 text-white py-2 rounded-lg text-sm"
      >
        Regenerar
      </button>
      <button
        onClick={() => handleApprove('rejected')}
        className="px-3 border border-red-500/30 text-red-400 py-2 rounded-lg text-sm"
      >
        Descartar
      </button>
    </div>
  </div>
) : (
  // Estado vazio atual — manter como está
  <EmptyCreativePanel />
)}
```

---

## BLOCO 4 — GALERIA (adaptar para creative_assets)

### 4.1 — MODIFICAR `components/gallery/GalleryGrid.tsx`
**Ação:** adicionar query de `creative_assets` além de `job_outputs`

```typescript
// Buscar creative_assets aprovados junto com job_outputs
const { data: creativeAssets } = await supabase
  .from('creative_assets')
  .select('*, clients(name)')
  .eq('status', 'approved')
  .order('created_at', { ascending: false })

// Normalizar para exibição na grid junto com outputs existentes:
const normalizedCreatives = (creativeAssets ?? []).map(asset => ({
  id: asset.id,
  type: 'image' as const,
  title: `${asset.format} - ${asset.style}`,
  content: asset.image_url,
  client_name: asset.clients?.name,
  agent_name: 'ATLAS',
  status: asset.status,
  created_at: asset.created_at,
  isImage: true,
}))
```

### 4.2 — Card de imagem na galeria

```tsx
// No GalleryGrid, ao renderizar cards com isImage=true:
{item.isImage ? (
  <div className="group relative">
    <img
      src={item.content}
      alt={item.title}
      className="w-full rounded-lg object-cover aspect-square"
    />
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-3">
      <div className="flex gap-2 w-full">
        <a
          href={item.content}
          download
          className="flex-1 bg-[var(--color-accent)] text-black text-xs font-semibold py-1.5 rounded text-center"
        >
          Download
        </a>
        <span className="text-white/60 text-xs py-1.5">ATLAS</span>
      </div>
    </div>
  </div>
) : (
  // Card de texto existente — manter como está
)}
```

---

## BLOCO 5 — ORACLE TOOL_USE (MODO AUTOMÁTICO)

### 5.1 — MODIFICAR `app/api/agents/oracle/chat/route.ts`
**Ação:** adicionar tool definition e handler de tool_use

```typescript
// Adicionar antes da chamada ao modelo:
const ATLAS_TOOL = {
  name: 'generate_creative',
  description: 'Gera um criativo visual (imagem) para o cliente. Use quando o usuário pedir um post, banner, stories, thumbnail ou qualquer criativo visual para redes sociais.',
  input_schema: {
    type: 'object' as const,
    properties: {
      format: {
        type: 'string',
        enum: ['feed', 'stories', 'banner', 'thumbnail', 'portrait'],
        description: 'Formato do criativo: feed=post quadrado, stories=vertical, banner=horizontal'
      },
      style: {
        type: 'string',
        enum: ['fotorrealista', 'ilustracao', 'minimalista', 'bold', 'cinematografico'],
        description: 'Estilo visual do criativo'
      },
      prompt: {
        type: 'string',
        description: 'Prompt detalhado em inglês descrevendo o criativo. Inclua elementos visuais, cores, composição, mood.'
      },
    },
    required: ['format', 'style', 'prompt']
  }
}

// Na chamada ao IntelligenceRouter/OpenRouter, adicionar tools:
// tools: [ATLAS_TOOL]
// tool_choice: 'auto'

// Após receber a resposta, checar se tem tool_use:
const toolUseBlock = response.content?.find(b => b.type === 'tool_use' && b.name === 'generate_creative')

if (toolUseBlock) {
  // 1. Emitir evento SSE para o cliente: "gerando criativo..."
  // 2. Chamar /api/agents/atlas/generate internamente
  // 3. Receber imageUrl
  // 4. Emitir evento SSE com imageUrl + assetId para renderizar inline
}
```

### 5.2 — CRIAR `components/oracle/AtlasMessage.tsx`
**Ação:** criar componente novo para mensagem com imagem inline no chat

```tsx
// Componente para renderizar criativo gerado pelo ATLAS dentro do chat do ORACLE:
interface AtlasMessageProps {
  imageUrl: string
  assetId: string
  format: string
  style: string
  onApprove: (assetId: string) => void
  onRegenerate: () => void
}

export function AtlasMessage({ imageUrl, assetId, format, style, onApprove, onRegenerate }: AtlasMessageProps) {
  return (
    <div className="flex flex-col gap-3 max-w-sm">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span className="text-[var(--color-accent)]">★ ATLAS</span>
        <span>{format} · {style}</span>
      </div>
      <img src={imageUrl} alt="Criativo ATLAS" className="rounded-lg w-full" />
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(assetId)}
          className="flex-1 bg-[var(--color-accent)] text-black text-xs font-semibold py-2 rounded-lg"
        >
          Aprovar e salvar
        </button>
        <button
          onClick={onRegenerate}
          className="px-3 border border-white/10 text-white text-xs py-2 rounded-lg"
        >
          Regenerar
        </button>
      </div>
    </div>
  )
}
```

---

## BLOCO 6 — APROVAÇÃO NO CHAT (ORACLE)

### 6.1 — MODIFICAR chat do ORACLE para lidar com approval

Quando o usuário clica "Aprovar e salvar" no `AtlasMessage`:
1. Chama `POST /api/agents/atlas/approve` com `{ assetId, action: 'approved' }`
2. Mostra toast: "Criativo salvo na galeria"
3. O botão some e mostra "Salvo ✓"

Quando clica "Regenerar":
1. Envia nova mensagem para o ORACLE: "Regenere o criativo com variações"
2. ORACLE chama ATLAS novamente com prompt levemente modificado

---

## CHECKLIST DE VALIDAÇÃO

Antes de considerar a implementação completa:

**Modo Manual:**
- [ ] `/clients/[id]/creative` → preenche parâmetros → clica Gerar → imagem aparece em < 20s
- [ ] Skeleton animado com proporção correta aparece durante geração
- [ ] Botões Aprovar / Regenerar / Descartar funcionam
- [ ] Imagem aprovada aparece na galeria em /gallery com filtro "Visuais"
- [ ] Download da imagem funciona
- [ ] Erro tratado (se OpenRouter falhar, mensagem amigável aparece)

**Modo Automático:**
- [ ] ORACLE no chat → "cria um post feed fotorrealista para nosso lançamento X"
- [ ] Aparece "Gerando criativo com ATLAS..." no chat
- [ ] Imagem aparece inline na mensagem do chat
- [ ] Botão Aprovar funciona e salva na galeria
- [ ] Regenerar envia novo request ao ORACLE

**Infraestrutura:**
- [ ] `creative_assets` table criada no Supabase
- [ ] Bucket `creative-assets` criado no Storage
- [ ] `OPENROUTER_API_KEY` verificada no Vercel (já deve existir)
- [ ] Nenhuma chave nova necessária

---

## COMO USAR ESTE SPEC

1. Abrir Claude Code na pasta do projeto:
   `/Users/dicasdoflaviog/Downloads/PROJETOS CLAUDE/AGENCY OS/agency-os/web`

2. Enviar este arquivo:
   "Leia o SPEC-ATLAS.md e implemente completamente seguindo a ordem dos blocos.
   Comece pelo BLOCO 0 (SQL + Storage), confirme comigo antes de avançar para o próximo."

3. Após cada bloco: `git add -A && git commit -m "feat(atlas): bloco X - descrição"`

4. Deploy automático no Vercel após push para main.

5. Testar no `agencyos-cyan.vercel.app` antes de avançar ao próximo bloco.

---

*SPEC gerado via SDD · Agency OS ATLAS · Abril 2026*
