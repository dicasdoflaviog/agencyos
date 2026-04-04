import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('reports')
    .select('*, client:clients(id, name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    client_id: string
    title: string
    period_start: string
    period_end: string
    format: 'pdf' | 'excel'
    sections: string[]
  }

  if (!body.client_id || !body.title || !body.period_start || !body.period_end) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      client_id:    body.client_id,
      title:        body.title,
      period_start: body.period_start,
      period_end:   body.period_end,
      format:       body.format ?? 'pdf',
      sections:     body.sections ?? [],
      status:       'pending',
      generated_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
