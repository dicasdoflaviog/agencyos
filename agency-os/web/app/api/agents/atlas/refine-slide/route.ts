import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeChat, generateImage } from '@/lib/openrouter/IntelligenceRouter'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    const { assetId, slideNumber, instruction, regenerateImage: shouldRegenImage } = await request.json()

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

    const result = await routeChat('vera', [
      { role: 'user', content: refinePrompt }
    ], { maxTokens: 300 })

    let refined: { title: string; subtitle: string; image_context?: string } = {
      title: currentSlide.title,
      subtitle: currentSlide.subtitle,
    }
    try {
      refined = JSON.parse(result.content.replace(/```json|```/g, '').trim())
    } catch { /* mantém valores atuais */ }

    let newImageUrl = currentSlide.image_url

    // Regenerar imagem se solicitado
    if (shouldRegenImage && refined.image_context) {
      const { buildImagePrompt, getAspectRatio } = await import('@/lib/atlas/prompt-builder')
      const dna = asset.dna_snapshot as Parameters<typeof buildImagePrompt>[1]
      const imagePrompt = buildImagePrompt(
        { number: slideNumber, title: refined.title, subtitle: refined.subtitle, image_context: refined.image_context },
        dna, asset.template ?? 'minimalista'
      )

      try {
        const { imageBase64, mimeType } = await generateImage({
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
      .update({ slides_data: updatedSlides })
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
