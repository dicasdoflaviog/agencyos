import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if already has workspace
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.workspace_id) {
    return NextResponse.json({ workspace_id: existing.workspace_id, created: false })
  }

  // Create workspace
  const name = user.email?.split('@')[0] ?? 'Minha Agência'
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36)

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select('id')
    .single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: wsError?.message ?? 'Failed to create workspace' }, { status: 500 })
  }

  // Add user as admin member
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'admin' })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Update profile with workspace_id and role
  await supabase
    .from('profiles')
    .update({ workspace_id: workspace.id, role: 'admin' })
    .eq('id', user.id)

  return NextResponse.json({ workspace_id: workspace.id, created: true })
}
