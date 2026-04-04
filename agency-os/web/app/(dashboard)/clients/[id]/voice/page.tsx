import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VoxStudio } from '@/components/agents/VoxStudio'

interface AudioAsset {
  id: string
  text_content: string
  voice_id: string
  audio_url: string
  created_at: string
}

export default async function VoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: assets } = await supabase
    .from('audio_assets').select('*').eq('client_id', id)
    .order('created_at', { ascending: false }).limit(20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#FAFAFA]">VOX</h1>
        <p className="text-sm text-[#A1A1AA] mt-0.5">Narração com IA · {client.name}</p>
      </div>
      <VoxStudio clientId={id} clientName={client.name} initialAssets={(assets ?? []) as AudioAsset[]} />
    </div>
  )
}
