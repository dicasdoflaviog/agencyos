import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { AgentPipeline } from '@/types/database'

export default async function PipelinesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pipelines } = await supabase
    .from('agent_pipelines')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('id, pipeline_id, status, started_at, completed_at')
    .order('started_at', { ascending: false })
    .limit(20)

  return (
    <div className="px-6 py-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Pipelines</h1>
          <p className="text-sm text-zinc-400 mt-1">Fluxos multi-agente automatizados</p>
        </div>
        <Link
          href="/pipelines/new"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          + Novo pipeline
        </Link>
      </div>

      {/* Lista de pipelines */}
      {!pipelines?.length ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-zinc-400 font-medium">Nenhum pipeline criado ainda</p>
          <p className="text-sm text-zinc-600 mt-1">
            Crie pipelines para automatizar fluxos de múltiplos agentes
          </p>
          <Link
            href="/pipelines/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Criar primeiro pipeline
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(pipelines as AgentPipeline[]).map((pipeline) => {
            const pipelineRuns = runs?.filter(r => r.pipeline_id === pipeline.id) ?? []
            const lastRun = pipelineRuns[0]
            return (
              <div
                key={pipeline.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{pipeline.name}</h3>
                    {pipeline.description && (
                      <p className="text-sm text-zinc-400 mt-0.5">{pipeline.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-zinc-500">
                        {pipeline.steps.length} {pipeline.steps.length === 1 ? 'agente' : 'agentes'}
                      </span>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500">
                        {pipelineRuns.length} execuções
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lastRun && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        lastRun.status === 'completed' ? 'text-green-400 bg-green-500/10' :
                        lastRun.status === 'running' ? 'text-blue-400 bg-blue-500/10 animate-pulse' :
                        lastRun.status === 'failed' ? 'text-red-400 bg-red-500/10' :
                        'text-zinc-400 bg-zinc-800'
                      }`}>
                        {lastRun.status}
                      </span>
                    )}
                    <Link
                      href={`/pipelines/${pipeline.id}`}
                      className="rounded-lg border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Gerenciar
                    </Link>
                  </div>
                </div>

                {/* Steps preview */}
                {pipeline.steps.length > 0 && (
                  <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                    {pipeline.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300">
                          {step.agent_id.toUpperCase()}
                        </span>
                        {i < pipeline.steps.length - 1 && (
                          <span className="text-zinc-700">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
