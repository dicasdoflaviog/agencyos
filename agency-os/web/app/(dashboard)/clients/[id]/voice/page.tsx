import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VoxStudio, type AudioAsset } from '@/components/agents/VoxStudio'

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
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">VOX</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Narração com IA</p>
      </div>
      <VoxStudio clientId={id} clientName={client.name} initialAssets={(assets ?? []) as AudioAsset[]} />
    </div>
  )
}
