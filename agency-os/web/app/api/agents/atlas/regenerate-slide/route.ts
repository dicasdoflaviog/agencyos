import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateImage } from '@/lib/openrouter/IntelligenceRouter'
import { checkAndDeductCredits } from '@/lib/credits'
import { fireAgentTask } from '@/lib/n8n-pipeline'

// Gemini gera em ~15s; 120s é mais do que suficiente
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'viewer') {
      return NextResponse.json({ error: 'Sem permissão para regenerar imagens' }, { status: 403 })
    }

    const { assetId, slideNumber, imagePrompt } = await request.json()

    if (!assetId || !slideNumber || !imagePrompt?.trim()) {
      return NextResponse.json(
        { error: 'assetId, slideNumber e imagePrompt são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar asset para obter format e client_id
    const { data: asset } = await supabase
      .from('creative_assets')
      .select('client_id, format, slides_data')
      .eq('id', assetId)
      .single()

    if (!asset) return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })

    // Verificar e debitar créditos (15 créditos por geração de imagem)
    const workspaceId = process.env.AGENCY_WORKSPACE_ID!
    const credit = await checkAndDeductCredits(
      workspaceId,
      'content_generation',
      `Regenerar slide ${slideNumber} — ATLAS`
    )
    if (!credit.ok) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Disponível: ${credit.balance}, necessário: ${credit.cost}` },
        { status: 402 }
      )
    }

    // Gerar imagem com o prompt editado
    const { getAspectRatio } = await import('@/lib/atlas/prompt-builder')
    const aspectRatio = getAspectRatio(asset.format ?? 'feed')

    const { imageBase64, mimeType } = await generateImage({ prompt: imagePrompt, aspectRatio })

    // Salvar no storage via admin (bypass RLS)
    const adminSupabase = createAdminClient()
    const storagePath = `${asset.client_id}/${assetId}-regen-s${slideNumber}-${Date.now()}.png`

    const { error: storErr } = await adminSupabase.storage
      .from('creative-assets')
      .upload(storagePath, Buffer.from(imageBase64, 'base64'), { contentType: mimeType, upsert: false })

    if (storErr) {
      console.error('[regenerate-slide] Storage error:', storErr.message)
      return NextResponse.json({ error: `Falha ao salvar imagem: ${storErr.message}` }, { status: 500 })
    }

    const { data: urlData } = await adminSupabase.storage
      .from('creative-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    const newImageUrl = urlData?.signedUrl ?? ''

    // Atualizar slides_data no banco
    const slidesData = asset.slides_data as Array<{
      number: number; image_url: string; prompt: string; [key: string]: unknown
    }>

    const updatedSlides = slidesData.map(s =>
      s.number === slideNumber
        ? { ...s, image_url: newImageUrl, prompt: imagePrompt }
        : s
    )

    await supabase
      .from('creative_assets')
      .update({
        slides_data: updatedSlides,
        // Se for o slide 1, atualiza também o thumbnail principal
        ...(slideNumber === 1 ? { image_url: newImageUrl } : {}),
      })
      .eq('id', assetId)

    // Disparar sinal n8n (fire-and-forget)
    fireAgentTask({
      agent:     'atlas',
      label:     'ATLAS Image Regen',
      task:      `regenerate-slide-${slideNumber}`,
      status:    'complete',
      client_id: asset.client_id,
      output_id: assetId,
    })

    return NextResponse.json({
      success:           true,
      image_url:         newImageUrl,
      credits_remaining: credit.balance,
    })

  } catch (error) {
    console.error('[atlas/regenerate-slide]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
