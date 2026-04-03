import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Users, Briefcase, CheckCircle, DollarSign } from 'lucide-react'

async function getStats() {
  const supabase = await createClient()

  const [clients, jobs, outputs, financial] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'in_progress'),
    supabase.from('job_outputs').select('id', { count: 'exact' }).eq('status', 'approved'),
    supabase.from('clients').select('contract_value').eq('status', 'active').eq('contract_status', 'active'),
  ])

  const mrr = financial.data?.reduce((sum, c) => sum + (c.contract_value ?? 0), 0) ?? 0

  return {
    activeClients: clients.count ?? 0,
    jobsInProgress: jobs.count ?? 0,
    approvedOutputs: outputs.count ?? 0,
    mrr,
  }
}

export default async function OverviewPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Clientes Ativos',    value: stats.activeClients,   icon: Users,        color: 'text-[#22C55E]' },
    { label: 'Jobs em Andamento',  value: stats.jobsInProgress,  icon: Briefcase,    color: 'text-[#F59E0B]' },
    { label: 'Outputs Aprovados',  value: stats.approvedOutputs, icon: CheckCircle,  color: 'text-[#A1A1AA]' },
    { label: 'MRR',                value: formatCurrency(stats.mrr), icon: DollarSign, color: 'text-[#22C55E]', isString: true },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Overview</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">Visão geral da agência</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, isString }) => (
          <div key={label} className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">{label}</span>
              <Icon size={15} className={color} strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-[#FAFAFA] tracking-tight">
              {isString ? value : value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
