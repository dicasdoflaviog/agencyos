import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/agents/oracle/sessions/[id] — load messages for a session
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify session belongs to this user's workspace
  const { data: session } = await supabase
    .from('oracle_sessions')
    .select('id, title, client_id, job_id')
    .eq('id', id)
    .maybeSingle()

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const { data: messages } = await supabase
    .from('agent_conversations')
    .select('id, role, content, agent, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  return Response.json({ session, messages: messages ?? [] })
}

// DELETE /api/agents/oracle/sessions/[id] — delete a session and its messages
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('oracle_sessions').delete().eq('id', id)
  return Response.json({ ok: true })
}
