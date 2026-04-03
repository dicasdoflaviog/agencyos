import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic/client'
import { AGENTS, getSystemPrompt, type AgentId } from '@/lib/anthropic/agents'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    agentId: AgentId
    jobId: string
    clientId: string
    userMessage: string
  }
  const { agentId, jobId, clientId, userMessage } = body

  if (!agentId || !jobId || !clientId || !userMessage?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [{ data: client }, { data: job }] = await Promise.all([
    supabase.from('clients').select('name, niche').eq('id', clientId).single(),
    supabase.from('jobs').select('title, description').eq('id', jobId).single(),
  ])

  const contextBlock = client && job
    ? `CONTEXTO DO JOB:\nCliente: ${client.name} | Nicho: ${client.niche ?? 'não definido'}\nJob: ${job.title}${job.description ? ` — ${job.description}` : ''}\n\n`
    : ''

  const systemPrompt = getSystemPrompt(agentId)
  const agent = AGENTS[agentId]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: contextBlock + userMessage }],
  })

  const outputContent = message.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('\n')

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

  return NextResponse.json({ outputId: savedOutput.id, content: outputContent, agentName: agent.name })
}
