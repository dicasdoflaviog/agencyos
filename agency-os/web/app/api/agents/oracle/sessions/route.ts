import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/agents/oracle/sessions — create a new chat session
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id, job_id } = await req.json().catch(() => ({}))

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('oracle_sessions')
    .insert({
      workspace_id: profile?.workspace_id ?? null,
      client_id: client_id ?? null,
      job_id: job_id ?? null,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}

// GET /api/agents/oracle/sessions?client_id=X — list recent sessions
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const client_id = searchParams.get('client_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .maybeSingle()

  let query = supabase
    .from('oracle_sessions')
    .select('id, title, client_id, job_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (client_id) {
    query = query.eq('client_id', client_id)
  } else if (profile?.workspace_id) {
    query = query.eq('workspace_id', profile.workspace_id)
  }

  const { data } = await query
  return Response.json({ sessions: data ?? [] })
}
