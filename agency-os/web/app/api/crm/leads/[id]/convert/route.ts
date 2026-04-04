import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single()
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const slug = (lead.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: lead.name as string,
      slug,
      niche: null,
      status: 'active',
      contract_status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })

  await supabase
    .from('leads')
    .update({ stage: 'won', converted_client_id: client.id })
    .eq('id', id)

  await supabase.from('lead_activities').insert({
    lead_id: id,
    type: 'stage_change',
    title: 'Lead convertido em cliente',
    performed_by: user.id,
    metadata: { client_id: client.id },
  })

  return NextResponse.json({ client_id: client.id }, { status: 201 })
}
