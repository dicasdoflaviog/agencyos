import { createAdminClient } from '@/lib/supabase/admin'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'
import { scrapeInstagramProfile } from '@/lib/apify/tools'

export async function runIrisEnrich(
  leadId: string,
  pipelineId: string,
) {
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('name, company, niche, notes')
    .eq('id', leadId)
    .single()

  const { data: action } = await supabase.from('sdr_actions').insert({
    pipeline_id: pipelineId,
    lead_id: leadId,
    step: 1,
    agent: 'iris',
    action_type: 'enrich',
    status: 'pending',
    input: { lead },
  }).select().single()

  // Buscar Instagram handle (das notas ou do lead_enrichments já criado)
  const { data: existingEnrich } = await supabase
    .from('lead_enrichments')
    .select('instagram_handle')
    .eq('lead_id', leadId)
    .maybeSingle()

  const igHandleFromNotes = (lead?.notes ?? '').match(/@([\w.]+)/)?.[1]
  const igHandle = existingEnrich?.instagram_handle ?? igHandleFromNotes

  const enrichment: Record<string, unknown> = {}

  // Enriquecer via Apify se handle disponível
  if (igHandle) {
    try {
      const igData = await scrapeInstagramProfile(igHandle, leadId)
      if (igData) {
        enrichment.instagram_handle = igHandle
        enrichment.instagram_followers = igData.followers
        enrichment.instagram_posts_count = igData.posts
        enrichment.instagram_engagement = igData.engagement_rate
      }
    } catch { /* enriquecimento é melhor-esforço */ }
  }

  // IRIS analisa e identifica dores/nicho
  const irisPrompt = `Você é IRIS. Analise os dados deste prospect e retorne APENAS JSON (sem markdown):
{
  "niche_detected": "nicho real identificado",
  "instagram_posts_freq": "diário|semanal|raramente|sem_dados",
  "instagram_content_type": "produto|serviço|educacional|misto|sem_dados",
  "pain_points": ["dor 1", "dor 2", "dor 3"],
  "website_summary": null
}

DADOS DO PROSPECT:
- Nome: ${lead?.name}
- Empresa: ${lead?.company ?? 'Não informado'}
- Nicho declarado: ${lead?.niche ?? 'Não informado'}
- O que disse: ${lead?.notes ?? 'Nada'}
- Instagram: ${igHandle ? `@${igHandle} (${enrichment.instagram_followers ?? 'N/D'} seguidores)` : 'Não informado'}

Seja específico com as dores. Se não houver dados suficientes, diga claramente.`

  const irisResult = await routeChat('iris', [{ role: 'user', content: irisPrompt }], { maxTokens: 400 })

  let irisData: Record<string, unknown> = {}
  try {
    const clean = irisResult.content.replace(/```json|```/g, '').trim()
    irisData = JSON.parse(clean)
  } catch { /* usa vazio */ }

  const finalEnrichment = { ...enrichment, ...irisData }

  await supabase.from('lead_enrichments').upsert({
    lead_id: leadId,
    instagram_handle: igHandle ?? null,
    instagram_followers: typeof finalEnrichment.instagram_followers === 'number' ? finalEnrichment.instagram_followers : null,
    instagram_posts_freq: finalEnrichment.instagram_posts_freq as string ?? null,
    instagram_content_type: finalEnrichment.instagram_content_type as string ?? null,
    website_summary: finalEnrichment.website_summary as string ?? null,
    niche_detected: finalEnrichment.niche_detected as string ?? null,
    pain_points: Array.isArray(finalEnrichment.pain_points) ? finalEnrichment.pain_points : [],
    raw_data: finalEnrichment,
  }, { onConflict: 'lead_id' })

  await supabase.from('leads')
    .update({ enriched_at: new Date().toISOString() })
    .eq('id', leadId)

  await supabase.from('sdr_actions').update({
    status: 'sent',
    output: finalEnrichment,
  }).eq('id', action?.id)
}
