import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type AgentType } from '@/types/agents'

export const dynamic = 'force-dynamic'

// ── Agent identities ────────────────────────────────────────────────────────

const CLASSIFIER_PROMPT = `Você é um classificador de intenções. Analise a mensagem e retorne APENAS uma das palavras:
- "vera"   → copy, texto, legenda, caption, headline, email, roteiro escrito, descrição
- "atlas"  → design, criativo, imagem, visual, artes, post, banner, carrossel, thumbnail
- "vox"    → áudio, narração, podcast, locutor, voice over, voz, fala
- "oracle" → estratégia, análise, planejamento, briefing, dúvida, pergunta geral

Mensagem: "{message}"
Responda APENAS com uma palavra (vera, atlas, vox ou oracle).`

const AGENT_SYSTEMS: Record<AgentType, string> = {
  oracle: `Você é o ORACLE, Diretor de IA estratégico de uma agência de marketing. Você orquestra agentes especializados (VERA para copy, ATLAS para design, VOX para áudio). Responda sempre em português, de forma direta e estratégica. Analise, planeje e entregue insights acionáveis.`,

  vera: `Você é a VERA, Copywriter especialista da agência. Crie textos persuasivos, legendas para Instagram, copies para anúncios, headlines e CTAs. Sempre em português do Brasil, tom próximo e engajador. Entregue o copy pronto para uso, sem explicações desnecessárias. Formate bem o texto com quebras de linha.`,

  atlas: `Você é o ATLAS, Diretor de Arte da agência. Crie prompts detalhados em inglês para geração de imagens com IA (Midjourney/Stable Diffusion/Gemini). Descreva estilo visual, composição, cores, iluminação, mood. Além do prompt, explique brevemente a proposta criativa em português.`,

  vox: `Você é o VOX, Produtor de Conteúdo de Áudio da agência. Escreva roteiros e scripts prontos para narração em áudio. Use linguagem falada natural, com ritmo adequado para narração. Indique pausas com [...] e ênfases com *palavra*. Entregue o script completo.`,
}

const AGENT_LABELS: Record<AgentType, string> = {
  oracle: 'ORACLE',
  vera: 'VERA — Copywriter',
  atlas: 'ATLAS — Design',
  vox: 'VOX — Áudio',
}
import { type GeminiContent, type GeminiStreamChunk } from '@/types/gemini'

async function classifyIntent(message: string, apiKey: string): Promise<AgentType> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: CLASSIFIER_PROMPT.replace('{message}', message) }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 },
        }),
      }
    )
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? 'oracle'
    if (['vera', 'atlas', 'vox', 'oracle'].includes(text)) return text as AgentType
  } catch { /* fallback to oracle */ }
  return 'oracle'
}

// ── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return new Response('GEMINI_API_KEY not configured', { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message, job_id, client_id, history = [] } = await req.json() as {
    message: string
    job_id?: string
    client_id?: string
    history?: { role: string; content: string }[]
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  // Classify intent in parallel with saving user message
  const [agent] = await Promise.all([
    classifyIntent(message, apiKey),
    supabase.from('agent_conversations').insert({
      job_id: job_id ?? null,
      workspace_id: profile?.workspace_id,
      agent: 'oracle',
      role: 'user',
      content: message,
    }),
  ])

  // Load client DNA context if client_id provided
  let dnaContext = ''
  if (client_id) {
    const { data: dna } = await supabase
      .from('client_dna')
      .select('brand_name, brand_voice, target_audience, key_messages, visual_style')
      .eq('client_id', client_id)
      .maybeSingle()
    if (dna) {
      dnaContext = `\n\nCONTEXTO DO CLIENTE:\n- Marca: ${dna.brand_name ?? ''}\n- Voz da Marca: ${dna.brand_voice ?? ''}\n- Público-alvo: ${dna.target_audience ?? ''}\n- Mensagens-chave: ${dna.key_messages ?? ''}\n- Estilo Visual: ${dna.visual_style ?? ''}`
    }
  }

  const systemPrompt = AGENT_SYSTEMS[agent] + dnaContext

  const contents: GeminiContent[] = [
    ...history.slice(-10).map((h) => ({
      role: (h.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: h.content }],
    })),
    { role: 'user' as const, parts: [{ text: message }] },
  ]

  const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']
  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: 2000 },
  })

  let geminiRes: Response | null = null
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }
    )
    if (res.ok && res.body) { geminiRes = res; break }
    // Only continue to next model on quota/rate-limit errors
    if (res.status !== 429 && res.status !== 503) {
      const errText = await res.text()
      return new Response(`⚠️ Gemini error: ${errText}`, { status: 502 })
    }
  }

  if (!geminiRes || !geminiRes.body) {
    const friendly = 'A IA está temporariamente indisponível (cota de uso atingida). Por favor, tente novamente em alguns minutos ou verifique seu plano em https://ai.google.dev'
    return new Response(
      `data: ${JSON.stringify({ type: 'text', text: friendly })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream', 'X-Agent': agent } }
    )
  }

  const reader = geminiRes.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let fullContent = ''
  let buffer = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const json = line.slice(6).trim()
            if (!json || json === '[DONE]') continue
            try {
              const parsed = JSON.parse(json) as GeminiStreamChunk
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
              if (text) {
                fullContent += text
                controller.enqueue(encoder.encode(text))
              }
            } catch { /* skip malformed SSE chunks */ }
          }
        }
      } finally {
        // Save assistant response
        await supabase.from('agent_conversations').insert({
          job_id: job_id ?? null,
          workspace_id: profile?.workspace_id,
          agent,
          role: 'assistant',
          content: fullContent,
        })

        // Auto-save to job_outputs gallery when job context exists
        if (job_id && fullContent && agent !== 'oracle') {
          const outputTypeMap: Record<AgentType, string> = {
            vera: 'copy', atlas: 'image_prompt', vox: 'script', oracle: 'strategy',
          }
          await supabase.from('job_outputs').insert({
            job_id,
            client_id: client_id ?? null,
            agent_id: agent,
            agent_name: AGENT_LABELS[agent],
            input_prompt: message,
            output_content: fullContent,
            output_type: outputTypeMap[agent],
            status: 'pending',
          })
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
      'X-Agent-Label': AGENT_LABELS[agent],
    },
  })
}

