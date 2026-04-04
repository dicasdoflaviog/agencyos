import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('client_id')

  let query = supabase
    .from('posts')
    .select('id, client_id, title, slug, content, cover_url, published_at, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
