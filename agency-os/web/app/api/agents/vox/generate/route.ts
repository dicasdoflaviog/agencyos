import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    text: string
    voice_id?: string
    client_id?: string
    job_id?: string
    format?: 'mp3' | 'pcm'
  }
  const { text, voice_id = 'pNInz6obpgDQGcFmaJgB', client_id, job_id, format = 'mp3' } = body

  if (!text?.trim()) return Response.json({ error: 'text required' }, { status: 400 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 })

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!elevenRes.ok) {
    const err = await elevenRes.text()
    return Response.json({ error: `ElevenLabs error: ${err}` }, { status: 500 })
  }

  const audioBuffer = await elevenRes.arrayBuffer()
  const fileName = `${Date.now()}-${voice_id}.mp3`
  const storagePath = `${profile?.workspace_id ?? 'default'}/${client_id ?? 'general'}/${fileName}`

  const { error: storageError } = await supabase.storage
    .from('audio-assets')
    .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg' })

  let audioUrl = ''
  if (!storageError) {
    const { data: publicData } = supabase.storage.from('audio-assets').getPublicUrl(storagePath)
    audioUrl = publicData.publicUrl
  } else {
    audioUrl = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`
  }

  const { data: asset } = await supabase.from('audio_assets').insert({
    client_id: client_id ?? null,
    job_id: job_id ?? null,
    workspace_id: profile?.workspace_id,
    text_content: text,
    voice_id,
    audio_url: audioUrl,
    format,
    created_by: user.id,
  }).select().single()

  return Response.json({ asset, url: audioUrl })
}
