'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/types/database'

// NOTE: To enable Realtime, go to Supabase Dashboard → Database → Replication
// and add the 'jobs' table to the realtime publication.

export function useRealtimeJobs(initialJobs: Job[]): Job[] {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const supabase = createClient()

  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as Job, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(j => j.id === (payload.new as Job).id ? { ...j, ...payload.new as Job } : j))
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(j => j.id !== (payload.old as Partial<Job>).id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return jobs
}
