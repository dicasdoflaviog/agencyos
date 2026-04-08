import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { type AgentType, AGENT_LABELS } from '@/types/agents'
import { checkAndDeductCredits } from '@/lib/credits'
import {
  getClientIGMetrics,
  getClientIGTrend,
  scrapeInstagramProfile,
  formatIGContext,
  formatIGTrendContext,
  isIGSyncRequest,
  extractIGHandle,
} from '@/lib/apify/tools'
import { routeChatStream, routeChat, getModelForAgent, generateImage } from '@/lib/openrouter/IntelligenceRouter'
import { getClientDNAContext } from '@/lib/ai/dna-context'
import { type CreativeSlide } from '@/components/agents/CreativeRenderer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── ATLAS image-generation intent detector ────────────────────────────────────
// Detecta se o usuário quer gerar a imagem de verdade (não apenas um prompt)
const ATLAS_IMAGE_INTENT_RE = /\b(ger[ae]r?\s+(a\s+)?imagem|cri[ae]r?\s+(a\s+)?imagem|cri[ae]r?\s+criativo|faz[ea]r?\s+(a\s+)?imagem|produz[ir]*\s+(a\s+)?imagem|creat[e]?\s+image|generat[e]?\s+image|gera\s+(o\s+)?criativo|cria\s+(o\s+)?criativo)\b/i

// Extrai o melhor prompt de imagem de uma resposta do ATLAS
function extractImagePrompt(text: string): string | null {
  // 1. Procura por bloco de código ou linha rotulada "Prompt:"
  const codeMatch = text.match(/```(?:prompt|image)?\s*([\s\S]+?)```/)
  if (codeMatch) return codeMatch[1].trim()

  const labelMatch = text.match(/(?:^|\n)(?:Prompt:|Image prompt:|Prompt de imagem:)\s*(.+)/im)
  if (labelMatch) return labelMatch[1].trim()

  // 2. Usa a primeira linha longa em inglês (heurística)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const engLine = lines.find(l => l.length > 60 && /[a-zA-Z]{3,}/.test(l))
  return engLine ?? null
}

// Aspect ratio padrão por formato
const FORMAT_ASPECT_MAP: Record<string, string> = {
  feed: '1:1', stories: '9:16', banner: '16:9', thumbnail: '16:9',
  portrait: '9:16', carousel: '1:1',
}

function detectFormat(text: string): string {
  if (/stories|9:16/i.test(text)) return 'stories'
  if (/banner|16:9/i.test(text)) return 'banner'
  if (/thumbnail/i.test(text)) return 'thumbnail'
  if (/retrato|portrait/i.test(text)) return 'portrait'
  if (/carrossel|carousel/i.test(text)) return 'carousel'
  return 'feed'
}

// ── All 22 agent system prompts ──────────────────────────────────────────────

const AGENT_SYSTEMS: Record<AgentType, string> = {
  // ── Orchestration
  oracle: `Você é o ORACLE, Diretor de IA estratégico de uma agência de marketing digital. Você lidera e orquestra 22 agentes especializados (VERA, ATLAS, VOX, VANCE, MARCO, VOLT e outros). Responda sempre em português, de forma direta, estratégica e objetiva. Analise contextos, planeje campanhas e entregue insights acionáveis. Quando identificar necessidade de agente especializado, mencione qual (@vera, @atlas, etc).`,

  nexus: `Você é o NEXUS, Gerente de Relacionamento com Clientes da agência. Você é especialista em comunicação com clientes: resumos de reunião, follow-ups, status de projetos, preparação de apresentações e alinhamento de expectativas. Seja profissional, empático e orientado a resultados. Responda em português do Brasil.`,

  genesis: `Você é o GENESIS, Criador e Configurador de Agentes da agência. Você ajuda a projetar novos agentes de IA: escreve system prompts, define personas, mapeia capacidades e limites de cada agente. Seja técnico e criativo. Responda em português do Brasil.`,

  lore: `Você é o LORE, guardião da Memória Institucional da agência. Você tem acesso ao histórico de decisões, processos internos, cases, metodologias e conhecimento acumulado. Responda perguntas sobre como a agência trabalha, decisões passadas e boas práticas. Seja preciso e referenciado. Responda em português do Brasil.`,

  // ── Production
  vance: `Você é o VANCE, Estrategista de Marca e Marketing da agência. Você desenvolve posicionamento de marca, estratégias de campanha, análise de concorrência, arquitetura de mensagem e calendários editoriais. Entregue sempre análises estruturadas com dados, insights e recomendações acionáveis. Responda em português do Brasil.`,

  vera: `Você é a VERA, Copywriter especialista da agência. Crie textos persuasivos, legendas para Instagram, copies para anúncios, headlines, CTAs, emails marketing e descrições de produto. Sempre em português do Brasil, tom próximo e engajador. Entregue o copy pronto para uso, sem explicações desnecessárias. Formate bem o texto com quebras de linha.`,

  marco: `Você é o MARCO, Roteirista e Diretor de Conteúdo de Vídeo da agência. Escreva roteiros completos para Reels, TikToks, YouTube Shorts, podcasts e vídeos institucionais. Inclua: gancho (0-3s), desenvolvimento e CTA. Use linguagem falada natural, indicando cenas, cortes e trilha quando relevante. Responda em português do Brasil.`,

  atlas: `Você é o ATLAS, Diretor de Arte da agência. Crie prompts detalhados em inglês para geração de imagens com IA (Midjourney/Stable Diffusion/DALL-E). Descreva estilo visual, composição, cores, iluminação, mood e aspect ratio. Além do prompt, explique brevemente a proposta criativa em português. Para briefings de design, entregue diretrizes visuais completas.`,

  volt: `Você é o VOLT, Especialista em Tráfego Pago e Performance da agência. Crie e analise campanhas para Meta Ads, Google Ads e TikTok Ads. Entregue: estrutura de campanha, segmentação de audiência, copies de anúncio, estratégia de lances e análise de métricas (CTR, CPC, ROAS, CAC). Sempre orientado a performance e ROI. Responda em português do Brasil.`,

  pulse: `Você é o PULSE, Especialista em Engajamento e Social Media da agência. Você gerencia a presença digital: responde comentários, cria DM scripts, estratégias de engajamento, calendário de stories, ideias de interação e community management. Mantenha o tom da marca do cliente. Responda em português do Brasil.`,

  cipher: `Você é o CIPHER, Especialista em Publicação e Distribuição de Conteúdo da agência. Você otimiza posts para cada plataforma (Instagram, LinkedIn, TikTok, YouTube), sugere melhores horários de publicação, gera listas de hashtags, adapta formatos e verifica SEO de conteúdo. Seja técnico e orientado a algoritmos. Responda em português do Brasil.`,

  flux: `Você é o FLUX, Especialista em Automação e Integrações da agência. Você cria fluxos de automação no Zapier, Make (Integromat), n8n e webhooks. Mapeie processos, identifique gargalos e entregue blueprints de automação com gatilhos, ações e condições. Seja técnico e preciso. Responda em português do Brasil.`,

  // ── Intelligence
  iris: `Você é a IRIS, Pesquisadora e Analista de Mercado da agência. Você realiza pesquisas aprofundadas sobre mercados, tendências, concorrentes e consumidores. Entregue análises estruturadas com fontes, dados relevantes, insights estratégicos e implicações para o negócio do cliente. Responda em português do Brasil.`,

  vector: `Você é o VECTOR, Especialista em Analytics e Dados da agência. Você analisa métricas de marketing digital, interpreta dashboards, identifica padrões e gera relatórios de performance. Trabalhe com dados de IG, Meta Ads, Google Analytics, etc. Seja analítico, visual (use tabelas/listas) e orientado a decisão. Responda em português do Brasil.`,

  prism: `Você é o PRISM, Especialista em Cultura Digital e Comportamento de Audiência da agência. Você mapeia personas, analisa comportamentos de consumo, identifica tendências culturais, entende gerações (Gen Z, Millennials) e conecta cultura pop ao marketing. Seja criativo e empático. Responda em português do Brasil.`,

  // ── Operations
  bridge: `Você é o BRIDGE, Especialista em Onboarding de Clientes da agência. Você conduz o processo de entrada de novos clientes: coleta de informações, alinhamento de expectativas, setup inicial, criação de briefing e primeiras entregas. Seja acolhedor, organizado e detalhista. Responda em português do Brasil.`,

  aegis: `Você é o AEGIS, Gestor de Qualidade e Aprovação da agência. Você revisa entregas antes de ir ao cliente, verifica alinhamento com briefing, identifica erros, sugere melhorias e gerencia o fluxo de aprovação interno e externo. Seja criterioso, construtivo e detalhista. Responda em português do Brasil.`,

  harbor: `Você é o HARBOR, Especialista em CRM e Relacionamento Comercial da agência. Você gerencia o pipeline de vendas, qualifica leads, prepara propostas comerciais, acompanha negociações e identifica oportunidades de upsell/cross-sell. Seja estratégico e orientado a fechamento. Responda em português do Brasil.`,

  ledger: `Você é o LEDGER, Especialista Financeiro da agência. Você analisa rentabilidade de contas, prepara relatórios financeiros, calcula ROI de campanhas, elabora propostas comerciais com precificação e monitora indicadores como MRR, LTV e CAC. Seja preciso e orientado a números. Responda em português do Brasil.`,

  // ── Growth
  surge: `Você é o SURGE, Growth Hacker da agência. Você identifica alavancas de crescimento, propõe experimentos A/B, otimiza funis de conversão, estratégias de aquisição e retenção. Pense em escala, velocidade e custo-efetividade. Entregue hipóteses testáveis e planos de experimento. Responda em português do Brasil.`,

  anchor: `Você é o ANCHOR, Especialista em Customer Success da agência. Você garante a satisfação e retenção de clientes: NPS, health score, QBRs, planos de expansão e prevenção de churn. Seja proativo, empático e orientado a valor entregue. Responda em português do Brasil.`,

  // ── Media
  vox: `Você é o VOX, Produtor de Conteúdo de Áudio da agência. Escreva roteiros e scripts prontos para narração em áudio, podcasts e vídeos. Use linguagem falada natural, com ritmo adequado para narração. Indique pausas com [...] e ênfases com *palavra*. Entregue o script completo e pronto para gravar.`,
}

// ── Classifier ──────────────────────────────────────────────────────────────

const ALL_AGENTS = Object.keys(AGENT_SYSTEMS).join(', ')

const CLASSIFIER_PROMPT = `Você é um classificador de intenções para uma agência de marketing. Analise a mensagem e retorne APENAS o nome do agente mais adequado.

Agentes disponíveis e suas especialidades:
- oracle   → estratégia geral, planejamento, briefing, dúvidas gerais, orquestração
- nexus    → gestão de clientes, reuniões, follow-up, status de projeto, apresentações
- genesis  → criar agentes, configurar IAs, system prompts, personas
- lore     → memória da agência, processos internos, histórico, boas práticas
- vance    → estratégia de marca, posicionamento, análise de concorrência, campanhas
- vera     → copy, texto, legenda, caption, headline, email marketing, CTA, descrição
- marco    → roteiro, script de vídeo, reels, tiktok, podcast, storytelling
- atlas    → design, criativo, imagem, visual, artes, post, banner, prompt para IA
- volt     → tráfego pago, Meta Ads, Google Ads, TikTok Ads, performance, ROAS
- pulse    → engajamento, resposta a comentários, community management, stories
- cipher   → publicação, agendamento, hashtags, SEO, otimização para plataforma
- flux     → automação, Zapier, Make, n8n, webhook, integrações
- iris     → pesquisa de mercado, tendências, análise de concorrente, dados
- vector   → analytics, métricas, relatório de performance, dashboard, dados
- prism    → cultura digital, personas, comportamento, geração Z, tendências
- bridge   → onboarding de cliente, coleta de info, setup inicial
- aegis    → aprovação, revisão de qualidade, fluxo de entrega, feedback
- harbor   → CRM, pipeline, proposta comercial, lead, vendas
- ledger   → financeiro, ROI, precificação, rentabilidade, MRR, CAC
- surge    → growth hacking, experimento, A/B test, funil, conversão
- anchor   → customer success, churn, NPS, retenção, satisfação do cliente
- vox      → áudio, narração, podcast, locutor, voice over, voz, fala

Mensagem: "{message}"
Responda APENAS com uma palavra (${ALL_AGENTS}).`

const VALID_AGENTS = new Set(Object.keys(AGENT_SYSTEMS))

// Attachments are now uploaded to Supabase Storage; only the path is in the request body.
type StorageAttachment = { name: string; mimeType: string; storagePath: string }
const VALID_IMG_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ImgMime = typeof VALID_IMG_TYPES[number]

// Fetch a file from Supabase Storage and return its base64 content
async function downloadAttachment(
  file: StorageAttachment,
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
): Promise<{ name: string; base64: string; mimeType: string } | null> {
  try {
    const { data, error } = await supabase.storage
      .from('oracle-attachments')
      .download(file.storagePath)
    if (error || !data) return null
    const arrayBuffer = await data.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    // Clean up after download — fire-and-forget
    supabase.storage.from('oracle-attachments').remove([file.storagePath]).then(() => {}, () => {})
    return { name: file.name, base64, mimeType: file.mimeType }
  } catch {
    return null
  }
}

// Build a single attachment's content parts from resolved base64 (OpenAI format)
function attachmentBlocks(file: { name: string; base64: string; mimeType: string }): OpenAI.ChatCompletionContentPart[] {
  const parts: OpenAI.ChatCompletionContentPart[] = []
  if ((VALID_IMG_TYPES as readonly string[]).includes(file.mimeType)) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${file.mimeType as ImgMime};base64,${file.base64}` },
    })
  } else {
    try {
      const decoded = Buffer.from(file.base64, 'base64').toString('utf-8')
      parts.push({ type: 'text', text: `[Arquivo: ${file.name}]\n\`\`\`\n${decoded.slice(0, 20000)}\n\`\`\`\n\n` })
    } catch { /* ignore decode errors */ }
  }
  return parts
}

// Build OpenAI content parts: download from Storage, then build parts
async function buildUserContent(
  text: string,
  storageFiles: StorageAttachment[] | undefined,
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
): Promise<string | OpenAI.ChatCompletionContentPart[]> {
  if (!storageFiles || !storageFiles.length) return text
  const resolved = (await Promise.all(storageFiles.map(f => downloadAttachment(f, supabase)))).filter(Boolean) as { name: string; base64: string; mimeType: string }[]
  if (!resolved.length) return text
  const parts: OpenAI.ChatCompletionContentPart[] = resolved.flatMap(attachmentBlocks)
  parts.push({ type: 'text', text })
  return parts
}

async function classifyIntent(message: string): Promise<AgentType> {
  // @mention override: "@marco escreva um roteiro..." → marco
  const mention = message.match(/^@(\w+)\s/)
  if (mention && VALID_AGENTS.has(mention[1].toLowerCase())) {
    return mention[1].toLowerCase() as AgentType
  }

  try {
    // routeChat usa IntelligenceRouter com fallback automático (gemma → gpt-4o-mini)
    const result = await routeChat('classifier', [
      { role: 'user', content: CLASSIFIER_PROMPT.replace('{message}', message) },
    ], { maxTokens: 20 })
    const text = result.content.trim().toLowerCase()
    if (VALID_AGENTS.has(text)) return text as AgentType
  } catch { /* fallback to oracle */ }
  return 'oracle'
}

// ── ATLAS carousel helpers ───────────────────────────────────────────────────

function detectCarouselSlides(msg: string): number {
  const m = msg.match(/(\d+)\s*(?:slide|criativo|card|frame|post)/i)
  if (m) return Math.min(Math.max(parseInt(m[1]), 2), 6)
  if (/carrossel|carousel/i.test(msg)) return 4
  return 0
}

type CarouselCtx = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string }
  profile: { workspace_id?: string } | null
  job_id?: string
  session_id?: string
}

async function runAtlasCarousel(
  n: number,
  userMessage: string,
  systemPrompt: string,
  ctx: CarouselCtx,
): Promise<Response> {
  const encoder = new TextEncoder()

  const carouselSystem =
    systemPrompt +
    `\n\nMODO CARROSSEL ATIVADO: crie ${n} slides para Instagram (1080×1080px).` +
    `\nREGRAS CRÍTICAS:\n` +
    `1. imagePrompt = BACKGROUND ONLY. Sem texto, sem palavras, sem tipografia na imagem gerada.\n` +
    `2. headline e body serão sobrepostos via CSS no frontend — não coloque texto no imagePrompt.\n` +
    `3. Use as cores HEX exatas do cliente presentes no contexto acima.\n` +
    `4. textPosition: "top" para slides de capa, "bottom" para demais.\n\n` +
    `Retorne APENAS este JSON array (sem markdown, sem texto antes ou depois):\n` +
    `[{"slide":1,"imagePrompt":"<English background-only prompt, NO TEXT>","headline":"<PT título>","body":"<PT apoio>","textPosition":"bottom"}]`

  const readable = new ReadableStream({
    async start(controller) {
      let finalContent = ''
      try {
        controller.enqueue(encoder.encode(`⏳ Planejando carrossel com ${n} slides...\n\n`))

        // 1. Ask ATLAS for structured slide specs
        const { content: raw } = await routeChat('atlas', [
          { role: 'system', content: carouselSystem },
          { role: 'user',   content: userMessage },
        ], { maxTokens: 2048 })

        type SlideSpec = { slide: number; imagePrompt: string; headline: string; body: string; textPosition: 'top' | 'bottom' }
        let specs: SlideSpec[] = []
        try {
          const jsonMatch = raw.match(/\[[\s\S]*\]/)
          if (jsonMatch) specs = JSON.parse(jsonMatch[0]) as SlideSpec[]
        } catch { /* fallback below */ }

        if (!specs.length) {
          specs = [{ slide: 1, imagePrompt: userMessage, headline: 'Criativo', body: '', textPosition: 'bottom' }]
        }

        controller.enqueue(encoder.encode(`✅ Roteiro criado — gerando ${specs.length} imagens em paralelo...\n\n`))

        // 2. Generate all background images in parallel
        const results = await Promise.allSettled(
          specs.map(s => generateImage({ prompt: s.imagePrompt, aspectRatio: '1:1' }))
        )

        // 3. Build CreativeSlide array
        const slides: CreativeSlide[] = []
        results.forEach((r, i) => {
          const spec = specs[i]
          if (r.status === 'fulfilled') {
            slides.push({
              slide:       spec.slide,
              imageBase64: r.value.imageBase64,
              mimeType:    r.value.mimeType,
              headline:    spec.headline,
              body:        spec.body,
              textPosition: spec.textPosition,
            })
          }
        })

        if (slides.length === 0) {
          finalContent = '⚠️ Nenhuma imagem foi gerada. Tente novamente.'
          controller.enqueue(encoder.encode(finalContent))
          return
        }

        // 4. Embed as carousel marker — frontend renders CreativeRenderer
        const marker = `%%ATLAS_CAROUSEL%%${JSON.stringify(slides)}%%END_CAROUSEL%%`
        finalContent = `✨ Carrossel com ${slides.length} slides pronto!\n\n${marker}`
        controller.enqueue(encoder.encode(finalContent))

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        finalContent = `⚠️ Erro ao gerar carrossel: ${msg}`
        controller.enqueue(encoder.encode(finalContent))
      } finally {
        await ctx.supabase.from('agent_conversations').insert({
          session_id:   ctx.session_id  ?? null,
          job_id:       ctx.job_id      ?? null,
          workspace_id: ctx.profile?.workspace_id ?? null,
          agent:        'atlas',
          role:         'assistant',
          content:      finalContent,
        }).then(() => {}, () => {})
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':           'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Agent':                'atlas',
      'X-Model':                'atlas-carousel',
      'X-Agent-Label':          'ATLAS \u2014 Diretor de Arte',
    },
  })
}

// ── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Environment guard ────────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) return new Response('OPENROUTER_API_KEY not configured', { status: 500 })

  try {
    // ── 2. Auth ─────────────────────────────────────────────────────────────
    const supabase = await createClient()

    const authResult = await supabase.auth.getUser()
    const user = authResult.data?.user
    if (!user) return new Response('Unauthorized', { status: 401 })

    // ── 3. Parse body ───────────────────────────────────────────────────────
    let body: { message?: string; job_id?: string; client_id?: string; session_id?: string; history?: { role: string; content: string }[]; attachments?: StorageAttachment[] }
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON body', { status: 400 })
    }

    const { message, job_id, client_id, session_id, history = [], attachments } = body
    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response('Missing required field: message', { status: 400 })
    }

    // ── 4. Profile ──────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle()

    // ── 4b. Credit check ────────────────────────────────────────────────────
    if (profile?.workspace_id) {
      const credit = await checkAndDeductCredits(profile.workspace_id, 'oracle_message', 'ORACLE — mensagem')
      if (!credit.ok) {
        return new Response(
          JSON.stringify({ error: credit.error, balance: credit.balance, cost: credit.cost }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── 5. Classify intent + log user message (parallel) ───────────────────
    const [agent] = await Promise.all([
      classifyIntent(message),
      supabase.from('agent_conversations').insert({
        session_id: session_id ?? null,
        job_id: job_id ?? null,
        workspace_id: profile?.workspace_id ?? null,
        agent: 'oracle',
        role: 'user',
        content: message,
      }),
    ])

    // ── 6+8b. Client intelligence: DNA + styleguide + products (full pipeline) ─
    // getClientDNAContext lê: client_memories (DNA doc + vector search),
    // knowledge_files (tokens CSS/HEX reais), client_products (funil completo).
    let dnaContext = ''
    if (client_id) {
      try {
        dnaContext = await getClientDNAContext(supabase, client_id, message)
      } catch { /* context is best-effort — non-fatal */ }
    }

    // ── 7. Instagram metrics context ────────────────────────────────────────
    let igContext = ''
    if (client_id) {
      try {
        if (isIGSyncRequest(message)) {
          const igHandleRes = await supabase
            .from('clients')
            .select('instagram_handle')
            .eq('id', client_id)
            .maybeSingle()
          const handle = extractIGHandle(message) ?? igHandleRes.data?.instagram_handle
          if (handle) {
            const fresh = await scrapeInstagramProfile(handle, client_id)
            if (fresh) {
              const today = new Date().toISOString().split('T')[0]
              await supabase.from('ig_metrics').upsert(
                { client_id, date: today, username: fresh.username, followers: fresh.followers,
                  following: fresh.following, posts: fresh.posts, engagement_rate: fresh.engagement_rate },
                { onConflict: 'client_id,date' },
              )
              igContext = formatIGContext(fresh)
            }
          }
        } else {
          const [metrics, trend] = await Promise.all([
            getClientIGMetrics(client_id, supabase),
            getClientIGTrend(client_id, supabase),
          ])
          if (metrics) igContext = formatIGContext(metrics) + formatIGTrendContext(trend)
        }
      } catch { /* IG context is best-effort — non-fatal */ }
    }

    // ── 8. Build system prompt ──────────────────────────────────────────────
    const systemPrompt = AGENT_SYSTEMS[agent] + dnaContext + igContext

    // ── 8b. ATLAS carousel auto-generation (BLOCO 5) ──────────────────────
    if (agent === 'atlas') {
      const n = detectCarouselSlides(message)
      if (n > 0) {
        return await runAtlasCarousel(n, message, systemPrompt, {
          supabase, user, profile, job_id, session_id,
        })
      }
    }

    const safeHistory = Array.isArray(history) ? history : []
    const userContent = await buildUserContent(message, attachments?.filter(a => a?.storagePath), supabase)
    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...safeHistory.slice(-10)
        .filter((h) => h?.content && typeof h.content === 'string')
        .map((h) => ({
          role: (h.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: h.content,
        })),
      { role: 'user' as const, content: userContent },
    ]

    // ── 9. Stream response ──────────────────────────────────────────────────
    const encoder = new TextEncoder()
    let fullContent = ''
    let activeModel = getModelForAgent(agent)

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // routeChatStream: tenta modelo primário, fallback automático se falhar antes do stream iniciar
          const result = await routeChatStream(agent, [
            { role: 'system', content: systemPrompt },
            ...chatMessages,
          ], { maxTokens: 4096 })

          activeModel = result.model
          if (result.usedFallback) {
            console.warn(`[oracle/chat] Usando fallback para ${agent}: ${result.model}`)
          }

          for await (const chunk of result.stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              fullContent += text
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido'
          const friendly = `Erro ao processar resposta: ${msg}. Tente novamente.`
          controller.enqueue(encoder.encode(friendly))
          fullContent = friendly
        } finally {
          // Save assistant response (best-effort)
          await supabase.from('agent_conversations').insert({
            session_id: session_id ?? null,
            job_id: job_id ?? null,
            workspace_id: profile?.workspace_id ?? null,
            agent,
            role: 'assistant',
            content: fullContent,
          }).then(() => {}, () => {})

          // Auto-save to job_outputs when job context exists
          if (job_id && fullContent && agent !== 'oracle') {
            const outputTypeMap: Partial<Record<AgentType, string>> = {
              vera: 'copy', marco: 'script', atlas: 'image_prompt', vox: 'script',
              volt: 'ads_copy', pulse: 'social_post', cipher: 'publish_plan',
              vance: 'strategy', iris: 'research', vector: 'report',
              prism: 'audience_insight', surge: 'growth_plan', anchor: 'cs_plan',
              nexus: 'client_note', harbor: 'crm_note', ledger: 'financial_report',
              aegis: 'review', bridge: 'onboarding', flux: 'automation',
              genesis: 'agent_config', lore: 'knowledge',
            }
            await supabase.from('job_outputs').insert({
              job_id,
              client_id: client_id ?? null,
              agent_id: agent,
              agent_name: AGENT_LABELS[agent],
              input_prompt: message,
              output_content: fullContent,
              output_type: outputTypeMap[agent] ?? 'text',
              status: 'pending',
            }).then(() => {}, () => {})
          }

          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Agent': agent,
        'X-Model': activeModel,
        // HTTP headers only accept ASCII (0-255) — replace em dash and strip remaining non-ASCII
        'X-Agent-Label': AGENT_LABELS[agent].replace(/\u2014/g, '-').replace(/[^\x00-\xFF]/g, '').trim(),
      },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[oracle/chat] unhandled error:', msg)
    return new Response(`Internal error: ${msg}`, { status: 500 })
  }
}
