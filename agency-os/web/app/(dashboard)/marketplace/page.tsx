import { createClient } from '@/lib/supabase/server'
import { AgentCard } from '@/components/marketplace/AgentCard'
import { MarketplaceAgent } from '@/types/database'
import { Bot } from 'lucide-react'

export const metadata = { title: 'Marketplace | Agency OS' }

interface Props {
  searchParams: Promise<{ category?: string }>
}

const CATEGORIES = [
  { value: '',             label: 'Todos'        },
  { value: 'production',   label: 'Produção'     },
  { value: 'intelligence', label: 'Inteligência' },
  { value: 'operations',   label: 'Operações'    },
  { value: 'growth',       label: 'Growth'       },
]

async function getAgents(category?: string): Promise<MarketplaceAgent[]> {
  const supabase = await createClient()
  let query = supabase
    .from('marketplace_agents')
    .select('*')
    .order('install_count', { ascending: false })
  if (category) query = query.eq('category', category)
  const { data } = await query
  return (data ?? []) as unknown as MarketplaceAgent[]
}

async function getInstalledIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('marketplace_installs').select('agent_id')
  return (data ?? []).map(i => i.agent_id)
}

export default async function MarketplacePage({ searchParams }: Props) {
  const { category } = await searchParams
  const [agents, installedIds] = await Promise.all([getAgents(category), getInstalledIds()])
  const activeCategory = category ?? ''

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Bot size={18} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">
            Marketplace de Agentes
          </h1>
        </div>
        <p className="text-sm text-[#71717A] ml-12">
          Expanda as capacidades da sua agência com agentes especializados
        </p>
      </div>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <a
            key={cat.value}
            href={cat.value ? `/marketplace?category=${cat.value}` : '/marketplace'}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeCategory === cat.value
                ? 'bg-amber-500 text-[#09090B] shadow-lg shadow-amber-500/20'
                : 'bg-white/[0.05] text-[#A1A1AA] border border-white/[0.07] hover:bg-white/[0.08] hover:text-[#FAFAFA]'
            }`}
          >
            {cat.label}
          </a>
        ))}
        <span className="ml-auto text-xs text-[#52525B] self-center">
          {agents.length} agente{agents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isInstalled={installedIds.includes(agent.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181B] py-20 text-center">
          <Bot size={32} className="text-[#3F3F46] mb-3" />
          <p className="text-sm text-[#71717A]">Nenhum agente encontrado nesta categoria</p>
        </div>
      )}
    </div>
  )
}
