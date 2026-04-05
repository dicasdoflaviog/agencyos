'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { GalleryCard } from './GalleryCard'
import type { JobOutput, Client } from '@/types/database'
import { ImageIcon, Video, FileText, Layers, Mic, LayoutGrid } from 'lucide-react'

interface GalleryGridProps {
  outputs: JobOutput[]
  clients: Pick<Client, 'id' | 'name'>[]
  activeClient: string | null
  activeType: string | null
  activeStatus: string | null
}

const TYPE_TABS = [
  { value: '',        label: 'Todos',     icon: LayoutGrid },
  { value: 'visual',  label: 'Visuais',   icon: ImageIcon  },
  { value: 'copy',    label: 'Copy',      icon: FileText   },
  { value: 'carousel',label: 'Carrossel', icon: Layers     },
  { value: 'video',   label: 'Vídeo',     icon: Video      },
  { value: 'audio',   label: 'Áudio',     icon: Mic        },
  { value: 'strategy',label: 'Estratégia',icon: FileText   },
]

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending',  label: 'Pendente' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'revision', label: 'Revisão'  },
  { value: 'rejected', label: 'Rejeitado'},
]

// Which output_type values belong to each tab
const TYPE_MAP: Record<string, string[]> = {
  visual   : ['image', 'design_preview'],
  copy     : ['copy', 'image_prompt', 'text'],
  carousel : ['carousel'],
  video    : ['video'],
  audio    : ['audio'],
  strategy : ['strategy', 'script'],
}

function filterByType(outputs: JobOutput[], typeTab: string): JobOutput[] {
  if (!typeTab) return outputs
  const allowed = TYPE_MAP[typeTab]
  if (!allowed) return outputs
  return outputs.filter(o => allowed.includes(o.output_type))
}

export function GalleryGrid({ outputs, clients, activeClient, activeType, activeStatus }: GalleryGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const displayed = filterByType(outputs, activeType ?? '')
  const selectClass = 'rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-amber-500/50 cursor-pointer'

  return (
    <div>
      {/* Type tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TYPE_TABS.map(({ value, label, icon: Icon }) => {
          const active = (activeType ?? '') === value
          return (
            <button
              key={value}
              onClick={() => setFilter('type', value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-amber-500 text-[#09090B] shadow-lg shadow-amber-500/20'
                  : 'bg-white/[0.05] text-[#A1A1AA] border border-white/[0.07] hover:bg-white/[0.08] hover:text-[#FAFAFA]'
              }`}
            >
              <Icon size={11} strokeWidth={active ? 2.5 : 2} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Secondary filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select value={activeClient ?? ''} onChange={e => setFilter('client', e.target.value)} className={selectClass}>
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={activeStatus ?? ''} onChange={e => setFilter('status', e.target.value)} className={selectClass}>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-[#52525B]">
          {displayed.length} resultado{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {displayed.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayed.map(output => (
            <GalleryCard key={output.id} output={output} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07] py-20 text-center">
          <LayoutGrid size={28} className="mb-3 text-[#3F3F46]" />
          <p className="text-sm text-[#71717A]">Nenhum output nesta categoria</p>
          <p className="mt-1 text-xs text-[#52525B]">Ative um agente em um job para gerar outputs</p>
        </div>
      )}
    </div>
  )
}
