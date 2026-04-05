import { createClient } from '@/lib/supabase/server'

const PRESET_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Masculina Institucional', lang: 'pt-BR', description: 'Voz grave e profissional, ideal para apresentações corporativas' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Feminina Jovem', lang: 'pt-BR', description: 'Voz animada e moderna, perfeita para Reels e TikTok' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Neutra Profissional', lang: 'pt-BR', description: 'Tom equilibrado para narrações e conteúdo educativo' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  const voices = [...PRESET_VOICES]

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
      })
    }
  }

  return Response.json(voices)
}
