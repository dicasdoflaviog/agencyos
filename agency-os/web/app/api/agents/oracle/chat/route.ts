import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ORACLE_SYSTEM = `Você é o ORACLE, o Diretor de IA da agência. Você orquestra os agentes VERA (copy) e ATLAS (design).
Quando o usuário pedir textos, copies ou conteúdo escrito → você aciona o VERA.
Quando o usuário pedir designs, criativos, imagens ou peças visuais → você aciona o ATLAS.
Responda sempre em português, de forma direta e profissional.
Ao acionar um agente, indique claramente: [VERA] ou [ATLAS] no início da resposta delegada.`

interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return new Response('GEMINI_API_KEY not configured', { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message, job_id, history = [] } = await req.json() as {
    message: string
    job_id?: string
    history?: { role: string; content: string }[]
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  await supabase.from('agent_conversations').insert({
    job_id: job_id ?? null,
    workspace_id: profile?.workspace_id,
    agent: 'oracle',
    role: 'user',
    content: message,
  })

  // Build Gemini-format conversation history
  const contents: GeminiContent[] = [
    ...history.map((h) => ({
      role: (h.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: h.content }],
    })),
    { role: 'user' as const, parts: [{ text: message }] },
  ]

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: ORACLE_SYSTEM }] },
        contents,
        generationConfig: { maxOutputTokens: 1500 },
      }),
    },
  )

  if (!geminiRes.ok || !geminiRes.body) {
    const errText = await geminiRes.text()
    return new Response(`Gemini error: ${errText}`, { status: 502 })
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
        await supabase.from('agent_conversations').insert({
          job_id: job_id ?? null,
          workspace_id: profile?.workspace_id,
          agent: 'oracle',
          role: 'assistant',
          content: fullContent,
        })
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
