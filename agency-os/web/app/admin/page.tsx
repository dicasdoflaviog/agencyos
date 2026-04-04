import { createAdminClient } from '@/lib/supabase/admin'
import { WorkspaceTable } from '@/components/admin/WorkspaceTable'
import { Building2, TrendingUp, Zap, Users } from 'lucide-react'

async function getAdminStats() {
  const supabase = createAdminClient()

  const [workspaces, subscriptions, outputs, profiles] = await Promise.all([
    supabase.from('workspaces').select('id', { count: 'exact' }),
    supabase.from('subscriptions').select('plan, status').eq('status', 'active'),
    supabase.from('job_outputs').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ])

  const planValues: Record<string, number> = { starter: 97, pro: 297, agency: 797 }
  const mrr = (subscriptions.data ?? []).reduce((sum, s) => sum + (planValues[s.plan] ?? 0), 0)

  return {
    totalWorkspaces: workspaces.count ?? 0,
    mrr,
    outputsToday: outputs.count ?? 0,
    activeUsers: profiles.count ?? 0,
  }
}

async function getWorkspacesForTable() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export default async function AdminPage() {
  const [stats, workspaces] = await Promise.all([getAdminStats(), getWorkspacesForTable()])

  const cards = [
    { label: 'Total Workspaces', value: stats.totalWorkspaces.toLocaleString('pt-BR'), icon: Building2 },
    { label: 'MRR', value: `R$ ${stats.mrr.toLocaleString('pt-BR')}`, icon: TrendingUp },
    { label: 'Outputs/dia', value: stats.outputsToday.toLocaleString('pt-BR'), icon: Zap },
    { label: 'Usuários Ativos', value: stats.activeUsers.toLocaleString('pt-BR'), icon: Users },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">Visão geral da plataforma</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">{label}</span>
              <Icon size={15} className="text-[#F59E0B]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold tracking-tight text-[#FAFAFA]">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Workspaces</h2>
        <WorkspaceTable workspaces={workspaces} />
      </div>
    </div>
  )
}
