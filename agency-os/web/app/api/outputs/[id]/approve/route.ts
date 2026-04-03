import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApprovalStage } from '@/types/database'

const VALID_STAGES: ApprovalStage[] = [
  'draft', 'internal_review', 'client_review', 'approved', 'published', 'rejected',
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: outputId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { to_stage: ApprovalStage; notes?: string }
  const { to_stage, notes } = body

  if (!to_stage || !VALID_STAGES.includes(to_stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  // Buscar output atual
  const { data: output, error: fetchError } = await supabase
    .from('job_outputs')
    .select('id, approval_stage')
    .eq('id', outputId)
    .single()

  if (fetchError || !output) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 })
  }

  // Atualizar estágio do output
  const { error: updateError } = await supabase
    .from('job_outputs')
    .update({ approval_stage: to_stage })
    .eq('id', outputId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Registrar evento de aprovação
  const { error: eventError } = await supabase
    .from('output_approval_events')
    .insert({
      output_id: outputId,
      from_stage: output.approval_stage,
      to_stage,
      changed_by: user.id,
      notes: notes ?? null,
    })

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 })
  }

  // Criar notificação se for stage_changed relevante
  if (['approved', 'rejected', 'revision_requested'].includes(to_stage)) {
    const titleMap: Partial<Record<ApprovalStage, string>> = {
      approved: 'Output aprovado',
      rejected: 'Output rejeitado',
    }
    if (titleMap[to_stage]) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'stage_changed',
        title: titleMap[to_stage],
        body: notes ?? null,
        link: `/jobs`,
        metadata: { output_id: outputId, stage: to_stage },
      })
    }
  }

  return NextResponse.json({ success: true, new_stage: to_stage })
}
