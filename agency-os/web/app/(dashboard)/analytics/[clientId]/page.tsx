import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ClientAnalyticsPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, niche, contract_value, contract_status, status')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const [{ data: jobs }, { data: outputs }] = await Promise.all([
    supabase.from('jobs').select('id, title, status, created_at, due_date').eq('client_id', clientId),
    supabase
      .from('job_outputs')
      .select('id, agent_name, approval_stage, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ])

  const totalOutputs = outputs?.length ?? 0
  const approvedOutputs = outputs?.filter(o => ['approved', 'published'].includes(o.approval_stage)).length ?? 0
  const approvalRate = totalOutputs > 0 ? Math.round((approvedOutputs / totalOutputs) * 100) : 0

  const activeJobs = jobs?.filter(j => !['done', 'cancelled'].includes(j.status)).length ?? 0
  const doneJobs = jobs?.filter(j => j.status === 'done').length ?? 0

  // Outputs por agente
  const byAgent: Record<string, number> = {}
  for (const o of outputs ?? []) {
    byAgent[o.agent_name] = (byAgent[o.agent_name] ?? 0) + 1
  }
  const topAgents = Object.entries(byAgent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Outputs por mês (últimos 6 meses)
  const monthCounts: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthCounts[key] = 0
  }
  for (const o of outputs ?? []) {
    const d = new Date(o.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthCounts) monthCounts[key]++
  }

  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="py-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/analytics" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Analytics
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-zinc-100">{client.name}</h1>
            {client.niche && <p className="text-sm text-zinc-400 mt-0.5">{client.niche}</p>}
          </div>
          {client.contract_value && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Contrato mensal</p>
              <p className="text-lg font-semibold text-emerald-400">
                R$ {client.contract_value.toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total de outputs" value={String(totalOutputs)} accent="violet" />
        <MetricCard label="Aprovados" value={String(approvedOutputs)} accent="emerald" />
        <MetricCard label="Taxa de aprovação" value={`${approvalRate}%`} accent="amber" />
        <MetricCard label="Jobs ativos" value={String(activeJobs)} accent="blue" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Outputs por mês */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Outputs por mês</h3>
          <div className="flex items-end gap-2 h-24">
            {Object.entries(monthCounts).map(([key, count]) => {
              const maxCount = Math.max(...Object.values(monthCounts), 1)
              const pct = (count / maxCount) * 100
              const month = parseInt(key.split('-')[1]) - 1
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-500">{count || ''}</span>
                  <div className="w-full bg-zinc-800 rounded-sm" style={{ height: '72px' }}>
                    <div
                      className="w-full bg-violet-500 rounded-sm transition-all"
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-600">{monthLabels[month]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top agentes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Agentes usados</h3>
          {topAgents.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum output gerado ainda</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map(([name, count]) => {
                const max = topAgents[0][1]
                const pct = (count / max) * 100
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>{name}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Jobs */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Jobs</h3>
            <span className="text-xs text-zinc-500">{doneJobs} concluídos de {jobs?.length ?? 0}</span>
          </div>
          {!jobs?.length ? (
            <p className="text-sm text-zinc-500">Nenhum job ainda</p>
          ) : (
            <div className="space-y-2">
              {jobs.slice(0, 10).map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-lg p-2.5 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-sm text-zinc-300">{job.title}</span>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[accent] ?? 'text-zinc-100'}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    backlog: 'text-zinc-400 bg-zinc-800',
    in_progress: 'text-blue-400 bg-blue-500/10',
    review: 'text-yellow-400 bg-yellow-500/10',
    done: 'text-green-400 bg-green-500/10',
    cancelled: 'text-red-400 bg-red-500/10',
  }
  const labels: Record<string, string> = {
    backlog: 'Backlog',
    in_progress: 'Em andamento',
    review: 'Revisão',
    done: 'Concluído',
    cancelled: 'Cancelado',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'text-zinc-400 bg-zinc-800'}`}>
      {labels[status] ?? status}
    </span>
  )
}
