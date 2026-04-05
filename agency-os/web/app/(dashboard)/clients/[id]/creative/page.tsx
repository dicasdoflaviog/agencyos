import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CreativeStudio, type CreativeAsset } from '@/components/agents/CreativeStudio'

export default async function CreativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: assets } = await supabase
    .from('creative_assets')
    .select('id, image_url, type, prompt, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Creative Studio</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Criativos com IA</p>
      </div>
      <CreativeStudio
        clientId={id}
        clientName={client.name}
        initialAssets={(assets ?? []) as CreativeAsset[]}
      />
    </div>
  )
}
