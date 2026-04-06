import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/openrouter/client'
import { getProviderModel } from '@/lib/openrouter/models'
import { AGENTS, getSystemPrompt, type AgentId } from '@/lib/anthropic/agents'
import { getClientIGMetrics, getClientIGTrend, formatIGContext, formatIGTrendContext } from '@/lib/apify/tools'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    agentId: AgentId
    jobId: string
    clientId: string
    userMessage: string
    // histórico de mensagens da conversa atual com este agente (opcional)
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  }
  const { agentId, jobId, clientId, userMessage, conversationHistory = [] } = body

  if (!agentId || !jobId || !clientId || !userMessage?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Busca dados do cliente, job e briefing em paralelo
  const [{ data: client }, { data: job }, { data: briefing }] = await Promise.all([
    supabase.from('clients').select('name, niche, brand_voice, instagram_handle').eq('id', clientId).single(),
    supabase.from('jobs').select('title, description').eq('id', jobId).single(),
    supabase.from('job_briefings').select('*').eq('job_id', jobId).maybeSingle(),
  ])

  // ── Busca outputs anteriores do job (de outros agentes) para encadeamento
  const { data: previousOutputs } = await supabase
    .from('job_outputs')
    .select('agent_name, output_content, created_at')
    .eq('job_id', jobId)
    .eq('status', 'approved') // só injeta outputs aprovados
    .order('created_at', { ascending: true })
    .limit(5) // limita para não explodir o contexto

  // ── Para PULSE: carrega métricas do Instagram do cliente (via Apify/DB)
  let igBlock = ''
  if (agentId === 'pulse' && clientId) {
    const [metrics, trend] = await Promise.all([
      getClientIGMetrics(clientId, supabase),
      getClientIGTrend(clientId, supabase),
    ])
    if (metrics) {
      igBlock = formatIGContext(metrics) + formatIGTrendContext(trend)
    } else if (client?.instagram_handle) {
      igBlock = `\n\nInstagram do cliente: @${client.instagram_handle} (métricas não sincronizadas — use o botão "Sincronizar Instagram" no perfil do cliente)`
    }
  }

  // ── Monta bloco de contexto
  const clientBlock = client
    ? `Cliente: ${client.name}${client.niche ? ` | Nicho: ${client.niche}` : ''}${client.brand_voice ? `\nVoz da marca: ${client.brand_voice}` : ''}${client.instagram_handle ? `\nInstagram: @${client.instagram_handle}` : ''}`
    : ''

  const jobBlock = job
    ? `Job: ${job.title}${job.description ? ` — ${job.description}` : ''}`
    : ''

  const briefingBlock = briefing
    ? `\nBRIEFING:\n` +
      (briefing.content_type    ? `  Tipo de conteúdo: ${briefing.content_type}\n` : '') +
      (briefing.objective       ? `  Objetivo: ${briefing.objective}\n` : '') +
      (briefing.target_audience ? `  Público-alvo: ${briefing.target_audience}\n` : '') +
      (briefing.key_message     ? `  Mensagem principal: ${briefing.key_message}\n` : '') +
      (briefing.tone            ? `  Tom: ${briefing.tone}\n` : '') +
      (briefing.restrictions    ? `  Restrições: ${briefing.restrictions}\n` : '') +
      (briefing.deadline_notes  ? `  Prazo: ${briefing.deadline_notes}\n` : '') +
      (briefing.reference_urls?.length > 0
        ? `  Referências: ${briefing.reference_urls.join(', ')}\n`
        : '')
    : ''

  const previousOutputsBlock = previousOutputs && previousOutputs.length > 0
    ? `\n\n## OUTPUTS ANTERIORES DO JOB (contexto encadeado)\n` +
      previousOutputs.map(o =>
        `### ${o.agent_name}\n${o.output_content}`
      ).join('\n\n---\n\n')
    : ''

  const contextBlock = (clientBlock || jobBlock)
    ? `## CONTEXTO DO JOB\n${clientBlock}\n${jobBlock}${briefingBlock}${igBlock}${previousOutputsBlock}\n\n---\n\n`
    : ''

  const systemPrompt = getSystemPrompt(agentId)
  const agent = AGENTS[agentId]

  // ── Monta histórico de mensagens
  // Se há histórico de conversa, usa multi-turn. Caso contrário, single-turn.
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
    conversationHistory.length > 0
      ? [
          // Primeira mensagem sempre injeta o contexto do job
          { role: 'user', content: contextBlock + conversationHistory[0].content },
          ...conversationHistory.slice(1),
          { role: 'user', content: userMessage },
        ]
      : [{ role: 'user', content: contextBlock + userMessage }]

  const message = await openrouter.chat.completions.create({
    model: getProviderModel(agentId),
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  const outputContent = message.choices[0]?.message?.content ?? ''

  const { data: savedOutput, error } = await supabase
    .from('job_outputs')
    .insert({
      job_id: jobId,
      client_id: clientId,
      agent_id: agentId,
      agent_name: agent.name,
      input_prompt: userMessage,
      output_content: outputContent,
      output_type: 'text',
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    outputId: savedOutput.id,
    content: outputContent,
    agentName: agent.name,
  })
}
