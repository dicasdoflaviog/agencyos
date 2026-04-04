import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('client_id')

  let query = supabase
    .from('contracts')
    .select('*, client:clients(id, name)')
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

  if (!body.client_id) return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 })
  if (!body.value) return NextResponse.json({ error: 'value é obrigatório' }, { status: 400 })
  if (!body.billing) return NextResponse.json({ error: 'billing é obrigatório' }, { status: 400 })
  if (!body.start_date) return NextResponse.json({ error: 'start_date é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      client_id: body.client_id,
      value: Number(body.value),
      billing: body.billing,
      start_date: body.start_date,
      end_date: body.end_date ?? null,
      status: body.status ?? 'draft',
      notes: body.notes ?? null,
      created_by: user.id,
    })
    .select('*, client:clients(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
