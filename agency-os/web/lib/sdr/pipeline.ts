import { createAdminClient } from '@/lib/supabase/admin'
import { runHarborQualify } from './steps/qualify'
import { runIrisEnrich } from './steps/enrich'
import { runOracleDraft } from './steps/draft'

export async function startSDRPipeline(
  leadId: string,
  pipelineId: string,
  workspaceId: string,
  userId: string | null,
) {
  const supabase = createAdminClient()

  try {
    // STEP 0 — HARBOR qualifica
    await setStep(supabase, pipelineId, 0)
    const score = await runHarborQualify(leadId, pipelineId)

    // Score muito baixo → encerrar pipeline
    if (score < 3) {
      await supabase.from('sdr_pipelines')
        .update({ status: 'dead', updated_at: new Date().toISOString() })
        .eq('id', pipelineId)
      await supabase.from('leads')
        .update({ stage: 'lost', lost_reason: `HARBOR score baixo: ${score}/10` })
        .eq('id', leadId)
      return
    }

    // STEP 1 — IRIS enriquece
    await setStep(supabase, pipelineId, 1)
    await runIrisEnrich(leadId, pipelineId)

    // STEP 2 — ORACLE gera mensagem de primeiro contato (fica pendente de aprovação)
    await setStep(supabase, pipelineId, 2)
    await runOracleDraft(leadId, pipelineId, workspaceId, userId, 0)

    // Aguarda aprovação humana. Cron retoma em D+2 se sem resposta.
    const followupAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await supabase.from('sdr_pipelines').update({
      current_step: 2,
      next_action_at: followupAt.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', pipelineId)

  } catch (error) {
    console.error('[sdr/pipeline]', error)
    await supabase.from('sdr_pipelines')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', pipelineId)
  }
}

async function setStep(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  pipelineId: string,
  step: number,
) {
  await supabase.from('sdr_pipelines')
    .update({ current_step: step, updated_at: new Date().toISOString() })
    .eq('id', pipelineId)
}
