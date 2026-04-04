import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const ORACLE_SYSTEM = `Você é o ORACLE, o Diretor de IA da agência. Você orquestra os agentes VERA (copy) e ATLAS (design).
Quando o usuário pedir textos, copies ou conteúdo escrito → você aciona o VERA.
Quando o usuário pedir designs, criativos, imagens ou peças visuais → você aciona o ATLAS.
Responda sempre em português, de forma direta e profissional.
Ao acionar um agente, indique claramente: [VERA] ou [ATLAS] no início da resposta delegada.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message, job_id, history = [] } = await req.json() as {
    message: string
    job_id?: string
    history?: { role: string; content: string }[]
  }

  const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single()

  // Save user message
  await supabase.from('agent_conversations').insert({
    job_id: job_id || null,
    workspace_id: profile?.workspace_id,
    agent: 'oracle',
    role: 'user',
    content: message,
  })

  const messages = [
    { role: 'system' as const, content: ORACLE_SYSTEM },
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: message },
  ]

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
    max_tokens: 1500,
  })

  let fullContent = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        fullContent += delta
        controller.enqueue(encoder.encode(delta))
      }

      // Save assistant response
      await supabase.from('agent_conversations').insert({
        job_id: job_id || null,
        workspace_id: profile?.workspace_id,
        agent: 'oracle',
        role: 'assistant',
        content: fullContent,
      })

      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
