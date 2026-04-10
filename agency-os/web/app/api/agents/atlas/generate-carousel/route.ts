import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientDNA } from '@/lib/atlas/dna'
import { generateCarouselCopy } from '@/lib/atlas/vera-copy'
import { buildImagePrompt, getAspectRatio } from '@/lib/atlas/prompt-builder'
import { generateImage } from '@/lib/openrouter/IntelligenceRouter'
import { renderSlideToBuffer } from '@/lib/atlas/render-template'
import { checkAndDeductCredits } from '@/lib/credits'

// Flux.1-dev pode levar até 40s por imagem × 10 slides = 400s máx
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      clientId,
      jobId,
      userPrompt,
      template = 'minimalista',     // 'minimalista' | 'profile'
      format = 'feed',               // 'feed' | 'stories' | 'banner' | 'thumbnail'
      slideCount = 6,                // 3–10
      customStyle,                   // direcionamento extra de estilo (opcional)
      referenceImageUrl,             // URL de imagem de referência (opcional)
    } = body

    if (!clientId || !userPrompt) {
      return NextResponse.json({ error: 'clientId e userPrompt são obrigatórios' }, { status: 400 })
    }

    // 0. Verificar e debitar créditos (15 por slide = custo total proporcional ao carrossel)
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle()
    const workspaceId = profile?.workspace_id
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace não encontrado para este usuário' }, { status: 403 })
    }
    const totalSlides = Math.min(Math.max(slideCount, 3), 10)
    const credit = await checkAndDeductCredits(
      workspaceId,
      'content_generation',
      `Gerar carrossel ATLAS — ${totalSlides} slides (${template})`
    )
    if (!credit.ok) {
      return NextResponse.json(
        {
          error: `Créditos insuficientes para gerar ${totalSlides} slides. Disponível: ${credit.balance}, necessário: ${credit.cost}`,
          credits_balance: credit.balance,
          credits_needed:  credit.cost,
        },
        { status: 402 }
      )
    }

    // 1. Buscar DNA do cliente
    const dna = await getClientDNA(clientId, supabase)

    // 2. VERA gera copy de todos os slides
    const copy = await generateCarouselCopy(
      userPrompt,
      totalSlides,
      template,
      dna
    )

    // 3. Renderizar slides: Motor HTML → PNG (server-side) com fallback para FLUX
    // Blueprints T05 e T04 → render-template (pixel-fidelity)
    // Outros templates → gera background via FLUX e renderiza sobre ele
    const aspectRatio = getAspectRatio(format)
    const adminSupabase = createAdminClient()

    const slidesWithImages = await Promise.all(
      copy.slides.map(async (slide) => {
        const effectiveTemplate = slide.template_id || template

        try {
          let imageBuffer: Buffer

          // Templates com renderização server-side nativa (sem depender de FLUX)
          const SERVER_RENDERED = ['titulo-bold', 'problema-solucao', 'produto-flutuante', 'fundo-solido']

          if (SERVER_RENDERED.includes(effectiveTemplate)) {
            // Motor de Renderização: template HTML → PNG diretamente
            imageBuffer = await renderSlideToBuffer(slide, dna)
            console.log(`[atlas] Slide ${slide.number} renderizado via Satori (${effectiveTemplate}), buffer: ${imageBuffer.length} bytes`)
          } else {
            // Outros templates: gera background via FLUX e renderiza sobre ele
            const imagePrompt = buildImagePrompt(slide, dna, effectiveTemplate, customStyle)
            const { imageBase64, mimeType } = await generateImage({ prompt: imagePrompt, aspectRatio })
            const fluxBuffer = Buffer.from(imageBase64, 'base64')
            // Renderiza template com background do FLUX
            const bgDataUrl = `data:${mimeType};base64,${imageBase64}`
            imageBuffer = await renderSlideToBuffer(slide, dna, bgDataUrl)
            void fluxBuffer // usada via bgDataUrl acima
          }

          const slideAssetId = crypto.randomUUID()
          const storagePath = `${clientId}/${slideAssetId}.png`

          const { error: storageErr } = await adminSupabase.storage
            .from('creative-assets')
            .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: false })

          if (storageErr) {
            console.error(`[atlas/generate-carousel] Storage upload falhou (slide ${slide.number}):`, storageErr.message)
          }

          let imageUrl = ''
          if (!storageErr) {
            const { data: urlData } = await adminSupabase.storage
              .from('creative-assets')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
            imageUrl = urlData?.signedUrl ?? ''
            console.log(`[atlas] Slide ${slide.number} URL: ${imageUrl ? 'ok (' + imageUrl.slice(0, 60) + '...)' : 'VAZIA'}`)
          }

          return {
            number:        slide.number,
            title:         slide.title,
            subtitle:      slide.subtitle,
            image_url:     imageUrl,
            storage_error: storageErr?.message ?? null,
            prompt:        `[blueprint:${effectiveTemplate}] ${slide.title}`,
            template_id:   slide.template_id,
            template_data: slide.template_data ?? null,
          }
        } catch (slideErr) {
          const msg = slideErr instanceof Error ? slideErr.message : String(slideErr)
          console.error(`[atlas/generate-carousel] Slide ${slide.number} falhou:`, msg)
          return {
            number:           slide.number,
            title:            slide.title,
            subtitle:         slide.subtitle,
            image_url:        '',
            generation_error: msg,
            prompt:           '',
            template_id:      slide.template_id,
            template_data:    slide.template_data ?? null,
          }
        }
      })
    )

    // 4. Salvar creative_asset principal (representa o carrossel)
    const { data: asset, error: dbErr } = await supabase
      .from('creative_assets')
      .insert({
        client_id:           clientId,
        job_id:              jobId ?? null,
        format,
        style:               dna.visual_style,
        template,
        prompt:              userPrompt,
        image_url:           slidesWithImages[0]?.image_url ?? '',   // thumbnail = slide 1
        slide_count:         slidesWithImages.length,
        slides_data:         slidesWithImages,
        caption:             copy.caption,
        dna_snapshot:        { ...dna, generated_at: new Date().toISOString() },
        reference_image_url: referenceImageUrl ?? null,
        model:               'atlas-v2',
        status:              'pending',
        source:              'manual',
        created_by:          user.id,
      })
      .select()
      .single()

    if (dbErr) throw dbErr

    return NextResponse.json({
      success:         true,
      asset,
      copy,
      slides:          slidesWithImages,
      credits_balance: credit.balance,
    })

  } catch (error) {
    console.error('[atlas/generate-carousel]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
