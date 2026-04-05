import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 400 })
  }

  const body = await req.json() as { name: string; email?: string; industry?: string }
  const { name, email, industry } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      industry: industry?.trim() || null,
      workspace_id: profile.workspace_id,
      status: 'active',
    })
    .select('id, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
