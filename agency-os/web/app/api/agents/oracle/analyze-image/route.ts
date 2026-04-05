import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image } = await req.json() as { image?: string }
  if (!image) return NextResponse.json({ error: 'image required' }, { status: 400 })

  // Extract base64 data and MIME type from data URL
  const match = image.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

  const [, mimeType, base64Data] = match

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64Data },
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

    const analysis = message.content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text : ''))
      .join('')
      .trim()

    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
