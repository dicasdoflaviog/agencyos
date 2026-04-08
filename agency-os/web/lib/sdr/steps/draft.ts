import { createAdminClient } from '@/lib/supabase/admin'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export async function runOracleDraft(
  leadId: string,
  pipelineId: string,
  workspaceId: string,
  userId: string | null,
  followupNumber: number, // 0 = primeiro contato, 1 = follow-up D+2, 2 = follow-up D+5
) {
  const supabase = createAdminClient()

  const [leadRes, scoreRes, enrichRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', leadId).single(),
    supabase.from('crm_scores').select('*').eq('lead_id', leadId).single(),
    supabase.from('lead_enrichments').select('*').eq('lead_id', leadId).maybeSingle(),
  ])

  const lead = leadRes.data
  const score = scoreRes.data
  const enrich = enrichRes.data

  const followupContexts = [
    'PRIMEIRO CONTATO — apresente relevância ao negócio dele e faça 1 pergunta aberta. Sem pitch de vendas.',
    'FOLLOW-UP 1 (D+2) — ângulo diferente. Mencione um resultado concreto de um cliente similar. Chame para conversa rápida.',
    'FOLLOW-UP 2 (D+5) — seja direto e breve. Uma pergunta simples: "faz sentido trocar uma ideia?"',
  ]
  const followupContext = followupContexts[followupNumber] ?? followupContexts[0]

  const painPoints = Array.isArray(enrich?.pain_points) ? (enrich.pain_points as string[]).join(', ') : 'N/D'

  const prompt = `Você é ORACLE no modo SDR de uma agência de marketing digital.
Escreva uma mensagem de prospecção para WhatsApp.

CONTEXTO: ${followupContext}

REGRAS OBRIGATÓRIAS:
- Máximo 3 parágrafos CURTOS
- Mencione algo ESPECÍFICO do negócio deste prospect — não seja genérico
- Tom: direto, humano, coloquial. Zero formalidade excessiva.
- PROIBIDO começar com: "Olá, somos uma agência", "Espero que...", "Como vai?"
- Retorne APENAS o texto da mensagem, sem explicações ou aspas

DADOS DO PROSPECT:
- Nome: ${lead?.name ?? 'N/D'}
- Empresa: ${lead?.company ?? 'N/D'}
- Nicho: ${enrich?.niche_detected ?? lead?.niche ?? 'N/D'}
- Instagram: ${enrich?.instagram_handle ? `@${enrich.instagram_handle} (${enrich.instagram_followers ?? 0} seguidores)` : 'N/D'}
- Frequência de posts: ${enrich?.instagram_posts_freq ?? 'N/D'}
- Dores identificadas: ${painPoints}
- Score de qualificação: ${score?.score ?? 'N/D'}/10
- O que ele disse ao se cadastrar: ${lead?.notes ?? 'Nada'}`

  const result = await routeChat('oracle', [{ role: 'user', content: prompt }], { maxTokens: 400 })
  const draftMessage = result.content.trim()
  const channel = 'whatsapp'

  await supabase.from('sdr_actions').insert({
    pipeline_id: pipelineId,
    lead_id: leadId,
    step: 2 + followupNumber,
    agent: 'oracle',
    action_type: 'draft_message',
    status: 'pending',
    input: { followup_number: followupNumber, channel },
    output: { message: draftMessage, channel },
  })

  if (userId) {
    const followupLabels = ['SDR: primeiro contato', 'SDR: follow-up 1', 'SDR: follow-up 2']
    void supabase.from('notifications').insert({
      user_id: userId,
      type: 'sdr_approval',
      title: `${followupLabels[followupNumber] ?? 'SDR'}: mensagem para ${lead?.name} aguarda aprovação`,
      body: draftMessage.slice(0, 100) + (draftMessage.length > 100 ? '...' : ''),
      link: '/crm/sdr',
      metadata: { lead_id: leadId, pipeline_id: pipelineId, followup_number: followupNumber },
    })
  }
}
