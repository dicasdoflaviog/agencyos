import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VulcanStudio, type VideoJob } from '@/components/agents/VulcanStudio'

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: jobs } = await supabase
    .from('video_jobs').select('*').eq('client_id', id)
    .order('created_at', { ascending: false }).limit(20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">VULCAN</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Vídeos com IA</p>
      </div>
      <VulcanStudio clientId={id} clientName={client.name} initialJobs={(jobs ?? []) as VideoJob[]} />
    </div>
  )
}
