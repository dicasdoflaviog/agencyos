'use client'
import { useState } from 'react'
import { AgentSelector } from './AgentSelector'
import { AgentChat } from './AgentChat'
import type { AgentId } from '@/lib/anthropic/agents-config'

interface AgentInterfaceProps {
  jobId: string
  clientId: string
}

export function AgentInterface({ jobId, clientId }: AgentInterfaceProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null)

  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        {/* Selector panel */}
        <div className="border-b border-[var(--color-border-subtle)] md:border-b-0 md:border-r md:border-[var(--color-border-subtle)] p-4 md:max-h-[480px] md:overflow-y-auto">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            21 Agentes
          </p>
          <AgentSelector selectedId={selectedAgent} onSelect={setSelectedAgent} />
        </div>

        {/* Chat panel */}
        <div className="p-5">
          {selectedAgent ? (
            <AgentChat
              agentId={selectedAgent}
              jobId={jobId}
              clientId={clientId}
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <p className="text-sm text-[var(--color-text-secondary)]">Selecione um agente para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
