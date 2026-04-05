'use client'
import { cn } from '@/lib/utils'
import { getAgentsByLayer, type AgentId } from '@/lib/anthropic/agents-config'

interface AgentSelectorProps {
  selectedId: AgentId | null
  onSelect: (id: AgentId) => void
}

export function AgentSelector({ selectedId, onSelect }: AgentSelectorProps) {
  const layers = getAgentsByLayer()

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      {layers.map(({ layer, label, agents }) => (
        <div key={layer}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
            {label}
          </p>
          <div className="flex flex-col gap-1">
            {agents.map((agent) => {
              const isSelected = selectedId === agent.id
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelect(agent.id)}
                  title={agent.name}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all cursor-pointer',
                    isSelected
                      ? 'border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10'
                      : 'border border-transparent hover:bg-white/[0.04]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      isSelected ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]' : 'bg-white/[0.08] text-[var(--color-text-secondary)]'
                    )}
                  >
                    {agent.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('truncate text-xs font-medium leading-tight', isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]')}>
                      {agent.name}
                    </p>
                    <p className="truncate text-[10px] text-[var(--color-text-secondary)]">{agent.role}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
