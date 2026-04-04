import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { job_id } = await params
  const { data } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('job_id', job_id)
    .order('created_at', { ascending: true })

  return Response.json(data ?? [])
}
