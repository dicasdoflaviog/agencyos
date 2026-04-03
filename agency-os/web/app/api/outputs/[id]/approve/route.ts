import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApprovalStage } from '@/types/database'

// Mapa de transições permitidas conforme SPEC-fase2 §5.3
const NEXT_STAGES: Record<ApprovalStage, ApprovalStage[]> = {
  draft:           ['internal_review', 'rejected'],
  internal_review: ['client_review', 'approved', 'rejected'],
  client_review:   ['approved', 'rejected'],
  approved:        ['published'],
  rejected:        ['draft'],
  published:       [],
}

// Notificações disparadas por transição
const NOTIFICATION_TITLE: Partial<Record<ApprovalStage, string>> = {
  approved:        'Output aprovado',
  rejected:        'Output rejeitado',
  // volta para draft a partir de rejected = revisão solicitada
  draft:           'Revisão solicitada',
  client_review:   'Output enviado para aprovação do cliente',
}

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

  if (!to_stage || !(to_stage in NEXT_STAGES)) {
    return NextResponse.json({ error: 'Estágio inválido' }, { status: 400 })
  }

  // Buscar output atual
  const { data: output, error: fetchError } = await supabase
    .from('job_outputs')
    .select('id, approval_stage, job_id')
    .eq('id', outputId)
    .single()

  if (fetchError || !output) {
    return NextResponse.json({ error: 'Output não encontrado' }, { status: 404 })
  }

  const currentStage = (output.approval_stage ?? 'draft') as ApprovalStage

  // Validar se a transição é permitida
  if (!NEXT_STAGES[currentStage].includes(to_stage)) {
    return NextResponse.json(
      {
        error: `Transição inválida: ${currentStage} → ${to_stage}`,
        allowed: NEXT_STAGES[currentStage],
      },
      { status: 400 }
    )
  }

  // Atualizar estágio do output
  const { error: updateError } = await supabase
    .from('job_outputs')
    .update({ approval_stage: to_stage })
    .eq('id', outputId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Registrar evento no histórico de aprovação
  const { error: eventError } = await supabase
    .from('output_approval_events')
    .insert({
      output_id: outputId,
      from_stage: currentStage,
      to_stage,
      changed_by: user.id,
      notes: notes ?? null,
    })

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 })
  }

  // Disparar notificação quando a transição for relevante
  // "draft" só notifica quando vem de "rejected" (= revisão solicitada)
  const shouldNotify = to_stage !== 'draft' || currentStage === 'rejected'
  const notifTitle = NOTIFICATION_TITLE[to_stage]

  if (notifTitle && shouldNotify) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'stage_changed',
      title: notifTitle,
      body: notes ?? null,
      link: `/jobs/${output.job_id}`,
      metadata: {
        output_id: outputId,
        from_stage: currentStage,
        to_stage,
      },
    })
  }

  return NextResponse.json({ success: true, from_stage: currentStage, new_stage: to_stage })
}
