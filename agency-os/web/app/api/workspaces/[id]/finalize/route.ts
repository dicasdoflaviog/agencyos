import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  // Validate session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user belongs to this workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Use admin client to bypass RLS for the UPDATE
  const admin = createAdminClient()

  // 1. Mark workspace as completed
  const { error: wsError } = await admin
    .from('workspaces')
    .update({ onboarding_completed: true })
    .eq('id', workspaceId)

  if (wsError) return NextResponse.json({ error: wsError.message }, { status: 500 })

  // 2. Mark profile for fast middleware lookup (avoids join on every request)
  await admin
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  // 3. Set completed_at in onboarding_progress
  await admin
    .from('onboarding_progress')
    .upsert(
      { workspace_id: workspaceId, completed_at: new Date().toISOString() },
      { onConflict: 'workspace_id' }
    )

  return NextResponse.json({ success: true })
}
