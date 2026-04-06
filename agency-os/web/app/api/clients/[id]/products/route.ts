import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('client_products')
    .select('*')
    .eq('client_id', id)
    .order('funnel_stage', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) return NextResponse.json({ error: 'Workspace not found' }, { status: 400 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('client_products')
    .insert({
      client_id:      id,
      workspace_id:   profile.workspace_id,
      name:           body.name,
      category:       body.category ?? 'produto',
      type:           body.type ?? 'paid',
      promise:        body.promise ?? null,
      description:    body.description ?? null,
      target_audience: body.target_audience ?? null,
      price_cents:    body.price_cents ?? null,
      price_label:    body.price_label ?? null,
      checkout_url:   body.checkout_url ?? null,
      funnel_stage:   body.funnel_stage ?? 'tofu',
      next_product_id: body.next_product_id ?? null,
      status:         body.status ?? 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
