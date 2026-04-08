import { createAdminClient } from '@/lib/supabase/admin'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export async function runHarborQualify(
  leadId: string,
  pipelineId: string,
): Promise<number> {
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('name, company, niche, notes, phone, source_id')
    .eq('id', leadId)
    .single()

  const { data: action } = await supabase.from('sdr_actions').insert({
    pipeline_id: pipelineId,
    lead_id: leadId,
    step: 0,
    agent: 'harbor',
    action_type: 'qualify',
    status: 'pending',
    input: { lead },
  }).select().single()

  const prompt = `Você é HARBOR, especialista em qualificação de leads para agência de marketing digital.

Analise este prospect e retorne APENAS JSON válido (sem markdown):
{
  "score": 0,
  "temperature": "cold",
  "diagnosis": "diagnóstico em 1 frase",
  "recommended_channel": "whatsapp",
  "reasoning": "motivo do score"
}

PROSPECT:
- Nome: ${lead?.name ?? 'N/D'}
- Empresa: ${lead?.company ?? 'Não informado'}
- Nicho: ${lead?.niche ?? 'Não informado'}
- O que disse / Como chegou: ${lead?.notes ?? 'Sem informação'}
- Tem WhatsApp: ${lead?.phone ? 'Sim' : 'Não'}

Critérios:
Score 0-3 → lead frio, pouco fit com serviços de marketing digital
Score 4-6 → lead morno, potencial médio
Score 7-10 → lead quente, alta prioridade para contato imediato`

  const result = await routeChat('harbor', [{ role: 'user', content: prompt }], { maxTokens: 300 })

  let data: Record<string, unknown> = { score: 5, temperature: 'warm', diagnosis: '', recommended_channel: 'whatsapp' }
  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    data = JSON.parse(clean)
  } catch { /* usa default */ }

  const score = Math.max(0, Math.min(10, Number(data.score ?? 5)))
  const temperature = String(data.temperature ?? 'warm') as 'hot' | 'warm' | 'cold'

  // Salvar score no crm_scores
  await supabase.from('crm_scores').upsert({
    lead_id: leadId,
    score,
    justification: String(data.diagnosis ?? ''),
    scored_by: 'harbor',
  }, { onConflict: 'lead_id' })

  // Atualizar lead com temperatura SDR
  await supabase.from('leads').update({ sdr_temperature: temperature }).eq('id', leadId)

  await supabase.from('sdr_actions').update({
    status: 'sent',
    output: data,
  }).eq('id', action?.id)

  return score
}
