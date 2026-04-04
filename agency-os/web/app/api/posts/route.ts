import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('client_id')

  let query = supabase
    .from('posts')
    .select('*, author:profiles(id, name, avatar_url)')
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, slug, content, cover_url, status, client_id } = body

  if (!title || !client_id) {
    return NextResponse.json({ error: 'title and client_id required' }, { status: 400 })
  }

  const finalSlug = slug || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const insertData: Record<string, unknown> = {
    title,
    slug: finalSlug,
    content: content ?? null,
    cover_url: cover_url ?? null,
    status: status ?? 'draft',
    client_id,
    author_id: user.id,
  }

  if (status === 'published') insertData.published_at = new Date().toISOString()

  const { data, error } = await supabase.from('posts').insert(insertData).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
