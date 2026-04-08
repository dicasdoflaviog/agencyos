import 'server-only'
import type OpenAI from 'openai'
import { openrouter } from './client'
import { createAdminClient } from '@/lib/supabase/admin'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type AgentCategory = 'elite' | 'visual' | 'production' | 'infra'

export interface ModelConfig {
  model: string
  fallback: string   // sempre definido — todo agente tem fallback
  category: AgentCategory
}

export type ChatMessages = OpenAI.ChatCompletionMessageParam[]

// ─────────────────────────────────────────────────────────────────────────────
// MAPA DE AGENTES → MODELO + FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
//
//  ELITE      → Claude Sonnet  (raciocínio estratégico complexo)
//  VISUAL     → GPT-4o-mini    (visão: análise de imagens, art direction)
//  PRODUCTION → Qwen free      (volume de texto — custo zero)
//               fallback: GPT-4o-mini se Qwen estiver instável
//  INFRA      → GPT-4o-mini    (extração técnica, classificação, embeddings)
//               fallback: Claude Haiku (se gpt-4o-mini indisponível)
//
// Geração de IMAGEM (atlas/generate, atlas/generate-v2) NÃO passa pelo router
// pois o OpenRouter não roteia /v1/images/generations. As rotas de imagem
// mantêm chamada direta à API Gemini.

const FALLBACK_PAID = 'openai/gpt-4o-mini'
const FALLBACK_ELITE = 'anthropic/claude-haiku-4-5'

export const AGENT_CONFIG: Record<string, ModelConfig> = {
  // ── ELITE — raciocínio estratégico ───────────────────────────────────────
  oracle:  { model: 'anthropic/claude-sonnet-4-5', fallback: FALLBACK_ELITE,   category: 'elite'      },
  genesis: { model: 'anthropic/claude-sonnet-4-5', fallback: FALLBACK_ELITE,   category: 'elite'      },
  lore:    { model: 'anthropic/claude-sonnet-4-5', fallback: FALLBACK_ELITE,   category: 'elite'      },
  vance:   { model: 'anthropic/claude-sonnet-4-5', fallback: FALLBACK_ELITE,   category: 'elite'      },

  // ── VISUAL — compreensão de imagens + art direction ──────────────────────
  atlas:   { model: 'openai/gpt-4o-mini',          fallback: FALLBACK_ELITE,   category: 'visual'     },

  // ── PRODUCTION — texto em volume (custo zero com fallback pago) ──────────
  vera:    { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  marco:   { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  volt:    { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  pulse:   { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  cipher:  { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  flux:    { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  nexus:   { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  vox:     { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  prism:   { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  bridge:  { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  harbor:  { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  surge:   { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },
  anchor:  { model: 'qwen/qwen3-235b-a22b:free',   fallback: FALLBACK_PAID,    category: 'production' },

  // ── INFRA — extração técnica, dados, análise ─────────────────────────────
  iris:        { model: 'openai/gpt-4o-mini',      fallback: FALLBACK_ELITE,   category: 'infra'      },
  vector:      { model: 'openai/gpt-4o-mini',      fallback: FALLBACK_ELITE,   category: 'infra'      },
  aegis:       { model: 'openai/gpt-4o-mini',      fallback: FALLBACK_ELITE,   category: 'infra'      },
  ledger:      { model: 'openai/gpt-4o-mini',      fallback: FALLBACK_ELITE,   category: 'infra'      },
  dna:         { model: 'openai/gpt-4o-mini',      fallback: FALLBACK_ELITE,   category: 'infra'      },
  knowledge:   { model: 'openai/gpt-4o-mini',      fallback: FALLBACK_ELITE,   category: 'infra'      },
  classifier:  { model: 'google/gemma-3-4b-it:free', fallback: FALLBACK_PAID,  category: 'infra'      },
}

// ─────────────────────────────────────────────────────────────────────────────
// RASTREIO DE CUSTO REAL VIA OPENROUTER GENERATION ENDPOINT
// Fire-and-forget — nunca bloqueia a resposta ao usuário
// ─────────────────────────────────────────────────────────────────────────────

const CREDITS_PER_DOLLAR = 1000 // $1 USD = 1000 créditos internos

async function trackCostAsync(generationId: string, workspaceId: string, model: string): Promise<void> {
  try {
    // OpenRouter retorna custo real via endpoint de geração
    const res = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${generationId}`,
      { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } },
    )
    if (!res.ok) return

    const json = await res.json() as { data?: { total_cost?: number; tokens_prompt?: number; tokens_completion?: number } }
    const costUsd = json.data?.total_cost
    if (!costUsd || costUsd <= 0) return

    const credits = Math.ceil(costUsd * CREDITS_PER_DOLLAR)
    const admin = createAdminClient()

    const { data: ws } = await admin
      .from('workspaces')
      .select('credit_balance')
      .eq('id', workspaceId)
      .single()

    if (!ws) return

    const newBalance = Math.max(0, (ws.credit_balance as number) - credits)

    await Promise.all([
      admin
        .from('workspaces')
        .update({ credit_balance: newBalance })
        .eq('id', workspaceId),
      admin.from('credit_transactions').insert({
        workspace_id: workspaceId,
        amount: -credits,
        type: 'api_usage',
        description: `OpenRouter ${model} — ${json.data?.tokens_prompt ?? 0}in/${json.data?.tokens_completion ?? 0}out tokens ($${costUsd.toFixed(6)})`,
        balance_after: newBalance,
      }),
    ])
  } catch {
    /* rastreio de custo é melhor-esforço — nunca falha silenciosamente o usuário */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER PRINCIPAL — chamadas não-streaming
// ─────────────────────────────────────────────────────────────────────────────

interface RouteOptions {
  maxTokens?: number
  workspaceId?: string  // se fornecido, rastreia custo real
}

interface RouteResult {
  content: string
  model: string
  usedFallback: boolean
}

export async function routeChat(
  agentId: string,
  messages: ChatMessages,
  options: RouteOptions = {},
): Promise<RouteResult> {
  const config = AGENT_CONFIG[agentId] ?? AGENT_CONFIG.oracle
  const { maxTokens = 2048, workspaceId } = options

  const attempt = async (model: string, isFallback: boolean): Promise<RouteResult> => {
    const res = await openrouter.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages,
    })

    // Rastreia custo real de forma assíncrona (não bloqueia)
    if (workspaceId && res.id) {
      trackCostAsync(res.id, workspaceId, model).catch(() => {})
    }

    return {
      content: res.choices[0]?.message?.content ?? '',
      model,
      usedFallback: isFallback,
    }
  }

  try {
    return await attempt(config.model, false)
  } catch (primaryErr) {
    console.warn(
      `[IntelligenceRouter] Primário falhou (${config.model} → ${agentId}):`,
      primaryErr instanceof Error ? primaryErr.message : primaryErr,
    )

    try {
      return await attempt(config.fallback, true)
    } catch (fallbackErr) {
      // Ambos falharam — lança erro claro
      throw new Error(
        `[IntelligenceRouter] Primário (${config.model}) e fallback (${config.fallback}) falharam para ${agentId}. ` +
        `Último erro: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
      )
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER DE STREAMING — retorna AsyncIterable de chunks
// Fallback acontece ANTES de iniciar o stream (se o modelo rejeitar o create)
// Uma vez que o stream começa, não é possível trocar de modelo mid-stream
// ─────────────────────────────────────────────────────────────────────────────

export async function routeChatStream(
  agentId: string,
  messages: ChatMessages,
  options: { maxTokens?: number } = {},
): Promise<{
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  model: string
  usedFallback: boolean
}> {
  const config = AGENT_CONFIG[agentId] ?? AGENT_CONFIG.oracle
  const maxTokens = options.maxTokens ?? 4096

  const createStream = async (model: string) =>
    openrouter.chat.completions.create({
      model,
      max_tokens: maxTokens,
      stream: true as const,
      messages,
    })

  try {
    const stream = await createStream(config.model)
    return { stream, model: config.model, usedFallback: false }
  } catch (primaryErr) {
    console.warn(
      `[IntelligenceRouter] Stream primário falhou (${config.model} → ${agentId}):`,
      primaryErr instanceof Error ? primaryErr.message : primaryErr,
    )

    try {
      const stream = await createStream(config.fallback)
      return { stream, model: config.fallback, usedFallback: true }
    } catch (fallbackErr) {
      throw new Error(
        `[IntelligenceRouter] Stream falhou para primário (${config.model}) e fallback (${config.fallback}) em ${agentId}. ` +
        `Último erro: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
      )
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRATOR DE TOKENS DO STYLEGUIDE
// Lê o HTML do cliente e extrai variáveis CSS: cores, fontes, radius
// Usado pelo ORACLE ao rotear para ATLAS — injeta no system prompt
// ─────────────────────────────────────────────────────────────────────────────

export interface StyleguideTokens {
  colors: Record<string, string>
  fonts: Record<string, string>
  radii: Record<string, string>
  raw: string
}

export function extractStyleguideTokens(htmlContent: string): StyleguideTokens {
  const colors: Record<string, string> = {}
  const fonts: Record<string, string> = {}
  const radii: Record<string, string> = {}

  // Extrai bloco :root { ... }
  const rootMatch = htmlContent.match(/:root\s*\{([^}]+)\}/)
  const rootBlock = rootMatch?.[1] ?? ''

  for (const line of rootBlock.split('\n')) {
    const varMatch = line.match(/--([^:]+):\s*([^;]+);/)
    if (!varMatch) continue
    const [, name, value] = varMatch
    const key = name.trim()
    const val = value.trim()

    if (key.match(/color|bg|background|text|foreground|accent|primary|secondary|muted|border/i)) {
      colors[`--${key}`] = val
    } else if (key.match(/font|family|typeface/i)) {
      fonts[`--${key}`] = val
    } else if (key.match(/radius|rounded|corner/i)) {
      radii[`--${key}`] = val
    }
  }

  // Também captura hex soltos (#xxxxxx) se :root estiver vazio
  if (Object.keys(colors).length === 0) {
    const hexMatches = htmlContent.matchAll(/(#[0-9a-fA-F]{3,8})/g)
    const seen = new Set<string>()
    let i = 0
    for (const [, hex] of hexMatches) {
      if (!seen.has(hex)) {
        seen.add(hex)
        colors[`color-${i++}`] = hex
        if (i >= 10) break
      }
    }
  }

  // Monta resumo legível para injetar no prompt
  const lines: string[] = ['## Design Tokens do Cliente']
  if (Object.keys(colors).length) {
    lines.push('\n### Paleta de Cores')
    for (const [k, v] of Object.entries(colors)) lines.push(`  ${k}: ${v}`)
  }
  if (Object.keys(fonts).length) {
    lines.push('\n### Tipografia')
    for (const [k, v] of Object.entries(fonts)) lines.push(`  ${k}: ${v}`)
  }
  if (Object.keys(radii).length) {
    lines.push('\n### Border Radius')
    for (const [k, v] of Object.entries(radii)) lines.push(`  ${k}: ${v}`)
  }

  return { colors, fonts, radii, raw: lines.join('\n') }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

export function getModelForAgent(agentId: string): string {
  return AGENT_CONFIG[agentId]?.model ?? AGENT_CONFIG.oracle.model
}

export function getCategoryForAgent(agentId: string): AgentCategory {
  return AGENT_CONFIG[agentId]?.category ?? 'elite'
}

// ─────────────────────────────────────────────────────────────────────────────
// ATLAS IMAGE GENERATION — via OpenRouter /chat/completions + modalities
// ─────────────────────────────────────────────────────────────────────────────

/** Converte data URL, URL externa ou base64 puro → { imageBase64, mimeType } */
async function resolveRawImage(raw: string): Promise<{ imageBase64: string; mimeType: string }> {
  if (raw.startsWith('data:')) {
    // Divide apenas no primeiro ',' (base64 não contém vírgulas mas por segurança)
    const commaIdx = raw.indexOf(',')
    const header   = raw.slice(0, commaIdx)
    const base64   = raw.slice(commaIdx + 1).replace(/\s/g, '') // remove quebras de linha
    const mimeType = header.match(/data:(.*);base64/)?.[1] ?? 'image/png'
    return { imageBase64: base64, mimeType }
  }
  if (raw.startsWith('http')) {
    const r = await fetch(raw)
    if (!r.ok) throw new Error(`[ATLAS] Falha ao buscar imagem externa: ${r.status}`)
    const buf = await r.arrayBuffer()
    return { imageBase64: Buffer.from(buf).toString('base64'), mimeType: r.headers.get('content-type') ?? 'image/png' }
  }
  // base64 puro — remover whitespace por segurança
  return { imageBase64: raw.replace(/\s/g, ''), mimeType: 'image/png' }
}

const ATLAS_MODEL_PRIMARY  = 'google/gemini-2.5-flash-image'
const ATLAS_MODEL_FALLBACK = 'google/gemini-3.1-flash-image-preview'

export async function generateImage({
  prompt,
  aspectRatio = '1:1',
}: {
  prompt: string
  aspectRatio?: string
}): Promise<{ imageBase64: string; mimeType: string; usedFallback: boolean }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('[ATLAS] OPENROUTER_API_KEY não configurada')

  const callOpenRouter = async (model: string): Promise<{ imageBase64: string; mimeType: string }> => {
    // /chat/completions com modalities:["text","image"] — formato correto para Gemini image no OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agencyos-cyan.vercel.app',
        'X-Title': 'Agency OS ATLAS',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image'],
        image_config: { aspect_ratio: aspectRatio },
      }),
    })

    const responseText = await response.text()
    console.log(`[ATLAS] ${model} status=${response.status} body=${responseText.slice(0, 600)}`)

    if (!response.ok) {
      throw new Error(`[ATLAS] OpenRouter ${model} falhou: ${responseText.slice(0, 300)}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: { choices?: Array<{ message?: { content?: string | any[]; images?: any[] } }> }
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`[ATLAS] OpenRouter ${model} resposta inválida: ${responseText.slice(0, 300)}`)
    }

    const message = data?.choices?.[0]?.message

    // 1) images[] — pode ser string ou { url } ou { b64_json }
    const imgs = message?.images
    if (Array.isArray(imgs) && imgs.length > 0) {
      const img = imgs[0]
      const raw = typeof img === 'string' ? img : ((img as { url?: string }).url ?? (img as { b64_json?: string }).b64_json)
      if (raw) return resolveRawImage(raw)
    }

    // 2) content string
    if (typeof message?.content === 'string' && message.content) {
      return resolveRawImage(message.content)
    }

    // 3) content array — [{ type:'image_url', image_url:{ url } }]
    if (Array.isArray(message?.content)) {
      const parts = message.content as Array<{ type: string; image_url?: { url: string } }>
      const imgPart = parts.find(p => p.type === 'image_url')
      if (imgPart?.image_url?.url) return resolveRawImage(imgPart.image_url.url)
    }

    throw new Error(`[ATLAS] Nenhuma imagem retornada. Resposta: ${responseText.slice(0, 400)}`)
  }

  try {
    const result = await callOpenRouter(ATLAS_MODEL_PRIMARY)
    return { ...result, usedFallback: false }
  } catch (primaryErr) {
    console.warn('[ATLAS] Primário falhou, tentando fallback:', primaryErr instanceof Error ? primaryErr.message : primaryErr)
    try {
      const result = await callOpenRouter(ATLAS_MODEL_FALLBACK)
      return { ...result, usedFallback: true }
    } catch (fallbackErr) {
      throw new Error(
        `[ATLAS] Primário (${ATLAS_MODEL_PRIMARY}) e fallback (${ATLAS_MODEL_FALLBACK}) falharam. ` +
        `Último erro: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
      )
    }
  }
}
