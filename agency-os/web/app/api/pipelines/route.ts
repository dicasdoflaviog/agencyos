import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AGENTS, getSystemPrompt, type AgentId } from '@/lib/anthropic/agents'
import { anthropic } from '@/lib/anthropic/client'

type PipelineStep = {
  order: number
  agent_id: string
  instruction_template: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { pipelineId: string; jobId: string }
  const { pipelineId, jobId } = body

  if (!pipelineId || !jobId) {
    return NextResponse.json({ error: 'Missing pipelineId or jobId' }, { status: 400 })
  }

  // Buscar pipeline
  const { data: pipeline } = await supabase
    .from('agent_pipelines')
    .select('*')
    .eq('id', pipelineId)
    .single()

  if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })

  // Buscar job + cliente + briefing
  const [{ data: job }, { data: briefing }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(id, name, niche)').eq('id', jobId).single(),
    supabase.from('job_briefings').select('*').eq('job_id', jobId).maybeSingle(),
  ])

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Criar pipeline run
  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({
      pipeline_id: pipelineId,
      job_id: jobId,
      status: 'running',
      current_step: 0,
      results: [],
      started_by: user.id,
    })
    .select()
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }

  // Montar contexto base
  const client = Array.isArray(job.client) ? job.client[0] : job.client
  let baseContext = `## CONTEXTO DO JOB\nCliente: ${client?.name ?? 'N/A'}${client?.niche ? ` | Nicho: ${client.niche}` : ''}\nJob: ${job.title}${job.description ? ` — ${job.description}` : ''}`

  if (briefing) {
    baseContext += `\n\nBRIEFING:`
    if (briefing.content_type)    baseContext += `\n  Tipo: ${briefing.content_type}`
    if (briefing.objective)       baseContext += `\n  Objetivo: ${briefing.objective}`
    if (briefing.target_audience) baseContext += `\n  Público: ${briefing.target_audience}`
    if (briefing.key_message)     baseContext += `\n  Mensagem: ${briefing.key_message}`
    if (briefing.tone)            baseContext += `\n  Tom: ${briefing.tone}`
  }

  const steps: PipelineStep[] = pipeline.steps ?? []
  const results = []
  let previousOutput = ''

  // Executar steps sequencialmente
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const agentId = step.agent_id as AgentId
    const agent = AGENTS[agentId]

    if (!agent) continue

    // Interpolar template com variáveis do job
    const instruction = step.instruction_template
      .replace('{job_title}', job.title)
      .replace('{client_name}', client?.name ?? '')
      .replace('{previous_output}', previousOutput)

    const userContent = `${baseContext}\n\n---\n\n${instruction}`

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: getSystemPrompt(agentId),
        messages: [{ role: 'user', content: userContent }],
      })

      const content = message.content
        .filter((b) => b.type === 'text')
        .map((b) => ('text' in b ? b.text : ''))
        .join('\n')

      // Salvar output
      const { data: savedOutput } = await supabase
        .from('job_outputs')
        .insert({
          job_id: jobId,
          client_id: job.client_id,
          agent_id: agentId,
          agent_name: agent.name,
          input_prompt: instruction,
          output_content: content,
          output_type: 'text',
          status: 'pending',
          approval_stage: 'draft',
        })
        .select('id')
        .single()

      const result = {
        step: i + 1,
        agent_id: agentId,
        output_id: savedOutput?.id ?? '',
        content_preview: content.slice(0, 200),
        completed_at: new Date().toISOString(),
      }

      results.push(result)
      previousOutput = content

      // Atualizar progresso do run
      await supabase
        .from('pipeline_runs')
        .update({ current_step: i + 1, results })
        .eq('id', run.id)

    } catch (err) {
      await supabase
        .from('pipeline_runs')
        .update({ status: 'failed', error_message: String(err), results })
        .eq('id', run.id)

      return NextResponse.json({ error: 'Pipeline failed at step ' + (i + 1), run_id: run.id }, { status: 500 })
    }
  }

  // Finalizar run
  await supabase
    .from('pipeline_runs')
    .update({ status: 'completed', results, completed_at: new Date().toISOString() })
    .eq('id', run.id)

  // Notificação de conclusão
  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'pipeline_complete',
    title: `Pipeline "${pipeline.name}" concluído`,
    body: `${steps.length} agentes executados com sucesso`,
    link: `/jobs/${jobId}`,
    metadata: { pipeline_id: pipelineId, run_id: run.id, job_id: jobId },
  })

  return NextResponse.json({ success: true, run_id: run.id, results })
}
