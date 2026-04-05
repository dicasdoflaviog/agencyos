import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InstallButton } from '@/components/marketplace/InstallButton'
import { Star, Download } from 'lucide-react'
import { MarketplaceAgent } from '@/types/database'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

const categoryLabels: Record<string, string> = {
  production: 'Produção',
  intelligence: 'Inteligência',
  operations: 'Operações',
  growth: 'Growth',
}

export default async function AgentDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('marketplace_agents')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!agent) notFound()

  const typedAgent = agent as MarketplaceAgent

  const { data: installRow } = await supabase
    .from('marketplace_installs')
    .select('id')
    .eq('agent_id', typedAgent.id)
    .maybeSingle()

  const isInstalled = !!installRow

  const priceLabel =
    typedAgent.price_type === 'free'
      ? 'Grátis'
      : typedAgent.price_type === 'subscription'
      ? `R$ ${typedAgent.price_brl?.toFixed(2).replace('.', ',')}/mês`
      : `R$ ${typedAgent.price_brl?.toFixed(2).replace('.', ',')}`

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/marketplace" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA]">← Marketplace</Link>
      </div>

      <div className="rounded-lg border border-white/[0.07] bg-[#18181B] p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
              {categoryLabels[typedAgent.category] ?? typedAgent.category}
            </span>
            <h1 className="text-2xl font-bold font-display text-[#FAFAFA]">{typedAgent.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold font-display text-[#FAFAFA]">{priceLabel}</p>
            <p className="mt-1 text-xs text-[#71717A]">
              {typedAgent.price_type === 'subscription' ? 'Por mês' : typedAgent.price_type === 'one_time' ? 'Pagamento único' : ''}
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-[#A1A1AA]">
          {typedAgent.description ?? 'Sem descrição disponível.'}
        </p>

        <div className="mb-8 flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="fill-[#F59E0B] text-[#F59E0B]" />
            <span className="text-sm font-medium text-[#FAFAFA]">{typedAgent.rating.toFixed(1)}</span>
            <span className="text-xs text-[#71717A]">avaliação</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download size={14} className="text-[#A1A1AA]" />
            <span className="text-sm font-medium text-[#FAFAFA]">{typedAgent.install_count.toLocaleString('pt-BR')}</span>
            <span className="text-xs text-[#71717A]">instalações</span>
          </div>
        </div>

        <InstallButton agent={typedAgent} isInstalled={isInstalled} />
      </div>
    </div>
  )
}
