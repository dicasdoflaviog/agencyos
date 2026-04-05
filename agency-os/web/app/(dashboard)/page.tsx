import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Users, Briefcase, CheckCircle, DollarSign, Plus, Zap } from 'lucide-react'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import Link from 'next/link'

async function getStats() {
  const supabase = await createClient()

  const [clients, jobs, outputs, financial] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'in_progress'),
    supabase.from('job_outputs').select('id', { count: 'exact' }).eq('approval_stage', 'approved'),
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
      <OnboardingChecklist />
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">Overview</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">Visão geral da agência</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, isString }) => (
          <div key={label} className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">{label}</span>
              <Icon size={15} className={color} strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">
              {isString ? value : value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Ações Rápidas</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/clients/new" className="flex items-center gap-3 rounded-md border border-white/[0.07] bg-[#18181B] p-4 hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 transition-all group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F59E0B]/10 text-[#F59E0B] group-hover:bg-[#F59E0B]/20 transition-colors">
              <Plus size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#FAFAFA]">Adicionar Cliente</p>
              <p className="text-xs text-[#A1A1AA]">Cadastre um novo cliente</p>
            </div>
          </Link>
          <Link href="/jobs/new" className="flex items-center gap-3 rounded-md border border-white/[0.07] bg-[#18181B] p-4 hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 transition-all group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#22C55E]/10 text-[#22C55E] group-hover:bg-[#22C55E]/20 transition-colors">
              <Briefcase size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#FAFAFA]">Criar Job</p>
              <p className="text-xs text-[#A1A1AA]">Inicie um novo projeto</p>
            </div>
          </Link>
          <Link href="/oracle" className="flex items-center gap-3 rounded-md border border-white/[0.07] bg-[#18181B] p-4 hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 transition-all group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#6366F1]/10 text-[#6366F1] group-hover:bg-[#6366F1]/20 transition-colors">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#FAFAFA]">Consultar Oracle</p>
              <p className="text-xs text-[#A1A1AA]">Converse com seus agentes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
