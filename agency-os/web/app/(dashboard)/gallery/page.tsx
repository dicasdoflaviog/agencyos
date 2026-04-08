import { createClient } from '@/lib/supabase/server'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { AtlasGallerySection } from '@/components/gallery/AtlasGallerySection'
import { Images } from 'lucide-react'

interface GalleryPageProps {
  searchParams: Promise<{ client?: string; status?: string; type?: string }>
}

// output_types that belong to the "strategy" tab (hidden by default)
const STRATEGY_TYPES = ['strategy', 'script']

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { client: clientFilter, status: statusFilter, type: typeFilter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('job_outputs')
    .select('*, client:clients(id, name), job:jobs(id, title)')
    .order('created_at', { ascending: false })

  if (clientFilter) query = query.eq('client_id', clientFilter)
  if (statusFilter)  query = query.eq('status', statusFilter)

  // By default (no type tab selected) hide strategy/script — they live inside the Job
  if (!typeFilter) {
    query = query.not('output_type', 'in', `(${STRATEGY_TYPES.map(t => `"${t}"`).join(',')})`)
  }

  // Query ATLAS approved creative assets
  let atlasQuery = supabase
    .from('creative_assets')
    .select('id, client_id, format, style, type, status, prompt, image_url, model, created_at, client:clients(id, name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(24)

  if (clientFilter) atlasQuery = atlasQuery.eq('client_id', clientFilter)

  const [{ data: outputs }, { data: clients }, { data: atlasAssets }] = await Promise.all([
    query,
    supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
    atlasQuery,
  ])

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
          <Images size={18} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Galeria</h2>
          <p className="text-xs text-[var(--color-text-muted)]">Outputs visuais e criativos gerados pelos agentes</p>
        </div>
      </div>

      {/* ATLAS Creative Assets — seção dedicada */}
      {(atlasAssets && atlasAssets.length > 0) && (
        <AtlasGallerySection assets={atlasAssets.map(a => ({
          ...a,
          client: Array.isArray(a.client) ? (a.client[0] ?? null) : a.client,
        }))} />
      )}

      <GalleryGrid
        outputs={outputs ?? []}
        clients={clients ?? []}
        activeClient={clientFilter ?? null}
        activeType={typeFilter ?? null}
        activeStatus={statusFilter ?? null}
      />
    </div>
  )
}
