import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', id)
    .order('due_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.amount) return NextResponse.json({ error: 'amount é obrigatório' }, { status: 400 })
  if (!body.due_date) return NextResponse.json({ error: 'due_date é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      contract_id: id,
      amount: Number(body.amount),
      due_date: body.due_date,
      notes: body.notes ?? null,
      status: 'pending',
      paid_at: null,
      pdf_url: null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.invoice_id) return NextResponse.json({ error: 'invoice_id é obrigatório' }, { status: 400 })

  const patch: Record<string, unknown> = {}

  if (body.mark_paid) {
    patch.status = 'paid'
    patch.paid_at = new Date().toISOString()
  } else {
    if (body.status !== undefined) patch.status = body.status
    if (body.paid_at !== undefined) patch.paid_at = body.paid_at
    if (body.amount !== undefined) patch.amount = Number(body.amount)
    if (body.due_date !== undefined) patch.due_date = body.due_date
    if (body.notes !== undefined) patch.notes = body.notes ?? null
    if (body.pdf_url !== undefined) patch.pdf_url = body.pdf_url ?? null
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', body.invoice_id)
    .eq('contract_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
