import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null
  const voiceName = ((formData.get('name') as string) || 'Minha Voz').trim()

  if (!audioFile) return Response.json({ error: 'audio file required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()
  if (!profile?.workspace_id) return Response.json({ error: 'Workspace not found' }, { status: 400 })

  // Forward audio to ElevenLabs Instant Voice Cloning
  const elevenForm = new FormData()
  elevenForm.append('name', voiceName)
  elevenForm.append('description', 'Voz clonada via Agency OS VOX')
  elevenForm.append('files', audioFile, 'voice-sample.webm')
  elevenForm.append('labels', JSON.stringify({ source: 'agency-os', workspace: profile.workspace_id }))

  const elevenRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: elevenForm,
  })

  if (!elevenRes.ok) {
    const err = await elevenRes.text()
    return Response.json({ error: `ElevenLabs: ${err}` }, { status: 502 })
  }

  const { voice_id } = await elevenRes.json() as { voice_id: string }

  // Persist voice_id in workspace using admin client (bypasses RLS)
  const admin = createAdminClient()
  await admin.from('workspaces').update({
    cloned_voice_id: voice_id,
    cloned_voice_name: voiceName,
  }).eq('id', profile.workspace_id)

  return Response.json({ voice_id, name: voiceName })
}
