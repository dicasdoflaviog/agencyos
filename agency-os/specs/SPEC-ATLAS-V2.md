# SPEC — Agency OS | ATLAS Creative Studio v2
> SDD Etapa 2 · Plano tático · Abril 2026
> Baseado em: PRD-ATLAS-V2.md

---

## ORDEM DE IMPLEMENTAÇÃO

```
BLOCO 0 — Migration SQL (client_dna + ALTER creative_assets)
BLOCO 1 — DNA Service (lib/atlas/dna.ts)
BLOCO 2 — VERA Copy Generator (lib/atlas/vera-copy.ts)
BLOCO 3 — ATLAS Prompt Builder (lib/atlas/prompt-builder.ts)
BLOCO 4 — Rota principal POST /api/agents/atlas/generate-carousel
BLOCO 5 — Rota POST /api/agents/atlas/refine-slide
BLOCO 6 — Creative Studio UI (wizard + geração progressiva)
BLOCO 7 — Editor Visual (admin/collaborator only)
BLOCO 8 — DNA Config UI (aba DNA do cliente atualizada)
BLOCO 9 — Galeria melhorada (prompt copiável, reusar, variação)
```

---

## BLOCO 0 — MIGRATION SQL

### 0.1 — Rodar no Supabase SQL Editor

```sql
-- ─── NOVA TABELA: client_dna ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_dna (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  workspace_id      UUID NOT NULL,
  primary_color     TEXT DEFAULT '#F59E0B',
  secondary_colors  TEXT[] DEFAULT '{}',
  font_heading      TEXT DEFAULT 'Inter',
  font_body         TEXT DEFAULT 'Inter',
  logo_url          TEXT,
  visual_style      TEXT DEFAULT 'minimalista'
                      CHECK (visual_style IN ('minimalista','bold','cinematografico','colorido','profile')),
  tone              TEXT DEFAULT 'profissional'
                      CHECK (tone IN ('profissional','casual','inspiracional','tecnico','humor')),
  brand_voice_text  TEXT,
  target_audience   TEXT,
  key_message       TEXT,
  reference_images  TEXT[] DEFAULT '{}',
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_dna_workspace ON client_dna(workspace_id);
ALTER TABLE client_dna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_dna_auth" ON client_dna
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── ALTER: creative_assets ──────────────────────────────────────────────

ALTER TABLE creative_assets
  ADD COLUMN IF NOT EXISTS template        TEXT DEFAULT 'minimalista',
  ADD COLUMN IF NOT EXISTS slide_count     INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slides_data     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS caption         TEXT,
  ADD COLUMN IF NOT EXISTS dna_snapshot    JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
```

---

## BLOCO 1 — DNA SERVICE

### 1.1 — CRIAR `lib/atlas/dna.ts`

```typescript
// lib/atlas/dna.ts
// Busca e normaliza o DNA do cliente para injeção no ATLAS

import { SupabaseClient } from '@supabase/supabase-js'

export interface ClientDNAContext {
  client_name: string
  niche: string
  primary_color: string
  secondary_colors: string[]
  font_heading: string
  font_body: string
  logo_url: string
  visual_style: string
  tone: string
  brand_voice_text: string
  target_audience: string
  key_message: string
  reference_images: string[]
}

export async function getClientDNA(
  clientId: string,
  supabase: SupabaseClient
): Promise<ClientDNAContext> {
  // 1. Buscar cliente base
  const { data: client } = await supabase
    .from('clients')
    .select('name, niche')
    .eq('id', clientId)
    .single()

  // 2. Buscar client_dna (tabela nova)
  const { data: dna } = await supabase
    .from('client_dna')
    .select('*')
    .eq('client_id', clientId)
    .single()

  // 3. Fallback: buscar de client_assets se dna não existir
  const { data: assets } = await supabase
    .from('client_assets')
    .select('type, content, file_url')
    .eq('client_id', clientId)
    .in('type', ['brandvoice', 'logo', 'font', 'styleguide'])

  const brandVoiceAsset = assets?.find(a => a.type === 'brandvoice')
  const logoAsset = assets?.find(a => a.type === 'logo')
  const fontAsset = assets?.find(a => a.type === 'font')

  return {
    client_name:      client?.name ?? '',
    niche:            client?.niche ?? '',
    primary_color:    dna?.primary_color ?? '#000000',
    secondary_colors: dna?.secondary_colors ?? [],
    font_heading:     dna?.font_heading ?? fontAsset?.content ?? 'Inter',
    font_body:        dna?.font_body ?? 'Inter',
    logo_url:         dna?.logo_url ?? logoAsset?.file_url ?? '',
    visual_style:     dna?.visual_style ?? 'minimalista',
    tone:             dna?.tone ?? 'profissional',
    brand_voice_text: dna?.brand_voice_text ?? brandVoiceAsset?.content ?? '',
    target_audience:  dna?.target_audience ?? '',
    key_message:      dna?.key_message ?? '',
    reference_images: dna?.reference_images ?? [],
  }
}
```

---

## BLOCO 2 — VERA COPY GENERATOR

### 2.1 — CRIAR `lib/atlas/vera-copy.ts`

```typescript
// lib/atlas/vera-copy.ts
// VERA gera a estrutura de copy do carrossel antes do ATLAS gerar imagens

import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'
import { ClientDNAContext } from './dna'

export interface SlideContent {
  number: number
  title: string
  subtitle: string
  image_context: string   // o que a imagem deve mostrar
}

export interface CarouselCopy {
  hook: string
  slides: SlideContent[]
  cta: string
  caption: string
}

const TONE_MAP: Record<string, string> = {
  profissional:  'professional, authoritative, trustworthy',
  casual:        'friendly, conversational, warm, approachable',
  inspiracional: 'motivational, aspirational, uplifting, energizing',
  tecnico:       'precise, data-driven, informative, expert',
  humor:         'playful, witty, fun, light-hearted',
}

const TEMPLATE_COPY_MAP: Record<string, string> = {
  minimalista: 'Títulos curtos e impactantes (máx 6 palavras). Tom dramático. Ganchos polêmicos ou contraintuitivos.',
  profile:     'Texto mais longo e informativo. Estilo de thread/tweet. Compartilhável. Dados e insights.',
}

export async function generateCarouselCopy(
  userPrompt: string,
  slideCount: number,
  template: string,
  dna: ClientDNAContext
): Promise<CarouselCopy> {

  const prompt = `Você é VERA, copywriter especialista em carrosséis virais para Instagram brasileiro.

CLIENTE: ${dna.client_name} — ${dna.niche}
TOM: ${TONE_MAP[dna.tone] ?? TONE_MAP.profissional}
PÚBLICO-ALVO: ${dna.target_audience || 'Não especificado'}
MENSAGEM CENTRAL: ${dna.key_message || 'Não especificada'}
BRAND VOICE: ${dna.brand_voice_text?.slice(0, 400) || 'Profissional e direto'}
TEMPLATE: ${template} — ${TEMPLATE_COPY_MAP[template] ?? ''}

TEMA DO CARROSSEL: "${userPrompt}"
NÚMERO DE SLIDES: ${slideCount}

Crie o copy completo. Retorne APENAS JSON válido sem markdown:
{
  "hook": "gancho irresistível para o slide 1 — máx 6 palavras — deve parar o scroll",
  "slides": [
    {
      "number": 1,
      "title": "título do slide — máx 6 palavras para minimalista, 15 para profile",
      "subtitle": "frase de apoio — máx 20 palavras",
      "image_context": "descreva a cena ideal para a imagem deste slide em inglês"
    }
  ],
  "cta": "chamada para ação do último slide — direta e clara",
  "caption": "legenda completa para o post — tom natural, 3-5 parágrafos curtos + hashtags relevantes"
}

REGRAS OBRIGATÓRIAS:
- Slide 1: gancho que gera curiosidade ou provoca (NÃO comece com "5 dicas de")
- Slides intermediários: cada um entrega valor isolado
- Último slide: CTA claro (comentar, salvar, seguir, enviar mensagem)
- image_context em inglês, descreve cena fotorrealista relacionada ao conteúdo do slide
- caption com emojis moderados e hashtags PT-BR relevantes ao nicho`

  const result = await IntelligenceRouter.routeChat('vera', [
    { role: 'user', content: prompt }
  ], { maxTokens: 2000 })

  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as CarouselCopy
  } catch {
    // Fallback estruturado
    return {
      hook: userPrompt.slice(0, 30),
      slides: Array.from({ length: slideCount }, (_, i) => ({
        number: i + 1,
        title: i === 0 ? userPrompt : `Ponto ${i}`,
        subtitle: '',
        image_context: `Professional marketing image related to ${dna.niche}`,
      })),
      cta: 'Salva esse conteúdo!',
      caption: userPrompt,
    }
  }
}
```

---

## BLOCO 3 — ATLAS PROMPT BUILDER

### 3.1 — CRIAR `lib/atlas/prompt-builder.ts`

```typescript
// lib/atlas/prompt-builder.ts
// Constrói o prompt de imagem para cada slide com DNA aplicado

import { ClientDNAContext } from './dna'
import { SlideContent } from './vera-copy'

const VISUAL_STYLE_MAP: Record<string, string> = {
  minimalista:    'cinematic, dramatic lighting, high contrast, dark moody atmosphere, editorial photography, film grain',
  bold:           'bold graphic design, vibrant saturated colors, strong geometric elements, energetic composition',
  cinematografico:'epic cinematic composition, dramatic storytelling, atmospheric depth, film quality lighting',
  colorido:       'colorful, modern, clean, bright, energetic, optimistic lighting',
  profile:        'clean neutral background, soft professional lighting, editorial portrait style, minimal',
}

const TONE_VISUAL_MAP: Record<string, string> = {
  profissional:  'sophisticated, polished, corporate aesthetic',
  casual:        'warm tones, natural lighting, approachable feel',
  inspiracional: 'uplifting composition, golden hour light, aspirational mood',
  tecnico:       'precise, technical, structured, data visualization aesthetic',
  humor:         'playful colors, dynamic angles, fun energy',
}

const FORMAT_ASPECT_MAP: Record<string, string> = {
  feed:      '4:5',
  stories:   '9:16',
  banner:    '16:9',
  thumbnail: '16:9',
  portrait:  '9:16',
  carousel:  '4:5',
}

export function buildImagePrompt(
  slide: SlideContent,
  dna: ClientDNAContext,
  template: string,
  customStyle?: string
): string {
  const parts = [
    // Contexto da cena — derivado do conteúdo do slide (mais importante)
    slide.image_context || `Professional marketing visual for: ${slide.title}`,

    // Estilo visual da marca
    VISUAL_STYLE_MAP[dna.visual_style] ?? VISUAL_STYLE_MAP.minimalista,
    TONE_VISUAL_MAP[dna.tone] ?? TONE_VISUAL_MAP.profissional,

    // Cor primária da marca
    dna.primary_color ? `Color palette includes ${dna.primary_color} as accent` : '',

    // Contexto do negócio
    dna.niche ? `Industry context: ${dna.niche}` : '',
    dna.target_audience ? `Target audience visual style: ${dna.target_audience}` : '',

    // Diretriz de template
    template === 'minimalista'
      ? 'Leave dark area at bottom third for text overlay. Dramatic foreground subject.'
      : 'Clean background with visual breathing room. Subject centered or left-aligned.',

    // Estilo de referência personalizado
    customStyle || '',

    // Técnicas de viralização
    'High visual impact, scroll-stopping composition, professional quality',
    'No text, no watermarks, no logos in the image',
    'Suitable for Instagram marketing creative',
  ]

  return parts.filter(Boolean).join('. ')
}

export function getAspectRatio(format: string): string {
  return FORMAT_ASPECT_MAP[format] ?? '4:5'
}
```

---

## BLOCO 4 — ROTA PRINCIPAL GENERATE-CAROUSEL

### 4.1 — CRIAR `app/api/agents/atlas/generate-carousel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getClientDNA } from '@/lib/atlas/dna'
import { generateCarouselCopy } from '@/lib/atlas/vera-copy'
import { buildImagePrompt, getAspectRatio } from '@/lib/atlas/prompt-builder'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      clientId,
      jobId,
      userPrompt,
      template = 'minimalista',    // 'minimalista' | 'profile'
      format = 'feed',              // 'feed' | 'stories' | 'banner' | 'thumbnail'
      slideCount = 6,               // 3–10
      customStyle,                  // direcionamento extra de estilo (opcional)
      referenceImageUrl,            // URL de imagem de referência (opcional)
    } = body

    if (!clientId || !userPrompt) {
      return NextResponse.json({ error: 'clientId e userPrompt são obrigatórios' }, { status: 400 })
    }

    // 1. Buscar DNA do cliente
    const dna = await getClientDNA(clientId, supabase)

    // 2. VERA gera copy de todos os slides
    const copy = await generateCarouselCopy(
      userPrompt,
      Math.min(Math.max(slideCount, 3), 10),
      template,
      dna
    )

    // 3. Gerar imagens para cada slide via ATLAS
    const aspectRatio = getAspectRatio(format)
    const slidesWithImages: Array<{
      number: number
      title: string
      subtitle: string
      image_url: string
      prompt: string
    }> = []

    for (const slide of copy.slides) {
      const imagePrompt = buildImagePrompt(slide, dna, template, customStyle)

      try {
        const { imageBase64, mimeType } = await IntelligenceRouter.generateImage({
          prompt: imagePrompt,
          aspectRatio,
        })

        // Upload para Supabase Storage
        const imageBuffer = Buffer.from(imageBase64, 'base64')
        const assetId = crypto.randomUUID()
        const storagePath = `${clientId}/${assetId}.png`

        const { error: storageErr } = await supabase.storage
          .from('creative-assets')
          .upload(storagePath, imageBuffer, {
            contentType: mimeType,
            upsert: false,
          })

        let imageUrl = ''
        if (!storageErr) {
          const { data: urlData } = await supabase.storage
            .from('creative-assets')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
          imageUrl = urlData?.signedUrl ?? ''
        }

        slidesWithImages.push({
          number: slide.number,
          title: slide.title,
          subtitle: slide.subtitle,
          image_url: imageUrl,
          prompt: imagePrompt,
        })
      } catch (slideErr) {
        // Slide sem imagem — não falha o carrossel inteiro
        slidesWithImages.push({
          number: slide.number,
          title: slide.title,
          subtitle: slide.subtitle,
          image_url: '',
          prompt: imagePrompt,
        })
      }
    }

    // 4. Salvar creative_asset principal (representa o carrossel)
    const { data: asset, error: dbErr } = await supabase
      .from('creative_assets')
      .insert({
        client_id:          clientId,
        job_id:             jobId ?? null,
        format,
        style:              dna.visual_style,
        template,
        prompt:             userPrompt,
        image_url:          slidesWithImages[0]?.image_url ?? '',   // thumbnail = slide 1
        slide_count:        slidesWithImages.length,
        slides_data:        slidesWithImages,
        caption:            copy.caption,
        dna_snapshot:       { ...dna, generated_at: new Date().toISOString() },
        reference_image_url: referenceImageUrl ?? null,
        model:              'google/gemini-2.5-flash-image',
        status:             'pending',
        source:             'manual',
        created_by:         user.id,
      })
      .select()
      .single()

    if (dbErr) throw dbErr

    return NextResponse.json({
      success: true,
      asset,
      copy,
      slides: slidesWithImages,
    })

  } catch (error) {
    console.error('[atlas/generate-carousel]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
```

---

## BLOCO 5 — REFINAR SLIDE

### 5.1 — CRIAR `app/api/agents/atlas/refine-slide/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { IntelligenceRouter } from '@/lib/openrouter/IntelligenceRouter'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verificar permissão: só admin e collaborator podem refinar
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'viewer') {
      return NextResponse.json({ error: 'Sem permissão para editar' }, { status: 403 })
    }

    const { assetId, slideNumber, instruction, regenerateImage } = await request.json()

    // Buscar asset e slide atual
    const { data: asset } = await supabase
      .from('creative_assets')
      .select('slides_data, dna_snapshot, style, template, format')
      .eq('id', assetId)
      .single()

    if (!asset) return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })

    const slides = asset.slides_data as Array<{
      number: number; title: string; subtitle: string; image_url: string; prompt: string
    }>
    const currentSlide = slides.find(s => s.number === slideNumber)
    if (!currentSlide) return NextResponse.json({ error: 'Slide não encontrado' }, { status: 404 })

    // VERA refina o texto do slide
    const refinePrompt = `Você é VERA. Refine o slide de carrossel abaixo seguindo a instrução.

SLIDE ATUAL:
Título: ${currentSlide.title}
Subtítulo: ${currentSlide.subtitle}

INSTRUÇÃO: "${instruction}"

Retorne APENAS JSON válido:
{
  "title": "novo título",
  "subtitle": "novo subtítulo",
  "image_context": "nova descrição de cena para a imagem em inglês"
}`

    const result = await IntelligenceRouter.routeChat('vera', [
      { role: 'user', content: refinePrompt }
    ], { maxTokens: 300 })

    let refined: { title: string; subtitle: string; image_context?: string } = {
      title: currentSlide.title,
      subtitle: currentSlide.subtitle,
    }
    try {
      refined = JSON.parse(result.content.replace(/```json|```/g, '').trim())
    } catch {}

    let newImageUrl = currentSlide.image_url

    // Regenerar imagem se solicitado
    if (regenerateImage && refined.image_context) {
      const { buildImagePrompt, getAspectRatio } = await import('@/lib/atlas/prompt-builder')
      const dna = asset.dna_snapshot as Parameters<typeof buildImagePrompt>[1]
      const imagePrompt = buildImagePrompt(
        { number: slideNumber, title: refined.title, subtitle: refined.subtitle, image_context: refined.image_context },
        dna, asset.template ?? 'minimalista'
      )

      try {
        const { imageBase64, mimeType } = await IntelligenceRouter.generateImage({
          prompt: imagePrompt,
          aspectRatio: getAspectRatio(asset.format ?? 'feed'),
        })
        const buffer = Buffer.from(imageBase64, 'base64')
        const path = `${assetId}-slide-${slideNumber}-${Date.now()}.png`
        const { error: storErr } = await supabase.storage
          .from('creative-assets').upload(path, buffer, { contentType: mimeType })
        if (!storErr) {
          const { data: url } = await supabase.storage
            .from('creative-assets').createSignedUrl(path, 60 * 60 * 24 * 365)
          newImageUrl = url?.signedUrl ?? currentSlide.image_url
        }
      } catch { /* mantém imagem anterior */ }
    }

    // Atualizar slides_data
    const updatedSlides = slides.map(s =>
      s.number === slideNumber
        ? { ...s, title: refined.title, subtitle: refined.subtitle, image_url: newImageUrl }
        : s
    )

    await supabase.from('creative_assets')
      .update({ slides_data: updatedSlides, updated_at: new Date().toISOString() })
      .eq('id', assetId)

    return NextResponse.json({
      success: true,
      slide: { ...currentSlide, title: refined.title, subtitle: refined.subtitle, image_url: newImageUrl }
    })
  } catch (error) {
    console.error('[atlas/refine-slide]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

## BLOCO 6 — CREATIVE STUDIO UI

### 6.1 — MODIFICAR `app/(dashboard)/clients/[id]/creative/page.tsx`

Substituir o formulário atual por um wizard de 3 etapas com geração progressiva:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Zap, Image, Edit3 } from 'lucide-react'

type Step = 'config' | 'generating' | 'preview'
type Template = 'minimalista' | 'profile'
type Format = 'feed' | 'stories' | 'banner' | 'thumbnail'

interface Slide { number: number; title: string; subtitle: string; image_url: string; prompt: string }

interface CreativeStudioProps { params: { id: string }; userRole: 'admin' | 'collaborator' | 'viewer' }

export default function CreativeStudioPage({ params, userRole }: CreativeStudioProps) {
  const [step, setStep] = useState<Step>('config')
  const [dna, setDna] = useState<Record<string, string> | null>(null)

  // Config state
  const [template, setTemplate] = useState<Template>('minimalista')
  const [format, setFormat] = useState<Format>('feed')
  const [slideCount, setSlideCount] = useState(6)
  const [userPrompt, setUserPrompt] = useState('')
  const [customStyle, setCustomStyle] = useState('')

  // Result state
  const [assetId, setAssetId] = useState<string | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedSlide, setSelectedSlide] = useState(0)
  const [showEditor, setShowEditor] = useState(false)

  // Carregar DNA do cliente
  useEffect(() => {
    fetch(`/api/clients/${params.id}/dna`)
      .then(r => r.json())
      .then(d => setDna(d))
      .catch(() => {})
  }, [params.id])

  async function generate() {
    if (!userPrompt.trim()) return
    setStep('generating')
    setError(null)
    setSlides([])

    try {
      const res = await fetch('/api/agents/atlas/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: params.id,
          userPrompt,
          template,
          format,
          slideCount,
          customStyle: customStyle || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAssetId(data.asset.id)
      setSlides(data.slides)
      setCaption(data.copy?.caption ?? '')
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar')
      setStep('config')
    }
  }

  async function approve() {
    if (!assetId) return
    await fetch('/api/agents/atlas/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action: 'approved' }),
    })
    // Reset para novo carrossel
    setStep('config')
    setUserPrompt('')
    setSlides([])
    setAssetId(null)
  }

  const canEdit = userRole === 'admin' || userRole === 'collaborator'

  // ── STEP: CONFIG ──────────────────────────────────────────────────────────
  if (step === 'config') return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
        Creative Studio
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        ATLAS gera o carrossel completo com o DNA do cliente aplicado automaticamente
      </p>

      {/* DNA Preview */}
      {dna && (
        <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '12px 14px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {dna.primary_color && (
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: dna.primary_color, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            DNA: <strong style={{ color: 'var(--color-text-primary)' }}>{dna.tone}</strong> · {dna.visual_style} · {dna.target_audience || 'público geral'}
          </span>
          <a href={`/clients/${params.id}?tab=dna`} style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Editar DNA →</a>
        </div>
      )}

      {/* Template selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>
          Estilo do carrossel
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {([
            { id: 'minimalista', label: 'Minimalista', desc: 'Imagem cinematográfica + título bold' },
            { id: 'profile', label: 'Profile / Twitter', desc: 'Texto + thumbnail, estilo notícia' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              style={{
                padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                background: template === t.id ? '#fef3c7' : 'var(--color-background-primary)',
                border: template === t.id ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
              }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: template === t.id ? '#b45309' : 'var(--color-text-primary)', marginBottom: '2px' }}>{t.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format + Slides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>Formato</label>
          <select value={format} onChange={e => setFormat(e.target.value as Format)}
            style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
            <option value="feed">Feed 4:5 (recomendado)</option>
            <option value="stories">Stories 9:16</option>
            <option value="banner">Banner 16:9</option>
            <option value="thumbnail">Thumbnail 16:9</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>Número de slides</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[3,4,5,6,7,8,10].map(n => (
              <button key={n} onClick={() => setSlideCount(n)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: slideCount === n ? '#fef3c7' : 'var(--color-background-primary)',
                  border: slideCount === n ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
                  color: slideCount === n ? '#b45309' : 'var(--color-text-primary)',
                  fontWeight: slideCount === n ? 700 : 400 }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>
          Sobre o que é o carrossel? *
        </label>
        <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
          placeholder="Ex: 5 motivos para usar IA no seu negócio / Erro que está matando suas vendas / Como dobrar seu faturamento em 3 meses..."
          rows={3}
          style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--color-text-primary)', resize: 'vertical' }} />
      </div>

      {/* Direcionamento de estilo (opcional) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>
          Direcionamento de imagem (opcional)
        </label>
        <input value={customStyle} onChange={e => setCustomStyle(e.target.value)}
          placeholder="Ex: pessoas realistas, tons neutros, fundo branco, close no produto..."
          style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-primary)' }} />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={generate} disabled={!userPrompt.trim()}
        style={{ width: '100%', background: '#f59e0b', color: '#000', fontWeight: 700, padding: '14px', borderRadius: '10px', fontSize: '15px', border: 'none', cursor: 'pointer', opacity: !userPrompt.trim() ? 0.4 : 1 }}>
        ★ Gerar com ATLAS
      </button>
    </div>
  )

  // ── STEP: GENERATING ─────────────────────────────────────────────────────
  if (step === 'generating') return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <Loader2 size={32} color="#f59e0b" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>VERA está escrevendo o copy...</p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>ATLAS vai gerar as imagens em seguida</p>
    </div>
  )

  // ── STEP: PREVIEW ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          Carrossel gerado — {slides.length} slides
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canEdit && (
            <button onClick={() => setShowEditor(!showEditor)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: showEditor ? '#fef3c7' : 'var(--color-background-secondary)', border: showEditor ? '0.5px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)', color: showEditor ? '#b45309' : 'var(--color-text-primary)' }}>
              <Edit3 size={13} /> {showEditor ? 'Fechar editor' : 'Editar'}
            </button>
          )}
          <button onClick={() => { setStep('config'); setSlides([]); setAssetId(null) }}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', color: 'var(--color-text-secondary)' }}>
            Novo carrossel
          </button>
          <button onClick={approve}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#f59e0b', border: 'none', color: '#000' }}>
            Aprovar e salvar
          </button>
        </div>
      </div>

      {/* Slides preview em grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
        {slides.map((slide, i) => (
          <div key={slide.number} onClick={() => setSelectedSlide(i)}
            style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: selectedSlide === i ? '2px solid #f59e0b' : '0.5px solid var(--color-border-tertiary)', position: 'relative' }}>
            {slide.image_url ? (
              <img src={slide.image_url} alt={slide.title}
                style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/5', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={20} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 8px 8px' }}>
              <p style={{ fontSize: '11px', color: '#fff', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{slide.title}</p>
            </div>
            <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#fff' }}>
              {slide.number}
            </div>
          </div>
        ))}
      </div>

      {/* Slide selecionado + editor inline */}
      {slides[selectedSlide] && (
        <SlideDetail
          slide={slides[selectedSlide]}
          assetId={assetId!}
          canEdit={canEdit}
          showEditor={showEditor}
          onUpdate={(updated) => {
            const newSlides = [...slides]
            newSlides[selectedSlide] = updated
            setSlides(newSlides)
          }}
        />
      )}

      {/* Caption */}
      {caption && (
        <div style={{ marginTop: '1.5rem', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Legenda gerada</span>
            <button onClick={() => navigator.clipboard.writeText(caption)}
              style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Copiar
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{caption}</p>
        </div>
      )}
    </div>
  )
}

// ── SUB-COMPONENTE: SlideDetail + Editor ─────────────────────────────────────
function SlideDetail({ slide, assetId, canEdit, showEditor, onUpdate }: {
  slide: { number: number; title: string; subtitle: string; image_url: string; prompt: string }
  assetId: string
  canEdit: boolean
  showEditor: boolean
  onUpdate: (updated: typeof slide) => void
}) {
  const [instruction, setInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [regenImage, setRegenImage] = useState(false)

  async function refine() {
    if (!instruction.trim()) return
    setIsRefining(true)
    const res = await fetch('/api/agents/atlas/refine-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, slideNumber: slide.number, instruction, regenerateImage: regenImage }),
    })
    const data = await res.json()
    if (data.success) {
      onUpdate({ ...slide, ...data.slide })
      setInstruction('')
    }
    setIsRefining(false)
  }

  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        {slide.image_url && (
          <img src={slide.image_url} alt={slide.title}
            style={{ width: '120px', aspectRatio: '4/5', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Slide {slide.number}</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>{slide.title}</p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>{slide.subtitle}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={slide.image_url} download={`slide-${slide.number}.png`}
              style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid var(--color-border-tertiary)' }}>
              Download
            </a>
            {canEdit && (
              <button onClick={() => navigator.clipboard.writeText(slide.prompt)}
                style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'none', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
                Copiar prompt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor inline — só admin/collaborator */}
      {canEdit && showEditor && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
            Refinar com IA
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={instruction} onChange={e => setInstruction(e.target.value)}
              placeholder={`Ex: deixe mais curto, adicione dado estatístico, tom mais urgente...`}
              style={{ flex: 1, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-primary)' }} />
            <button onClick={refine} disabled={!instruction.trim() || isRefining}
              style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#f59e0b', border: 'none', color: '#000', opacity: !instruction.trim() || isRefining ? 0.5 : 1 }}>
              {isRefining ? '...' : 'Refinar'}
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={regenImage} onChange={e => setRegenImage(e.target.checked)} />
            Regenerar imagem também
          </label>
        </div>
      )}
    </div>
  )
}
```

---

## BLOCO 7 — DNA CONFIG UI

### 7.1 — CRIAR `app/api/clients/[id]/dna/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('client_dna').select('*').eq('client_id', params.id).single()
  // Retorna objeto vazio se ainda não tem DNA configurado — Creative Studio usa defaults
  return NextResponse.json(data ?? {})
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, workspace_id').eq('id', user.id).single()
  if (profile?.role === 'viewer') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase.from('client_dna').upsert({
    client_id: params.id,
    workspace_id: profile?.workspace_id ?? user.id,
    ...body,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'client_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

### 7.2 — CRIAR `components/dna/DNACreativeConfig.tsx`

Componente para configurar o DNA específico para criação de conteúdo (aba DNA do cliente):

```tsx
'use client'
import { useState, useEffect } from 'react'

const VISUAL_STYLES = ['minimalista', 'bold', 'cinematografico', 'colorido', 'profile']
const TONES = ['profissional', 'casual', 'inspiracional', 'tecnico', 'humor']

export function DNACreativeConfig({ clientId, userRole }: { clientId: string; userRole: string }) {
  const [dna, setDna] = useState({ primary_color: '#000000', visual_style: 'minimalista', tone: 'profissional', target_audience: '', key_message: '', brand_voice_text: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const canEdit = userRole === 'admin' || userRole === 'collaborator'

  useEffect(() => {
    fetch(`/api/clients/${clientId}/dna`).then(r => r.json()).then(d => { if (d.client_id) setDna(d) })
  }, [clientId])

  async function save() {
    setSaving(true)
    await fetch(`/api/clients/${clientId}/dna`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dna)
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle = { width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-primary)', opacity: canEdit ? 1 : 0.6 }
  const label = (text: string) => (
    <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>{text}</label>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
      <div>
        {label('Cor primária da marca')}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="color" value={dna.primary_color} disabled={!canEdit} onChange={e => setDna(p => ({ ...p, primary_color: e.target.value }))} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: canEdit ? 'pointer' : 'default' }} />
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{dna.primary_color}</span>
        </div>
      </div>

      <div>
        {label('Estilo visual preferido')}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {VISUAL_STYLES.map(s => (
            <button key={s} disabled={!canEdit} onClick={() => setDna(p => ({ ...p, visual_style: s }))}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: canEdit ? 'pointer' : 'default', background: dna.visual_style === s ? '#fef3c7' : 'var(--color-background-primary)', border: dna.visual_style === s ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)', color: dna.visual_style === s ? '#b45309' : 'var(--color-text-primary)', fontWeight: dna.visual_style === s ? 600 : 400 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        {label('Tom de voz')}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TONES.map(t => (
            <button key={t} disabled={!canEdit} onClick={() => setDna(p => ({ ...p, tone: t }))}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: canEdit ? 'pointer' : 'default', background: dna.tone === t ? '#fef3c7' : 'var(--color-background-primary)', border: dna.tone === t ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)', color: dna.tone === t ? '#b45309' : 'var(--color-text-primary)', fontWeight: dna.tone === t ? 600 : 400 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>{label('Público-alvo')} <input value={dna.target_audience} disabled={!canEdit} onChange={e => setDna(p => ({ ...p, target_audience: e.target.value }))} placeholder="Ex: Mulheres 25-40 que querem emagrecer com saúde" style={inputStyle} /></div>
      <div>{label('Mensagem central da marca')} <input value={dna.key_message} disabled={!canEdit} onChange={e => setDna(p => ({ ...p, key_message: e.target.value }))} placeholder="Ex: Emagrecimento saudável sem sofrimento" style={inputStyle} /></div>
      <div>{label('Brand Voice (como a marca fala)')} <textarea value={dna.brand_voice_text} disabled={!canEdit} onChange={e => setDna(p => ({ ...p, brand_voice_text: e.target.value }))} placeholder="Descreva o tom, o estilo de escrita, palavras que usa e evita..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></div>

      {canEdit && (
        <button onClick={save} disabled={saving}
          style={{ background: '#f59e0b', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '10px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          {saving ? 'Salvando...' : saved ? 'DNA salvo ✓' : 'Salvar DNA'}
        </button>
      )}
    </div>
  )
}
```

---

## BLOCO 8 — GALERIA MELHORADA

### 8.1 — MODIFICAR `components/gallery/GalleryGrid.tsx`

```typescript
// Adicionar na query de creative_assets:
const { data: creativeAssets } = await supabase
  .from('creative_assets')
  .select('id, image_url, format, style, template, prompt, caption, slide_count, slides_data, status, created_at, clients(name)')
  .eq('client_id', clientId)  // ou sem filtro para galeria global
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
```

```tsx
// Card de criativo na galeria — adicionar:
<div className="group relative">
  <img src={asset.image_url} alt={asset.prompt?.slice(0, 50)} className="w-full rounded-lg object-cover aspect-[4/5]" />

  {/* Slide count badge */}
  {asset.slide_count > 1 && (
    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
      {asset.slide_count} slides
    </div>
  )}

  {/* Hover overlay */}
  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-start justify-end p-3 gap-2">
    {/* Prompt usado */}
    <p className="text-white/70 text-xs line-clamp-2">{asset.prompt}</p>
    <div className="flex gap-2 w-full">
      <a href={asset.image_url} download className="flex-1 bg-[var(--color-accent)] text-black text-xs font-semibold py-1.5 rounded text-center">
        Download
      </a>
      <button
        onClick={() => copyToClipboard(asset.prompt)}
        className="px-2 text-white/60 hover:text-white text-xs border border-white/20 rounded">
        Copiar prompt
      </button>
      <button
        onClick={() => reusePrompt(asset)}
        className="px-2 text-white/60 hover:text-white text-xs border border-white/20 rounded">
        Reusar
      </button>
    </div>
  </div>
</div>
```

---

## CHECKLIST DE VALIDAÇÃO

**DNA conectado:**
- [ ] `client_dna` table criada
- [ ] `GET /api/clients/[id]/dna` retorna dados do DNA
- [ ] Creative Studio exibe DNA preview (cor, tom, estilo) automaticamente
- [ ] Prompt do ATLAS inclui primary_color, tone e visual_style do DNA
- [ ] `dna_snapshot` salvo em creative_assets para rastreabilidade

**Geração de carrossel:**
- [ ] VERA gera copy estruturado (hook + slides + cta + caption)
- [ ] ATLAS gera imagem contextual para cada slide
- [ ] Prompt da imagem deriva do `image_context` do slide (não é genérico)
- [ ] Carrossel de 6 slides gera em < 2 minutos
- [ ] Slide sem imagem não quebra o carrossel inteiro

**Templates:**
- [ ] Minimalista: imagem full-bleed + espaço para texto no rodapé
- [ ] Profile/Twitter: fundo limpo + thumbnail lateral

**Editor (admin/collaborator):**
- [ ] Botão "Editar" visível só para admin e collaborator
- [ ] Viewer vê carrossel mas sem botão editar
- [ ] "Refinar slide com IA" reescreve título + subtítulo do slide selecionado
- [ ] "Regenerar imagem" gera nova imagem para o slide
- [ ] Alterações salvas em `slides_data` do creative_asset

**Galeria:**
- [ ] Prompt usado visível no hover de cada criativo
- [ ] Botão "Copiar prompt" funciona
- [ ] Botão "Reusar" reabre Creative Studio com prompt pré-preenchido
- [ ] Slide count badge visível nos carrosséis

---

## COMANDO PARA O CLAUDE CODE

```
Leia o SPEC-ATLAS-V2.md e implemente na ordem dos blocos.
Comece pelo BLOCO 0 (SQL).

Antes de criar qualquer arquivo verifique:
grep -rn "generate-carousel\|client_dna\|vera-copy\|prompt-builder" --include="*.ts" --include="*.tsx" . | grep -v node_modules

IMPORTANTE:
- lib/openrouter/IntelligenceRouter.ts já existe — NÃO recriar
- IntelligenceRouter.generateImage() já existe — usar diretamente
- creative_assets table já existe — só fazer ALTER
- Supabase Storage bucket creative-assets já existe
- /api/agents/atlas/generate já existe — NÃO modificar, criar /generate-carousel separado

Após cada bloco: git add -A && git commit -m "feat(atlas-v2): bloco N - descrição"
Após tudo: npm run build + git push
```
