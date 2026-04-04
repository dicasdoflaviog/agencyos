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
  return Response.json(PRESET_VOICES)
}
