import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // segundos — geração de imagem pode levar ~20-30s

const FORMAT_ASPECT_RATIO: Record<string, string> = {
  feed:      '1:1',
  stories:   '9:16',
  banner:    '16:9',
  thumbnail: '16:9',
  portrait:  '9:16',
  carousel:  '1:1',
  // legado
  post_feed:  '1:1',
  carrossel:  '1:1',
}

const STYLE_KEYWORDS: Record<string, string> = {
  fotorrealista:   'photorealistic, high quality photography, professional lighting',
  photorealistic:  'photorealistic, high quality photography, professional lighting',
  ilustracao:      'digital illustration, artistic, colorful, vector style',
  illustration:    'digital illustration, artistic, colorful, vector style',
  minimalista:     'minimalist, clean, simple, white space, modern design',
  minimal:         'minimalist, clean, simple, white space, modern design',
  bold:            'bold graphic design, strong colors, high contrast, impactful',
  bold_graphic:    'bold graphic design, strong colors, high contrast, impactful',
  cinematografico: 'cinematic, dramatic lighting, film quality, atmospheric mood',
  cinematic:       'cinematic, dramatic lighting, film quality, atmospheric mood',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    prompt: string
    format?: string
    style?: string
    // legado
    type?: string
    client_id?: string
    clientId?: string
    job_id?: string
    jobId?: string
  }

  const format    = body.format ?? body.type ?? 'feed'
  const style     = body.style ?? 'fotorrealista'
  const clientId  = body.clientId ?? body.client_id
  const jobId     = body.jobId ?? body.job_id
  const rawPrompt = body.prompt?.trim()

  if (!rawPrompt) return Response.json({ error: 'prompt obrigatório' }, { status: 400 })

  // Enriquecer prompt com contexto do cliente
  let clientContext = ''
  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, niche')
      .eq('id', clientId)
      .single()
    if (client) clientContext = `Brand: ${client.name}${client.niche ? `, ${client.niche}` : ''}.`
  }

  const styleKeywords = STYLE_KEYWORDS[style] ?? style
  const enrichedPrompt = [
    rawPrompt,
    styleKeywords,
    clientContext,
    'Professional marketing creative. No text overlays unless explicitly requested.',
  ].filter(Boolean).join('. ')

  const aspectRatio = FORMAT_ASPECT_RATIO[format] ?? '1:1'

  // Gerar imagem via OpenRouter
  let imageBase64: string
  let mimeType: string
  let usedFallback: boolean

  try {
    const result = await generateImage({ prompt: enrichedPrompt, aspectRatio })
    imageBase64  = result.imageBase64
    mimeType     = result.mimeType
    usedFallback = result.usedFallback
  } catch (err) {
    console.error('[ATLAS generate]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Falha na geração de imagem' },
      { status: 500 },
    )
  }

  // Upload para Supabase Storage
  const assetId     = crypto.randomUUID()
  const ext         = mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const storagePath = `${clientId ?? 'general'}/${assetId}.${ext}`
  const imageBuffer = Buffer.from(imageBase64, 'base64')

  const { error: storageError } = await supabase.storage
    .from('creative-assets')
    .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: false })

  // Signed URL válida por 1 ano (fallback para data URL se storage falhar)
  let imageUrl = `data:${mimeType};base64,${imageBase64}`
  if (!storageError) {
    const { data: urlData } = await supabase.storage
      .from('creative-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
    if (urlData?.signedUrl) imageUrl = urlData.signedUrl
  }

  console.log(`[ATLAS] imageUrl type=${imageUrl.startsWith('data:') ? 'dataURL' : 'signedURL'} base64len=${imageBase64.length} storageErr=${storageError?.message ?? 'none'}`)

  const modelUsed = usedFallback ? 'google/gemini-3.1-flash-image-preview' : 'google/gemini-2.5-flash-image'

  // Salvar em creative_assets — tenta com colunas novas, faz fallback para schema legado
  let asset: Record<string, unknown> | null = null
  let dbError: { message: string } | null = null

  // Tentativa 1: schema completo (pós-migration)
  const insertFull = await supabase
    .from('creative_assets')
    .insert({
      client_id:  clientId ?? null,
      job_id:     jobId ?? null,
      format,
      style,
      type:       format,
      prompt:     rawPrompt,
      image_url:  imageUrl,
      model:      modelUsed,
      status:     'pending',
      source:     'manual',
      created_by: user.id,
    })
    .select()
    .single()

  if (insertFull.error) {
    // Tentativa 2: schema legado (sem format/style/status/source)
    const insertLegacy = await supabase
      .from('creative_assets')
      .insert({
        client_id:  clientId ?? null,
        job_id:     jobId ?? null,
        type:       format,
        prompt:     rawPrompt,
        image_url:  imageUrl,
        model:      modelUsed,
        created_by: user.id,
      })
      .select()
      .single()
    asset   = insertLegacy.data as Record<string, unknown> | null
    dbError = insertLegacy.error
  } else {
    asset = insertFull.data as Record<string, unknown> | null
  }

  if (dbError) {
    console.error('[ATLAS generate] DB error:', dbError)
    return Response.json({ error: `Erro ao salvar: ${dbError.message}` }, { status: 500 })
  }

  return Response.json({ success: true, asset, url: imageUrl })
}

