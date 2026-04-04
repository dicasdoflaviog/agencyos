import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { agent_id: string }
  const { agent_id } = body
  if (!agent_id) return NextResponse.json({ error: 'Missing agent_id' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'collaborator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member?.workspace_id) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
  }

  const { error } = await supabase.from('marketplace_installs').upsert({
    agent_id,
    workspace_id: member.workspace_id,
    installed_by: user.id,
  }, { onConflict: 'agent_id,workspace_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment install_count (best effort)
  const { data: current } = await supabase.from('marketplace_agents').select('install_count').eq('id', agent_id).single()
  if (current) {
    await supabase.from('marketplace_agents').update({ install_count: current.install_count + 1 }).eq('id', agent_id)
  }

  return NextResponse.json({ success: true })
}
