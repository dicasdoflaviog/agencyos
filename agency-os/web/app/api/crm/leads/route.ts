import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LeadStage } from '@/types/database'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const stage = searchParams.get('stage') as LeadStage | null
  const assignedTo = searchParams.get('assigned_to')
  const search = searchParams.get('search')

  let query = supabase
    .from('leads')
    .select('*, assigned_profile:profiles(id, name, avatar_url)')
    .order('created_at', { ascending: false })

  if (stage) query = query.eq('stage', stage)
  if (assignedTo) query = query.eq('assigned_to', assignedTo)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name: string
    company?: string
    email?: string
    phone?: string
    stage?: LeadStage
    deal_value?: number
    source?: string
    assigned_to?: string
    expected_close?: string
    notes?: string
  }

  if (!body.name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({ ...body, created_by: user.id, stage: body.stage ?? 'prospect' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.notes) {
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      type: 'note',
      title: 'Nota inicial',
      body: body.notes,
      performed_by: user.id,
    })
  }

  return NextResponse.json(lead, { status: 201 })
}
