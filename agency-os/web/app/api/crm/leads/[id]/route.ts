import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LeadStage } from '@/types/database'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Partial<{
    name: string
    company: string
    email: string
    phone: string
    stage: LeadStage
    deal_value: number
    source: string
    assigned_to: string
    expected_close: string
    notes: string
    lost_reason: string
  }>

  const { data: current } = await supabase.from('leads').select('stage').eq('id', id).single()

  const { data: lead, error } = await supabase
    .from('leads')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.stage && current && body.stage !== current.stage) {
    const STAGE_LABELS: Record<LeadStage, string> = {
      prospect: 'Prospecto',
      contacted: 'Contatado',
      proposal_sent: 'Proposta enviada',
      negotiation: 'Negociação',
      won: 'Ganho',
      lost: 'Perdido',
    }
    await supabase.from('lead_activities').insert({
      lead_id: id,
      type: 'stage_change',
      title: `Stage alterado: ${STAGE_LABELS[current.stage as LeadStage]} → ${STAGE_LABELS[body.stage]}`,
      performed_by: user.id,
      metadata: { from_stage: current.stage, to_stage: body.stage },
    })
  }

  return NextResponse.json(lead)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
