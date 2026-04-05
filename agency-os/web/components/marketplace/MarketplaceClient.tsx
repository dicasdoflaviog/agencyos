'use client'

import { useState } from 'react'
import { Users, ChevronRight } from 'lucide-react'
import { AgentProfileModal } from './AgentProfileModal'
import type { AgentProfile, Squad } from '@/lib/team-data'

interface AgentCardProps {
  agent: AgentProfile
  squad: Squad
  onClick: () => void
}

function AgentCard({ agent, squad, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 p-5 flex flex-col gap-4"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-2xl border ${squad.colorBorder} ${squad.colorBg} flex-shrink-0`}>
          {agent.emoji}
        </div>
        <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1" />
      </div>

      {/* Name + role */}
      <div>
        <p className="font-bold text-white text-base leading-tight">@{agent.name}</p>
        <p className={`text-xs mt-0.5 font-medium ${squad.colorText}`}>{agent.role}</p>
      </div>

      {/* Bio preview */}
      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{agent.bio}</p>

      {/* Specialty tags */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {agent.specialties.slice(0, 3).map(s => (
          <span key={s} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${squad.colorBorder} ${squad.colorBg} ${squad.colorText}`}>
            {s}
          </span>
        ))}
        {agent.specialties.length > 3 && (
          <span className="text-[10px] text-zinc-600 px-2 py-0.5">+{agent.specialties.length - 3}</span>
        )}
      </div>
    </button>
  )
}

interface SquadSectionProps {
  squad: Squad
  onSelect: (agent: AgentProfile, squad: Squad) => void
}

function SquadSection({ squad, onSelect }: SquadSectionProps) {
  return (
    <section>
      {/* Squad header */}
      <div className="flex items-start gap-4 mb-5">
        <div className={`mt-1 w-1 h-12 rounded-full flex-shrink-0`}
          style={{ background: squad.color === 'amber' ? '#f59e0b' : squad.color === 'violet' ? '#8b5cf6' : squad.color === 'cyan' ? '#06b6d4' : squad.color === 'emerald' ? '#10b981' : '#f43f5e' }}
        />
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-white">{squad.name}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${squad.colorBorder} ${squad.colorBg} ${squad.colorText}`}>
              {squad.agents.length} agentes
            </span>
          </div>
          <p className="text-sm text-zinc-500">{squad.tagline}</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {squad.agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            squad={squad}
            onClick={() => onSelect(agent, squad)}
          />
        ))}
      </div>
    </section>
  )
}

interface Props {
  squads: Squad[]
}

export function MarketplaceClient({ squads }: Props) {
  const [selected, setSelected] = useState<{ agent: AgentProfile; squad: Squad } | null>(null)

  const totalAgents = squads.reduce((sum, s) => sum + s.agents.length, 0)

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users size={22} className="text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Conheça seu Time</h1>
          <span className="text-sm font-semibold text-zinc-500 bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 rounded-full">
            {totalAgents} agentes
          </span>
        </div>
        <p className="text-sm text-zinc-500 max-w-xl">
          Cada agente é um especialista de alto nível, treinado para uma função específica. Clique em qualquer um para ver o perfil completo e acioná-lo.
        </p>
      </div>

      {/* Squads */}
      <div className="space-y-12">
        {squads.map(squad => (
          <SquadSection
            key={squad.id}
            squad={squad}
            onSelect={(agent, sq) => setSelected({ agent, squad: sq })}
          />
        ))}
      </div>

      {/* Profile modal */}
      <AgentProfileModal
        agent={selected?.agent ?? null}
        squad={selected?.squad ?? null}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
