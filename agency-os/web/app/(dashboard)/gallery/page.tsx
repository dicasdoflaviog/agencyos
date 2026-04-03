import { createClient } from '@/lib/supabase/server'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'

interface GalleryPageProps {
  searchParams: Promise<{ client?: string; status?: string }>
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { client: clientFilter, status: statusFilter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('job_outputs')
    .select('*, client:clients(id, name), job:jobs(id, title)')
    .order('created_at', { ascending: false })

  if (clientFilter) query = query.eq('client_id', clientFilter)
  if (statusFilter)  query = query.eq('status', statusFilter)

  const [{ data: outputs }, { data: clients }] = await Promise.all([
    query,
    supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
  ])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Galeria</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">{outputs?.length ?? 0} outputs gerados</p>
      </div>
      <GalleryGrid
        outputs={outputs ?? []}
        clients={clients ?? []}
        activeClient={clientFilter ?? null}
        activeStatus={statusFilter ?? null}
      />
    </div>
  )
}
