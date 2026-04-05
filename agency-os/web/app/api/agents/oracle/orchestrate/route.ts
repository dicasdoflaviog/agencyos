import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { type AgentType, AGENT_LABELS } from '@/types/agents'
import { getClientIGMetrics, getClientIGTrend, formatIGContext, formatIGTrendContext } from '@/lib/apify/tools'

export const dynamic = 'force-dynamic'

const ANTHROPIC_MODEL = 'claude-3-5-haiku-20241022'

// ── Agent system prompts (same as oracle/chat) ────────────────────────────────
const AGENT_SYSTEMS: Partial<Record<AgentType, string>> = {
  vance:  `Você é o VANCE, Estrategista de Marca e Marketing da agência. Desenvolva posicionamento de marca, estratégias de campanha, análise de concorrência e calendários editoriais. Entregue análises estruturadas com insights e recomendações acionáveis. Responda em português do Brasil.`,
  vera:   `Você é a VERA, Copywriter especialista da agência. Crie textos persuasivos, legendas para Instagram, copies para anúncios, headlines, CTAs e emails marketing. Sempre em português do Brasil, tom próximo e engajador. Entregue o copy pronto para uso, formatado com quebras de linha.`,
  marco:  `Você é o MARCO, Roteirista e Diretor de Conteúdo de Vídeo da agência. Escreva roteiros completos para Reels, TikToks e YouTube Shorts. Inclua gancho (0-3s), desenvolvimento e CTA. Use linguagem falada natural, indicando cenas e cortes. Responda em português do Brasil.`,
  atlas:  `Você é o ATLAS, Diretor de Arte da agência. Crie prompts detalhados em inglês para geração de imagens com IA. Descreva estilo visual, composição, cores, iluminação, mood e aspect ratio. Explique brevemente a proposta criativa em português. Para briefings de design, entregue diretrizes visuais completas.`,
  volt:   `Você é o VOLT, Especialista em Tráfego Pago e Performance da agência. Crie estruturas de campanha para Meta Ads e Google Ads com segmentação de audiência, copies de anúncio e estratégia de lances. Sempre orientado a performance e ROI. Responda em português do Brasil.`,
  pulse:  `Você é o PULSE, Especialista em Engajamento e Social Media da agência. Crie estratégias de engajamento, calendário de stories, scripts de DM e planos de community management. Mantenha o tom da marca do cliente. Responda em português do Brasil.`,
  prism:  `Você é o PRISM, Especialista em Cultura Digital e Audiência da agência. Mapeie personas, analise comportamentos, identifique tendências e conecte cultura pop ao marketing. Seja criativo e empático. Responda em português do Brasil.`,
  iris:   `Você é o IRIS, Especialista em Pesquisa e Inteligência de Mercado da agência. Realize pesquisas de mercado, análise de tendências, benchmarking competitivo e relatórios de inteligência. Seja analítico e baseado em dados. Responda em português do Brasil.`,
  nexus:  `Você é o NEXUS, Gerente de Relacionamento com Clientes da agência. Especialista em comunicação com clientes: resumos, follow-ups, status de projetos e apresentações. Seja profissional e orientado a resultados. Responda em português do Brasil.`,
  cipher: `Você é o CIPHER, Especialista em Distribuição e Publicação de Conteúdo da agência. Crie planos de publicação com cronogramas, canais, frequência e estratégias de distribuição multiplataforma. Responda em português do Brasil.`,
}

const VALID_ORCHESTRATION_AGENTS = new Set(Object.keys(AGENT_SYSTEMS))

// ── Planner prompt ─────────────────────────────────────────────────────────────
const PLANNER_PROMPT = (request: string, clientContext: string) => `
Você é o ORACLE, Diretor de IA de uma agência de marketing. Um usuário fez o seguinte pedido:

"${request}"

${clientContext}

Agentes disponíveis para orquestração:
- vance: estratégia de marca, posicionamento, análise competitiva, calendário editorial
- vera: copy, legenda, headline, CTA, email marketing, texto para anúncio
- marco: roteiro de Reel, TikTok, YouTube Short, vídeo institucional
- atlas: prompt de imagem IA, direção de arte, briefing visual
- volt: campanha Meta Ads / Google Ads, segmentação, estratégia de tráfego pago
- pulse: engajamento, stories, DM script, community management
- prism: pesquisa de persona, tendências, comportamento de audiência
- iris: pesquisa de mercado, benchmarking, análise de concorrência
- nexus: comunicação com cliente, apresentação, follow-up
- cipher: plano de publicação, cronograma, distribuição de conteúdo

Selecione de 2 a 5 agentes que farão entregas DIRETAS e COMPLEMENTARES para este pedido.
Para cada agente, defina uma tarefa específica e acionável (não genérica).

Responda APENAS com JSON válido, sem markdown, sem explicação:
{
  "campaign_title": "título curto da campanha ou entrega",
  "agents": [
    { "agent": "vera", "task": "tarefa específica para vera..." },
    { "agent": "atlas", "task": "tarefa específica para atlas..." }
  ]
}
`

// ── Output type map ────────────────────────────────────────────────────────────
const OUTPUT_TYPE_MAP: Partial<Record<AgentType, string>> = {
  vera: 'copy', marco: 'script', atlas: 'image_prompt', volt: 'ads_copy',
  pulse: 'social_post', cipher: 'publish_plan', vance: 'strategy',
  iris: 'research', prism: 'audience_insight', nexus: 'client_note',
}

// ── Route ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, job_id, client_id } = await req.json() as {
    message: string
    job_id?: string
    client_id?: string
  }

  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const anthropic = new Anthropic({ apiKey })

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  // ── Load client DNA + IG context ────────────────────────────────────────────
  let clientContext = ''
  if (client_id) {
    const [{ data: dna }, { data: client }, igMetrics, igTrend] = await Promise.all([
      supabase.from('client_dna')
        .select('brand_name, brand_voice, target_audience, key_messages, visual_style')
        .eq('client_id', client_id).maybeSingle(),
      supabase.from('clients')
        .select('name, niche, instagram_handle').eq('id', client_id).maybeSingle(),
      getClientIGMetrics(client_id, supabase),
      getClientIGTrend(client_id, supabase),
    ])

    if (dna || client) {
      clientContext = `\nCONTEXTO DO CLIENTE:`
      if (client?.name)            clientContext += `\n- Marca: ${client.name}`
      if (client?.niche)           clientContext += ` (${client.niche})`
      if (dna?.brand_voice)        clientContext += `\n- Voz da marca: ${dna.brand_voice}`
      if (dna?.target_audience)    clientContext += `\n- Público-alvo: ${dna.target_audience}`
      if (dna?.key_messages)       clientContext += `\n- Mensagens-chave: ${dna.key_messages}`
      if (dna?.visual_style)       clientContext += `\n- Estilo visual: ${dna.visual_style}`
      if (igMetrics)               clientContext += formatIGContext(igMetrics) + formatIGTrendContext(igTrend)
    }
  }

  // ── Step 1: Planner — decide which agents and their tasks ───────────────────
  let plan: { campaign_title: string; agents: Array<{ agent: string; task: string }> }
  try {
    const planRes = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: PLANNER_PROMPT(message, clientContext) }],
    })
    const planText = planRes.content[0]?.type === 'text' ? planRes.content[0].text.trim() : ''
    // Strip markdown code fences if present
    const jsonText = planText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    plan = JSON.parse(jsonText) as typeof plan
  } catch (err) {
    return NextResponse.json({ error: `Planner failed: ${String(err)}` }, { status: 500 })
  }

  // Filter to valid agents only (max 5)
  const agentTasks = plan.agents
    .filter(a => VALID_ORCHESTRATION_AGENTS.has(a.agent))
    .slice(0, 5)

  if (agentTasks.length === 0) {
    return NextResponse.json({ error: 'No valid agents selected by planner' }, { status: 500 })
  }

  // ── Step 2: Execute all agents in parallel ──────────────────────────────────
  const systemSuffix = clientContext

  const results = await Promise.allSettled(
    agentTasks.map(async ({ agent, task }) => {
      const agentId = agent as AgentType
      const systemPrompt = (AGENT_SYSTEMS[agentId] ?? AGENT_SYSTEMS.vera!) + systemSuffix

      const msg = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: task }],
      })

      const content = msg.content
        .filter(b => b.type === 'text')
        .map(b => ('text' in b ? b.text : ''))
        .join('\n')

      // Save to job_outputs
      const { data: savedOutput } = await supabase
        .from('job_outputs')
        .insert({
          job_id: job_id ?? null,
          client_id: client_id ?? null,
          workspace_id: profile?.workspace_id,
          agent_id: agentId,
          agent_name: AGENT_LABELS[agentId] ?? agentId.toUpperCase(),
          input_prompt: task,
          output_content: content,
          output_type: OUTPUT_TYPE_MAP[agentId] ?? 'text',
          status: 'pending',
        })
        .select('id')
        .single()

      return {
        agent: agentId,
        label: AGENT_LABELS[agentId] ?? agentId.toUpperCase(),
        task,
        content,
        output_id: savedOutput?.id ?? null,
        status: 'fulfilled' as const,
      }
    }),
  )

  // ── Step 3: Collect results ─────────────────────────────────────────────────
  const outputs = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return {
      agent: agentTasks[i].agent as AgentType,
      label: AGENT_LABELS[agentTasks[i].agent as AgentType] ?? agentTasks[i].agent.toUpperCase(),
      task: agentTasks[i].task,
      content: `⚠️ Erro ao executar este agente. Tente novamente.`,
      output_id: null,
      status: 'rejected' as const,
    }
  })

  return NextResponse.json({
    campaign_title: plan.campaign_title,
    agents: outputs,
  })
}
