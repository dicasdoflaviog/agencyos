import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CREATIVE_TYPES: Record<string, { size: '1024x1024' | '1792x1024' | '1024x1792'; label: string }> = {
  post_feed:  { size: '1024x1024',  label: 'Post Feed' },
  stories:    { size: '1024x1792',  label: 'Stories' },
  banner:     { size: '1792x1024',  label: 'Banner' },
  thumbnail:  { size: '1792x1024',  label: 'Thumbnail' },
  portrait:   { size: '1024x1792',  label: 'Retrato' },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    prompt,
    type = 'post_feed',
    client_id,
    job_id,
    style = 'photorealistic',
  } = await req.json() as {
    prompt: string
    type?: string
    client_id?: string
    job_id?: string
    style?: string
  }

  if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single()

  const config = CREATIVE_TYPES[type] ?? CREATIVE_TYPES.post_feed

  const enhancedPrompt = `${prompt}. Style: ${style}, professional marketing creative, high quality, vibrant, agency-level design. No text overlays unless specified.`

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: enhancedPrompt,
    size: config.size,
    quality: 'standard',
    n: 1,
  })

  const imageUrl = response.data?.[0]?.url
  if (!imageUrl) return Response.json({ error: 'Generation failed' }, { status: 500 })

  // Download and store in Supabase Storage
  const imageRes = await fetch(imageUrl)
  const imageBuffer = await imageRes.arrayBuffer()
  const fileName = `${Date.now()}-${type}.png`
  const storagePath = `${profile?.workspace_id ?? 'default'}/${client_id ?? 'general'}/${fileName}`

  const { error: storageError } = await supabase.storage
    .from('creative-assets')
    .upload(storagePath, imageBuffer, { contentType: 'image/png' })

  let finalUrl = imageUrl // fallback to temp URL if storage fails
  if (!storageError) {
    const { data: publicData } = supabase.storage.from('creative-assets').getPublicUrl(storagePath)
    finalUrl = publicData.publicUrl
  }

  // Save to DB
  const { data: asset } = await supabase.from('creative_assets').insert({
    client_id: client_id || null,
    job_id: job_id || null,
    workspace_id: profile?.workspace_id,
    type,
    prompt: enhancedPrompt,
    image_url: finalUrl,
    model: 'dall-e-3',
    created_by: user.id,
  }).select().single()

  return Response.json({ asset, url: finalUrl })
}
