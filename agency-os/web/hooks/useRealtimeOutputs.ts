'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { JobOutput } from '@/types/database'

// NOTE: To enable Realtime, go to Supabase Dashboard → Database → Replication
// and add the 'job_outputs' table to the realtime publication.

export function useRealtimeOutputs(jobId: string, initialOutputs: JobOutput[]): JobOutput[] {
  const [outputs, setOutputs] = useState<JobOutput[]>(initialOutputs)
  const supabase = createClient()

  useEffect(() => {
    setOutputs(initialOutputs)
  }, [initialOutputs])

  useEffect(() => {
    const channel = supabase
      .channel(`outputs-${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_outputs', filter: `job_id=eq.${jobId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOutputs(prev => [payload.new as JobOutput, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setOutputs(prev => prev.map(o => o.id === (payload.new as JobOutput).id ? { ...o, ...payload.new as JobOutput } : o))
          } else if (payload.eventType === 'DELETE') {
            setOutputs(prev => prev.filter(o => o.id !== (payload.old as Partial<JobOutput>).id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, jobId])

  return outputs
}
