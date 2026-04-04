import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

async function validateApiKey(req: NextRequest): Promise<string | null> {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!key) return null
  const keyHash = crypto.createHash('sha256').update(key).digest('hex')
  const supabase = createAdminClient()
  const { data } = await supabase.from('api_keys').select('workspace_id').eq('key_hash', keyHash).single()
  return data?.workspace_id ?? null
}

export async function GET(req: NextRequest) {
  const workspaceId = await validateApiKey(req)
  if (!workspaceId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const supabase = createAdminClient()
  const { data, count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}
