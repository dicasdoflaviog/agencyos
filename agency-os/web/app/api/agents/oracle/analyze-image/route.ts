import { NextRequest, NextResponse } from 'next/server'
import { openrouter } from '@/lib/openrouter/client'
import { getProviderModel } from '@/lib/openrouter/models'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image } = await req.json() as { image?: string }
  if (!image) return NextResponse.json({ error: 'image required' }, { status: 400 })

  const match = image.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

  try {
    const response = await openrouter.chat.completions.create({
      model: getProviderModel('atlas'),
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: image },
            },
            {
              type: 'text',
              text: `Analise esta imagem de referência e descreva em 2-3 frases curtas, em português:
- Estilo visual (ex: flat, 3D, fotorrealista, minimalista, bold)
- Paleta de cores predominante
- Composição e elementos visuais principais

Seja conciso e técnico. Foco em informações úteis para replicar o estilo em um criativo de marketing.`,
            },
          ],
        },
      ],
    })

    const analysis = response.choices[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
