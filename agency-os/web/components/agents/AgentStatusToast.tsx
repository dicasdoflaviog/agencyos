'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bot, Loader2 } from 'lucide-react'

interface AgentStatus {
  agent: string
  action: string
  user_id: string
}

export function AgentStatusToast({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!workspaceId) return

    const channel = supabase.channel(`workspace:${workspaceId}:agent-status`)
      .on('broadcast', { event: 'agent-working' }, ({ payload }) => {
        setStatus(payload as AgentStatus)
        setTimeout(() => setStatus(null), 5000)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workspaceId, supabase])

  if (!status) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="flex items-center gap-2.5 bg-[var(--color-bg-surface)] border border-[var(--color-accent)]/20 rounded-full px-4 py-2.5 shadow-2xl shadow-black/50">
        <Loader2 size={14} className="text-[var(--color-accent)] animate-spin" />
        <Bot size={14} className="text-[var(--color-text-secondary)]" />
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          <span className="text-[var(--color-accent)]">{status.agent}</span> {status.action}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
      </div>
    </div>
  )
}
