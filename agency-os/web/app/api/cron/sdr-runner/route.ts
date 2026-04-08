import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runOracleDraft } from '@/lib/sdr/steps/draft'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: pipelines } = await supabase
    .from('sdr_pipelines')
    .select('*')
    .eq('status', 'running')
    .lte('next_action_at', new Date().toISOString())
    .order('next_action_at', { ascending: true })
    .limit(50)

  const results: Array<{ pipeline_id: string; step?: number; processed?: boolean; error?: string }> = []

  for (const pipeline of pipelines ?? []) {
    try {
      const step = pipeline.current_step as number

      // Steps 2, 3, 4 — verificar se a mensagem do step foi enviada e agir
      if (step >= 2 && step <= 4) {
        const { data: lastAction } = await supabase
          .from('sdr_actions')
          .select('status, output, created_at')
          .eq('pipeline_id', pipeline.id)
          .eq('step', step)
          .maybeSingle()

        if (lastAction?.status === 'sent') {
          // Verificar se houve resposta do lead após o envio
          const { data: replies } = await supabase
            .from('lead_activities')
            .select('id, notes')
            .eq('lead_id', pipeline.lead_id)
            .eq('type', 'whatsapp')
            .eq('direction', 'inbound')
            .gte('created_at', lastAction.created_at as string)
            .limit(1)

          if (replies?.length) {
            await detectInterest(
              pipeline.id,
              pipeline.lead_id,
              pipeline.workspace_id,
              pipeline.user_id,
              replies[0]?.notes as string | null,
              supabase,
            )
          } else {
            // Sem resposta — gerar follow-up se ainda não esgotou
            const followupNum = step - 1 // step 2 → followup 1, step 3 → followup 2
            if (followupNum <= 2) {
              await runOracleDraft(pipeline.lead_id, pipeline.id, pipeline.workspace_id, pipeline.user_id, followupNum)
              const nextAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
              await supabase.from('sdr_pipelines').update({
                current_step: step + 1,
                next_action_at: nextAt.toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', pipeline.id)
            } else {
              await supabase.from('sdr_pipelines')
                .update({ status: 'dead', updated_at: new Date().toISOString() })
                .eq('id', pipeline.id)
              await supabase.from('leads')
                .update({ stage: 'lost', lost_reason: 'SDR: sem resposta após 3 contatos' })
                .eq('id', pipeline.lead_id)
            }
          }
        }
      }

      results.push({ pipeline_id: pipeline.id as string, step, processed: true })
    } catch (err) {
      results.push({ pipeline_id: pipeline.id as string, error: String(err) })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function detectInterest(
  pipelineId: string,
  leadId: string,
  workspaceId: string,
  userId: string | null,
  replyText: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
) {
  if (!replyText) return

  const result = await routeChat('oracle', [{
    role: 'user',
    content: `Avalie o nível de interesse desta resposta de um prospect.
Retorne APENAS JSON (sem markdown): {"interest_score": 0, "assessment": "descrição curta"}

RESPOSTA DO PROSPECT: "${replyText}"`,
  }], { maxTokens: 150 })

  let data: { interest_score?: number; assessment?: string } = { interest_score: 5 }
  try { data = JSON.parse(result.content.replace(/```json|```/g, '').trim()) } catch {}

  const interestScore = Math.max(0, Math.min(10, Number(data.interest_score ?? 5)))

  await supabase.from('leads').update({ interest_score: interestScore }).eq('id', leadId)

  if (interestScore >= 6) {
    await supabase.from('sdr_pipelines').update({
      status: 'waiting_human',
      interest_detected: true,
      interest_detected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', pipelineId)

    await supabase.from('leads')
      .update({ stage: 'contacted', sdr_temperature: 'hot' })
      .eq('id', leadId)

    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'sdr_interest',
        title: '🔥 Lead com interesse detectado!',
        body: `Score ${interestScore}/10 — "${replyText.slice(0, 80)}..."`,
        link: '/crm/sdr',
        metadata: { lead_id: leadId, interest_score: interestScore },
      }).catch(() => {})
    }
  }

  void workspaceId // available if needed for workspace-level notifications
}
