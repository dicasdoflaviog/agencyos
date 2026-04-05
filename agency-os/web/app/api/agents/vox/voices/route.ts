import { createClient } from '@/lib/supabase/server'

const PRESET_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Masculina Institucional', lang: 'pt-BR', description: 'Voz grave e profissional, ideal para apresentações corporativas' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Feminina Jovem',          lang: 'pt-BR', description: 'Voz animada e moderna, perfeita para Reels e TikTok' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Neutra Profissional',      lang: 'pt-BR', description: 'Tom equilibrado para narrações e conteúdo educativo' },
]

async function fetchPreviewUrls(apiKey: string): Promise<Record<string, string>> {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
      next: { revalidate: 3600 }, // cache 1 h
    })
    if (!res.ok) return {}
    const data = await res.json() as { voices: { voice_id: string; preview_url: string }[] }
    return Object.fromEntries(data.voices.map(v => [v.voice_id, v.preview_url]))
  } catch { return {} }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY ?? ''
  const previewMap = apiKey ? await fetchPreviewUrls(apiKey) : {}

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  const voices = PRESET_VOICES.map(v => ({
    ...v,
    preview_url: previewMap[v.id] ?? null,
  }))

  if (profile?.workspace_id) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('cloned_voice_id, cloned_voice_name')
      .eq('id', profile.workspace_id)
      .single()

    if (ws?.cloned_voice_id) {
      voices.unshift({
        id: ws.cloned_voice_id,
        name: ws.cloned_voice_name ?? 'Minha Voz',
        lang: 'pt-BR',
        description: '⭐ Sua voz clonada com IA',
        preview_url: previewMap[ws.cloned_voice_id] ?? null,
      })
    }
  }

  return Response.json(voices)
}
