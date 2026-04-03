'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { OutputCard } from '@/components/agents/OutputCard'
import type { JobOutput, Client } from '@/types/database'

interface GalleryGridProps {
  outputs: JobOutput[]
  clients: Pick<Client, 'id' | 'name'>[]
  activeClient: string | null
  activeStatus: string | null
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'pending',  label: 'Pendente' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'revision', label: 'Revisão' },
  { value: 'rejected', label: 'Rejeitado' },
]

export function GalleryGrid({ outputs, clients, activeClient, activeStatus }: GalleryGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectClass = 'rounded border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#F59E0B] cursor-pointer'

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={activeClient ?? ''}
          onChange={(e) => setFilter('client', e.target.value)}
          className={selectClass}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={activeStatus ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
          className={selectClass}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-[#A1A1AA]">{outputs.length} resultado{outputs.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      {outputs.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {outputs.map((output) => (
            <OutputCard key={output.id} output={output} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/[0.07] p-12 text-center">
          <p className="text-sm text-[#A1A1AA]">Nenhum output encontrado</p>
          <p className="mt-1 text-xs text-[#A1A1AA]/60">Ative um agente em um job para gerar outputs</p>
        </div>
      )}
    </div>
  )
}
