import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member?.workspace_id) return NextResponse.json({ steps_done: [], completed_at: null })

  const { data } = await supabase
    .from('onboarding_progress')
    .select('steps_done, completed_at')
    .eq('workspace_id', member.workspace_id)
    .maybeSingle()

  return NextResponse.json({
    steps_done: data?.steps_done ?? [],
    completed_at: data?.completed_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { workspace_id: string; steps_done: string[]; completed: boolean }
  const { workspace_id, steps_done, completed } = body

  const { error } = await supabase.from('onboarding_progress').upsert({
    workspace_id,
    steps_done,
    completed_at: completed ? new Date().toISOString() : null,
  }, { onConflict: 'workspace_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
