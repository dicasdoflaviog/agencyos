import Link from 'next/link'
import { Star, Download } from 'lucide-react'
import { MarketplaceAgent } from '@/types/database'
import { InstallButton } from './InstallButton'

interface Props {
  agent: MarketplaceAgent
  isInstalled: boolean
}

const categoryLabels: Record<string, string> = {
  production: 'Produção',
  intelligence: 'Inteligência',
  operations: 'Operações',
  growth: 'Growth',
}

export function AgentCard({ agent, isInstalled }: Props) {
  const priceLabel =
    agent.price_type === 'free'
      ? 'Grátis'
      : agent.price_type === 'subscription'
      ? `R$ ${agent.price_brl?.toFixed(2).replace('.', ',')}/mês`
      : `R$ ${agent.price_brl?.toFixed(2).replace('.', ',')}`

  return (
    <div className="flex flex-col rounded-lg border border-white/[0.07] bg-[#18181B] p-5 transition-colors hover:border-white/[0.12]">
      <div className="mb-3 flex items-start justify-between">
        <span className="inline-block rounded bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
          {categoryLabels[agent.category] ?? agent.category}
        </span>
        <span className="text-sm font-semibold text-[#FAFAFA]">{priceLabel}</span>
      </div>

      <Link href={`/marketplace/${agent.slug}`} className="mb-2 text-base font-bold text-[#FAFAFA] transition-colors hover:text-[#F59E0B]">
        {agent.name}
      </Link>

      <p className="mb-4 flex-1 line-clamp-2 text-sm text-[#A1A1AA]">
        {agent.description}
      </p>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Star size={12} className="fill-[#F59E0B] text-[#F59E0B]" />
          <span className="text-xs text-[#A1A1AA]">{agent.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Download size={12} className="text-[#71717A]" />
          <span className="text-xs text-[#71717A]">{agent.install_count.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <InstallButton agent={agent} isInstalled={isInstalled} />
    </div>
  )
}
