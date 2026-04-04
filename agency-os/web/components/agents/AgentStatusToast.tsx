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
      <div className="flex items-center gap-2.5 bg-[#18181B] border border-[#F59E0B]/20 rounded-full px-4 py-2.5 shadow-2xl shadow-black/50">
        <Loader2 size={14} className="text-[#F59E0B] animate-spin" />
        <Bot size={14} className="text-[#A1A1AA]" />
        <span className="text-xs font-medium text-[#FAFAFA]">
          <span className="text-[#F59E0B]">{status.agent}</span> {status.action}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
      </div>
    </div>
  )
}
