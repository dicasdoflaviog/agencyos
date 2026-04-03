import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { AGENTS } from '@/lib/anthropic/agents-config'
import type { AgentPipeline, PipelineRun } from '@/types/database'

const STATUS_CONFIG = {
  completed: { label: 'Concluído', cls: 'text-green-400 bg-green-500/10' },
  running:   { label: 'Executando', cls: 'text-blue-400 bg-blue-500/10 animate-pulse' },
  failed:    { label: 'Falhou', cls: 'text-red-400 bg-red-500/10' },
  paused:    { label: 'Pausado', cls: 'text-yellow-400 bg-yellow-500/10' },
}

export default async function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: pipeline }, { data: runs }] = await Promise.all([
    supabase.from('agent_pipelines').select('*').eq('id', id).single(),
    supabase
      .from('pipeline_runs')
      .select('*, job:jobs(id,title)')
      .eq('pipeline_id', id)
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  if (!pipeline) notFound()

  const p = pipeline as AgentPipeline

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/pipelines" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              ← Pipelines
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">{p.name}</h1>
          {p.description && <p className="text-sm text-zinc-400 mt-1">{p.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/pipelines/${id}/edit`}
            className="rounded-lg border border-zinc-700 hover:border-zinc-500 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">
          Sequência de agentes ({p.steps.length})
        </h2>
        <div className="space-y-3">
          {p.steps.map((step, i) => {
            const agent = AGENTS[step.agent_id as keyof typeof AGENTS]
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  {i < p.steps.length - 1 && (
                    <div className="w-px h-4 bg-zinc-700 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-200">
                      {agent?.name ?? step.agent_id.toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-500">{agent?.role}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{step.instruction_template}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Histórico de execuções */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">
          Histórico de execuções ({runs?.length ?? 0})
        </h2>
        {!runs?.length ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-sm text-zinc-500">Nenhuma execução ainda</p>
            <p className="text-xs text-zinc-600 mt-1">
              Execute este pipeline em um job para ver o histórico aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(runs as PipelineRun[]).map((run) => {
              const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.failed
              return (
                <div key={run.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    <span className="text-sm text-zinc-300">
                      {(run as any).job?.title ?? 'Job removido'}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {run.results.length} steps concluídos
                    </span>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(run.started_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
