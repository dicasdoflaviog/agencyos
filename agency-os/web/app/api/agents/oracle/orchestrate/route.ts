import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type AgentType, AGENT_LABELS } from '@/types/agents'
import { getClientIGMetrics, getClientIGTrend, formatIGContext, formatIGTrendContext } from '@/lib/apify/tools'
import { openrouter } from '@/lib/openrouter/client'
import { getProviderModel } from '@/lib/openrouter/models'
import { fireOrchestrationComplete, fireReviewComplete } from '@/lib/n8n-pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── Agent system prompts (same as oracle/chat) ────────────────────────────────
const AGENT_SYSTEMS_BASE: Partial<Record<AgentType, string>> = {
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

// All 21 orchestratable agents (oracle excluded — it's the conductor)
const AGENT_SYSTEMS: Partial<Record<AgentType, string>> = {
  ...AGENT_SYSTEMS_BASE,
  genesis: `Você é o GENESIS, Criador e Configurador de Agentes da agência. Você ajuda a projetar novos agentes de IA: escreve system prompts, define personas, mapeia capacidades e limites de cada agente. Seja técnico e criativo. Responda em português do Brasil.`,
  lore:    `Você é o LORE, guardião da Memória Institucional da agência. Você tem acesso ao histórico de decisões, processos internos, cases, metodologias e conhecimento acumulado. Responda perguntas sobre como a agência trabalha, decisões passadas e boas práticas. Seja preciso e referenciado. Responda em português do Brasil.`,
  flux:    `Você é o FLUX, Especialista em Automação e Integrações da agência. Você cria fluxos de automação no Zapier, Make (Integromat), n8n e webhooks. Mapeie processos, identifique gargalos e entregue blueprints de automação com gatilhos, ações e condições. Seja técnico e preciso. Responda em português do Brasil.`,
  vox:     `Você é o VOX, Produtor de Conteúdo de Áudio da agência. Escreva roteiros e scripts prontos para narração em áudio, podcasts e vídeos. Use linguagem falada natural, com ritmo adequado para narração. Indique pausas com [...] e ênfases com *palavra*. Entregue o script completo e pronto para gravar.`,
  vector:  `Você é o VECTOR, Especialista em Analytics e Dados da agência. Você analisa métricas de marketing digital, interpreta dashboards, identifica padrões e gera relatórios de performance. Seja analítico, visual (use tabelas/listas) e orientado a decisão. Responda em português do Brasil.`,
  bridge:  `Você é o BRIDGE, Especialista em Onboarding de Clientes da agência. Você conduz o processo de entrada de novos clientes: coleta de informações, alinhamento de expectativas, setup inicial, criação de briefing e primeiras entregas. Seja acolhedor, organizado e detalhista. Responda em português do Brasil.`,
  aegis:   `Você é o AEGIS, Gestor de Qualidade e Aprovação da agência. Você revisa entregas antes de ir ao cliente, verifica alinhamento com briefing, identifica erros, sugere melhorias e gerencia o fluxo de aprovação interno e externo. Seja criterioso, construtivo e detalhista. Responda em português do Brasil.`,
  harbor:  `Você é o HARBOR, Especialista em CRM e Relacionamento Comercial da agência. Você gerencia o pipeline de vendas, qualifica leads, prepara propostas comerciais, acompanha negociações e identifica oportunidades de upsell/cross-sell. Seja estratégico e orientado a fechamento. Responda em português do Brasil.`,
  ledger:  `Você é o LEDGER, Especialista Financeiro da agência. Você analisa rentabilidade de contas, prepara relatórios financeiros, calcula ROI de campanhas, elabora propostas comerciais com precificação e monitora indicadores como MRR, LTV e CAC. Seja preciso e orientado a números. Responda em português do Brasil.`,
  surge:   `Você é o SURGE, Growth Hacker da agência. Você identifica alavancas de crescimento, propõe experimentos A/B, otimiza funis de conversão, estratégias de aquisição e retenção. Pense em escala, velocidade e custo-efetividade. Entregue hipóteses testáveis e planos de experimento. Responda em português do Brasil.`,
  anchor:  `Você é o ANCHOR, Especialista em Customer Success da agência. Você garante a satisfação e retenção de clientes: NPS, health score, QBRs, planos de expansão e prevenção de churn. Seja proativo, empático e orientado a valor entregue. Responda em português do Brasil.`,
}

const VALID_ORCHESTRATION_AGENTS = new Set(Object.keys(AGENT_SYSTEMS))

// ── Output type per agent ──────────────────────────────────────────────────────
const OUTPUT_TYPE_MAP: Partial<Record<AgentType, string>> = {
  nexus:   'client_note',   genesis: 'agent_spec',    lore:    'knowledge',
  vance:   'strategy',      vera:    'copy',           marco:   'script',
  atlas:   'image_prompt',  volt:    'ads_copy',       pulse:   'social_post',
  cipher:  'publish_plan',  flux:    'automation',     vox:     'audio_script',
  iris:    'research',      vector:  'analytics',      prism:   'audience_insight',
  bridge:  'onboarding',    aegis:   'review',         harbor:  'crm_note',
  ledger:  'financial',     surge:   'growth_plan',    anchor:  'success_plan',
}
// ── Planner prompt — all 21 agents + parallel/sequential mode selection ─────────
const PLANNER_PROMPT = (request: string, clientContext: string) => `
Você é o ORACLE, Diretor de IA de uma agência de marketing. Um usuário fez o seguinte pedido:

"${request}"

${clientContext}

Agentes disponíveis:
PRODUÇÃO: vance (estratégia/posicionamento), vera (copy/legenda/headline), marco (roteiro/reel/tiktok), atlas (imagem IA/arte), volt (Meta Ads/Google Ads), pulse (engajamento/stories/DM), cipher (publicação/hashtags/SEO), flux (automação/n8n/Zapier), vox (áudio/podcast/narração)
INTELIGÊNCIA: iris (pesquisa de mercado/benchmarking), vector (analytics/métricas/relatório), prism (personas/tendências/audiência)
OPERAÇÕES: bridge (onboarding/briefing), aegis (revisão/aprovação), harbor (CRM/pipeline/proposta), ledger (financeiro/ROI/precificação)
CRESCIMENTO: surge (growth hacking/A/B test/funil), anchor (customer success/churn/NPS)
GESTÃO: nexus (comunicação/apresentação/follow-up), genesis (design de agentes/system prompts), lore (memória institucional/processos)

MODO DE EXECUÇÃO:
- "parallel": agentes executam simultaneamente (use quando as tarefas são independentes)
- "sequential": agentes executam em cadeia, cada output alimenta o próximo (use quando faz sentido: VANCE estratégia → VERA usa ela → ATLAS usa ambas)

Selecione de 2 a 5 agentes. Defina uma tarefa específica e acionável para cada um (não genérica).

Responda APENAS com JSON válido, sem markdown:
{
  "campaign_title": "título curto",
  "mode": "parallel",
  "agents": [
    { "agent": "vance", "task": "tarefa específica..." },
    { "agent": "vera", "task": "tarefa específica..." }
  ]
}
`

// ── Oracle review prompt — Layer 3: quality gate ──────────────────────────────
const REVIEWER_PROMPT = (
  request: string,
  outputs: Array<{ agent: string; task: string; content: string }>
) => `
Você é o ORACLE, Diretor de IA da agência. Avalie as entregas dos seus agentes:

PEDIDO ORIGINAL: "${request}"

OUTPUTS:
${outputs.map(o => `[${o.agent.toUpperCase()}] Tarefa: ${o.task}\nEntrega: ${o.content.slice(0, 600)}`).join('\n---\n')}

Avalie: alinhamento com o pedido, completude, qualidade prática e coerência entre as entregas.

Responda APENAS com JSON válido:
{
  "quality_score": 85,
  "verdict": "approved",
  "summary": "Uma frase resumindo as entregas para o cliente",
  "revisions": []
}

Se quality_score < 70, use verdict "needs_revision" e adicione em "revisions":
[{ "agent": "vera", "issue": "descrição do problema e o que melhorar" }]
`

// ── Execute a single agent — shared by parallel and sequential modes ───────────
async function executeAgent(
  agentId: AgentType,
  task: string,
  systemSuffix: string,
  prevContext?: string,
): Promise<string> {
  const systemPrompt = (AGENT_SYSTEMS[agentId] ?? AGENT_SYSTEMS.vera!) + systemSuffix
  const userContent = prevContext
    ? `CONTEXTO DA ETAPA ANTERIOR:\n${prevContext.slice(0, 1200)}\n\n---\nSUA TAREFA:\n${task}`
    : task

  const msg = await openrouter.chat.completions.create({
    model: getProviderModel(agentId),
    max_tokens: 1500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })
  return msg.choices[0]?.message?.content ?? ''
}



// ── Route ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, job_id, client_id } = await req.json() as {
    message: string
    job_id?: string
    client_id?: string
  }

  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

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

  // ── Step 1: Planner — Oracle picks agents, tasks, and execution mode ──────────
  let plan: {
    campaign_title: string
    mode: 'parallel' | 'sequential'
    agents: Array<{ agent: string; task: string }>
  }
  try {
    const planRes = await openrouter.chat.completions.create({
      model: getProviderModel('dna'),
      max_tokens: 1000,
      messages: [{ role: 'user', content: PLANNER_PROMPT(message, clientContext) }],
    })
    const planText = planRes.choices[0]?.message?.content?.trim() ?? ''
    const jsonText = planText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    plan = JSON.parse(jsonText) as typeof plan
  } catch (err) {
    return NextResponse.json({ error: `Planner failed: ${String(err)}` }, { status: 500 })
  }

  const agentTasks = plan.agents
    .filter(a => VALID_ORCHESTRATION_AGENTS.has(a.agent))
    .slice(0, 5)

  if (agentTasks.length === 0) {
    return NextResponse.json({ error: 'No valid agents selected by planner' }, { status: 500 })
  }

  const systemSuffix = clientContext

  // ── Step 2: Execute — parallel or sequential (Layer 2) ───────────────────────
  type OutputItem = {
    agent: AgentType
    label: string
    task: string
    content: string
    output_id: string | null
    status: 'fulfilled' | 'rejected'
  }

  const saveOutput = async (agentId: AgentType, task: string, content: string): Promise<string | null> => {
    const { data: saved } = await supabase
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
    return saved?.id ?? null
  }

  let outputs: OutputItem[] = []

  if (plan.mode === 'sequential') {
    // Sequential: each agent receives the previous agent's output as context
    for (const { agent, task } of agentTasks) {
      const agentId = agent as AgentType
      const prevContent = outputs.at(-1)?.content
      try {
        const content = await executeAgent(agentId, task, systemSuffix, prevContent)
        const output_id = await saveOutput(agentId, task, content)
        outputs.push({ agent: agentId, label: AGENT_LABELS[agentId] ?? agentId.toUpperCase(), task, content, output_id, status: 'fulfilled' })
      } catch {
        outputs.push({ agent: agentId, label: AGENT_LABELS[agentId] ?? agentId.toUpperCase(), task, content: '⚠️ Erro ao executar este agente. Tente novamente.', output_id: null, status: 'rejected' })
      }
    }
  } else {
    // Parallel: all agents run simultaneously
    const results = await Promise.allSettled(
      agentTasks.map(({ agent, task }) =>
        executeAgent(agent as AgentType, task, systemSuffix).then(async content => {
          const agentId = agent as AgentType
          const output_id = await saveOutput(agentId, task, content)
          return { agent: agentId, task, content, output_id }
        })
      )
    )
    outputs = results.map((r, i) => {
      const agentId = agentTasks[i].agent as AgentType
      if (r.status === 'fulfilled') {
        return { agent: agentId, label: AGENT_LABELS[agentId] ?? agentId.toUpperCase(), task: agentTasks[i].task, content: r.value.content, output_id: r.value.output_id, status: 'fulfilled' as const }
      }
      return { agent: agentId, label: AGENT_LABELS[agentId] ?? agentId.toUpperCase(), task: agentTasks[i].task, content: '⚠️ Erro ao executar este agente. Tente novamente.', output_id: null, status: 'rejected' as const }
    })
  }

  // ── Step 3: Oracle review loop (Layer 3) ─────────────────────────────────────
  // Oracle grades all outputs; re-runs agents below quality threshold (once)
  const successfulOutputs = outputs.filter(o => o.status === 'fulfilled' && o.content.length > 50)
  let review: { quality_score: number; verdict: string; summary: string } | null = null

  if (successfulOutputs.length > 0) {
    try {
      const reviewRes = await openrouter.chat.completions.create({
        model: getProviderModel('oracle'),
        max_tokens: 600,
        messages: [{ role: 'user', content: REVIEWER_PROMPT(message, successfulOutputs) }],
      })
      const reviewText = reviewRes.choices[0]?.message?.content?.trim() ?? ''
      const parsed = JSON.parse(reviewText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()) as {
        quality_score: number
        verdict: string
        summary: string
        revisions?: Array<{ agent: string; issue: string }>
      }
      review = { quality_score: parsed.quality_score, verdict: parsed.verdict, summary: parsed.summary }

      // ── Fire review event to n8n pipeline ───────────────────────────────────
      fireReviewComplete({
        campaign_title:  plan.campaign_title,
        quality_score:   parsed.quality_score,
        verdict:         parsed.verdict,
        summary:         parsed.summary,
        agents_revised:  parsed.revisions?.map(r => r.agent),
        client_id:       client_id ?? null,
      })

      // Re-run agents flagged by Oracle for revision (once — no infinite loop)
      if (parsed.verdict === 'needs_revision' && parsed.revisions && parsed.revisions.length > 0) {
        for (const { agent, issue } of parsed.revisions) {
          const originalTask = agentTasks.find(a => a.agent === agent)
          if (!originalTask) continue
          const agentId = agent as AgentType
          const improvedTask = `${originalTask.task}\n\nFEEDBACK DO ORACLE (melhore estes pontos):\n${issue}`
          try {
            const newContent = await executeAgent(agentId, improvedTask, systemSuffix)
            await saveOutput(agentId, improvedTask, newContent)
            const idx = outputs.findIndex(o => o.agent === agentId)
            if (idx >= 0) outputs[idx].content = newContent
          } catch { /* keep original if re-run fails */ }
        }
      }
    } catch { /* review failed — return outputs without review metadata */ }
  }

  // ── Fire orchestration complete to n8n pipeline ─────────────────────────────
  fireOrchestrationComplete({
    campaign_title: plan.campaign_title,
    mode:           plan.mode,
    workspace_id:   profile?.workspace_id,
    client_id:      client_id ?? null,
    agents_used:    outputs.map(o => ({
      agent:  o.agent,
      label:  o.label,
      status: o.status,
      chars:  o.content.length,
    })),
    review,
  })

  return NextResponse.json({
    campaign_title: plan.campaign_title,
    mode: plan.mode,
    agents: outputs,
    ...(review ? { review } : {}),
  })
}
