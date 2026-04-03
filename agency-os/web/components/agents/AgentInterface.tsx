'use client'
import { useState } from 'react'
import { AgentSelector } from './AgentSelector'
import { AgentChat } from './AgentChat'
import type { AgentId } from '@/lib/anthropic/agents'

interface AgentInterfaceProps {
  jobId: string
  clientId: string
}

export function AgentInterface({ jobId, clientId }: AgentInterfaceProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null)

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#18181B] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        {/* Selector panel */}
        <div className="border-b border-white/[0.07] md:border-b-0 md:border-r md:border-white/[0.07] p-4 md:max-h-[480px] md:overflow-y-auto">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA]">
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
              <p className="text-sm text-[#A1A1AA]">Selecione um agente para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
