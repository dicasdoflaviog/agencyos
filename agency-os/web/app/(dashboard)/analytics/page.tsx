import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Métricas gerais
  const [
    { data: clients },
    { data: jobs },
    { data: outputs },
    { data: contracts },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, logo_url, status').eq('status', 'active'),
    supabase.from('jobs').select('id, status, client_id, created_at'),
    supabase.from('job_outputs').select('id, approval_stage, agent_id, agent_name, client_id, created_at'),
    supabase.from('clients').select('contract_value').eq('contract_status', 'active'),
  ])

  const mrr = contracts?.reduce((sum, c) => sum + (c.contract_value ?? 0), 0) ?? 0

  // Outputs dos últimos 30 dias
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentOutputs = outputs?.filter(o => new Date(o.created_at) >= thirtyDaysAgo) ?? []

  const totalOutputs = outputs?.length ?? 0
  const approvedOutputs = outputs?.filter(o => ['approved', 'published'].includes(o.approval_stage)).length ?? 0
  const approvalRate = totalOutputs > 0 ? Math.round((approvedOutputs / totalOutputs) * 100) : 0

  // Top agentes
  const agentCounts: Record<string, { name: string; count: number }> = {}
  for (const o of outputs ?? []) {
    if (!agentCounts[o.agent_id]) agentCounts[o.agent_id] = { name: o.agent_name, count: 0 }
    agentCounts[o.agent_id].count++
  }
  const topAgents = Object.values(agentCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Jobs por status
  const jobsByStatus = {
    backlog: jobs?.filter(j => j.status === 'backlog').length ?? 0,
    in_progress: jobs?.filter(j => j.status === 'in_progress').length ?? 0,
    review: jobs?.filter(j => j.status === 'review').length ?? 0,
    done: jobs?.filter(j => j.status === 'done').length ?? 0,
  }

  // Outputs por estágio
  const outputsByStage = {
    draft: outputs?.filter(o => o.approval_stage === 'draft').length ?? 0,
    internal_review: outputs?.filter(o => o.approval_stage === 'internal_review').length ?? 0,
    client_review: outputs?.filter(o => o.approval_stage === 'client_review').length ?? 0,
    approved: outputs?.filter(o => o.approval_stage === 'approved').length ?? 0,
    published: outputs?.filter(o => o.approval_stage === 'published').length ?? 0,
    rejected: outputs?.filter(o => o.approval_stage === 'rejected').length ?? 0,
  }

  return (
    <div className="px-6 py-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">Visão geral da operação da agência</p>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={`R$ ${mrr.toLocaleString('pt-BR')}`} sub="contratos ativos" accent="violet" />
        <MetricCard label="Clientes ativos" value={String(clients?.length ?? 0)} sub="em produção" accent="blue" />
        <MetricCard label="Outputs (30d)" value={String(recentOutputs.length)} sub="últimos 30 dias" accent="emerald" />
        <MetricCard label="Taxa de aprovação" value={`${approvalRate}%`} sub={`${approvedOutputs}/${totalOutputs} outputs`} accent="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Jobs por status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Jobs por status</h3>
          <div className="space-y-3">
            {[
              { label: 'Backlog', value: jobsByStatus.backlog, color: 'bg-zinc-600' },
              { label: 'Em andamento', value: jobsByStatus.in_progress, color: 'bg-blue-500' },
              { label: 'Revisão', value: jobsByStatus.review, color: 'bg-yellow-500' },
              { label: 'Concluído', value: jobsByStatus.done, color: 'bg-green-500' },
            ].map((item) => {
              const total = Object.values(jobsByStatus).reduce((a, b) => a + b, 0)
              const pct = total > 0 ? (item.value / total) * 100 : 0
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top agentes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Agentes mais utilizados</h3>
          {topAgents.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum output gerado ainda</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map((agent, i) => {
                const maxCount = topAgents[0].count
                const pct = (agent.count / maxCount) * 100
                return (
                  <div key={agent.name} className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-600">#{i + 1}</span>
                        {agent.name}
                      </span>
                      <span>{agent.count} outputs</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Outputs por estágio */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Pipeline de aprovação</h3>
          <div className="space-y-2">
            {[
              { label: 'Rascunho', value: outputsByStage.draft, color: 'text-zinc-400' },
              { label: 'Revisão interna', value: outputsByStage.internal_review, color: 'text-yellow-400' },
              { label: 'Revisão do cliente', value: outputsByStage.client_review, color: 'text-blue-400' },
              { label: 'Aprovado', value: outputsByStage.approved, color: 'text-green-400' },
              { label: 'Publicado', value: outputsByStage.published, color: 'text-violet-400' },
              { label: 'Rejeitado', value: outputsByStage.rejected, color: 'text-red-400' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className={item.color}>{item.label}</span>
                <span className="text-zinc-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Clientes ativos</h3>
          {!clients?.length ? (
            <p className="text-sm text-zinc-500">Nenhum cliente ativo</p>
          ) : (
            <div className="space-y-2">
              {clients.slice(0, 8).map((client) => {
                const clientOutputs = outputs?.filter(o => o.client_id === client.id).length ?? 0
                return (
                  <Link
                    key={client.id}
                    href={`/analytics/${client.id}`}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span className="text-sm text-zinc-300">{client.name}</span>
                    <span className="text-xs text-zinc-500">{clientOutputs} outputs</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent: 'violet' | 'blue' | 'emerald' | 'amber'
}) {
  const accentMap = {
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accentMap[accent]}`}>{value}</p>
      <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
    </div>
  )
}
