import { createClient } from '@/lib/supabase/server'
import { AgentCard } from '@/components/marketplace/AgentCard'
import { MarketplaceAgent } from '@/types/database'

interface Props {
  searchParams: Promise<{ category?: string }>
}

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'production', label: 'Produção' },
  { value: 'intelligence', label: 'Inteligência' },
  { value: 'operations', label: 'Operações' },
  { value: 'growth', label: 'Growth' },
]

async function getAgents(category?: string): Promise<MarketplaceAgent[]> {
  const supabase = await createClient()
  let query = supabase.from('marketplace_agents').select('*').order('install_count', { ascending: false })
  if (category) query = query.eq('category', category)
  const { data } = await query
  return (data ?? []) as MarketplaceAgent[]
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Marketplace de Agentes</h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">Expanda as capacidades da sua agência</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <a
            key={cat.value}
            href={cat.value ? `/marketplace?category=${cat.value}` : '/marketplace'}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              (category ?? '') === cat.value
                ? 'bg-[#F59E0B] text-[#0A0A0A]'
                : 'bg-white/[0.05] text-[#A1A1AA] hover:bg-white/[0.1] hover:text-[#FAFAFA]'
            }`}
          >
            {cat.label}
          </a>
        ))}
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} isInstalled={installedIds.includes(agent.id)} />
        ))}
      </div>

      {agents.length === 0 && (
        <div className="py-16 text-center text-sm text-[#71717A]">Nenhum agente encontrado</div>
      )}
    </div>
  )
}
