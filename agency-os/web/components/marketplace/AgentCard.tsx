import Link from 'next/link'
import { Star, Users } from 'lucide-react'
import { MarketplaceAgent } from '@/types/database'

interface Props {
  agent: MarketplaceAgent
  isInstalled: boolean
}

const CATEGORY_STYLES: Record<string, { badge: string; avatar: string }> = {
  intelligence : { badge: 'bg-violet-500/10 text-violet-400', avatar: '#6366F1' },
  production   : { badge: 'bg-amber-500/10  text-amber-400',  avatar: '#F59E0B' },
  operations   : { badge: 'bg-cyan-500/10   text-cyan-400',   avatar: '#06B6D4' },
  growth       : { badge: 'bg-purple-500/10 text-purple-400', avatar: '#A855F7' },
}

const CATEGORY_LABELS: Record<string, string> = {
  production  : 'Produção',
  intelligence: 'Inteligência',
  operations  : 'Operações',
  growth      : 'Growth',
}

function priceLabel(agent: MarketplaceAgent) {
  if (agent.price_type === 'free') return 'Grátis'
  const v = agent.price_brl?.toFixed(2).replace('.', ',') ?? '–'
  return agent.price_type === 'subscription' ? `R$ ${v}/mês` : `R$ ${v}`
}

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export function AgentCard({ agent, isInstalled }: Props) {
  const style = CATEGORY_STYLES[agent.category] ?? CATEGORY_STYLES.production

  return (
    <Link
      href={`/marketplace/${agent.slug}`}
      className="group flex gap-4 rounded-xl border border-white/[0.07] bg-[#18181B] p-5
                 transition-all duration-200 hover:border-amber-500/25 hover:bg-[#1C1C1F]"
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center
                   text-[13px] font-bold text-white/90 shadow-lg"
        style={{ backgroundColor: style.avatar }}
      >
        {initials(agent.name)}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Row 1: name + badge + price */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#FAFAFA] group-hover:text-amber-400 transition-colors text-sm leading-tight">
              {agent.name}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
              {CATEGORY_LABELS[agent.category] ?? agent.category}
            </span>
            {isInstalled && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400">
                Instalado
              </span>
            )}
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-[#FAFAFA]">
            {priceLabel(agent)}
          </span>
        </div>

        {/* Handle */}
        <p className="font-mono text-[11px] text-[#52525B] mb-2">@{agent.slug}</p>

        {/* Description */}
        <p className="text-xs text-[#A1A1AA] line-clamp-2 mb-3 leading-relaxed">
          {agent.description ?? 'Sem descrição disponível.'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="font-mono text-[11px] text-[#A1A1AA]">{agent.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={11} className="text-[#71717A]" />
            <span className="font-mono text-[11px] text-[#71717A]">{formatCount(agent.install_count)} instalações</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
