import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  type GeminiImagePart,
  type GeminiTextPart,
  type GeminiPart,
  type GeminiResponsePart,
  type GeminiResponse,
} from '@/types/gemini'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    prompt: string
    type?: string
    style?: string
    client_id?: string
    job_id?: string
    reference_images?: string[]
  }
  const { prompt, type = 'post_feed', style = 'photorealistic', client_id, job_id, reference_images = [] } = body

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  const enhancedPrompt = `Create a professional marketing creative image. Type: ${type} format. Style: ${style}. ${prompt}. High quality, agency-level design, vibrant colors, suitable for social media marketing.`

  const parts: GeminiPart[] = [{ text: enhancedPrompt }]

  for (const imgUrl of reference_images.slice(0, 14)) {
    try {
      if (imgUrl.startsWith('data:')) {
        const [header, data] = imgUrl.split(',')
        const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
        parts.push({ inlineData: { mimeType, data } })
      } else {
        const imgRes = await fetch(imgUrl)
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const ct = imgRes.headers.get('content-type') ?? 'image/jpeg'
        parts.push({ inlineData: { mimeType: ct, data: base64 } })
      }
    } catch { /* skip bad references */ }
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  )

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    return Response.json({ error: `Gemini API error: ${err}` }, { status: 500 })
  }

  const geminiData = await geminiRes.json() as GeminiResponse

  const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!imagePart?.inlineData) {
    return Response.json({ error: 'No image generated' }, { status: 500 })
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
  const fileName = `${Date.now()}-${type}-v2.png`
  const storagePath = `${profile?.workspace_id ?? 'default'}/${client_id ?? 'general'}/${fileName}`

  const { error: storageError } = await supabase.storage
    .from('creative-assets')
    .upload(storagePath, imageBuffer, { contentType: 'image/png' })

  let finalUrl = `data:image/png;base64,${imagePart.inlineData.data}`
  if (!storageError) {
    const { data: publicData } = supabase.storage.from('creative-assets').getPublicUrl(storagePath)
    finalUrl = publicData.publicUrl
  }

  const { data: asset } = await supabase.from('creative_assets').insert({
    client_id: client_id ?? null,
    job_id: job_id ?? null,
    workspace_id: profile?.workspace_id,
    type,
    prompt: enhancedPrompt,
    image_url: finalUrl,
    model: 'gemini-2.0-flash-image',
    created_by: user.id,
  }).select().single()

  return Response.json({ asset, url: finalUrl })
}
