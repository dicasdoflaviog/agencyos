import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/api/validate-api-key'

export async function GET(req: NextRequest) {
  const workspaceId = await validateApiKey(req)
  if (!workspaceId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const supabase = createAdminClient()
  const { data, count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const workspaceId = await validateApiKey(req)
  if (!workspaceId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const body = await req.json() as {
    client_id: string
    title: string
    description?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }

  if (!body.client_id || !body.title) {
    return NextResponse.json({ error: 'Missing required fields: client_id, title' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      client_id: body.client_id,
      title: body.title,
      description: body.description ?? null,
      priority: body.priority ?? 'normal',
      status: 'backlog',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
