import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Users, Briefcase, CheckCircle, DollarSign, Plus, Zap } from 'lucide-react'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import Link from 'next/link'

export const metadata = { title: 'Visão Geral | Agency OS' }

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
    { label: 'Clientes Ativos',    value: stats.activeClients,   icon: Users,        color: 'text-[var(--color-success)]' },
    { label: 'Jobs em Andamento',  value: stats.jobsInProgress,  icon: Briefcase,    color: 'text-[var(--color-accent)]' },
    { label: 'Outputs Aprovados',  value: stats.approvedOutputs, icon: CheckCircle,  color: 'text-[var(--color-text-secondary)]' },
    { label: 'MRR',                value: formatCurrency(stats.mrr), icon: DollarSign, color: 'text-[var(--color-success)]', isString: true },
  ]

  return (
    <div>
      <OnboardingChecklist />
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Overview</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Visão geral da agência</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, isString }) => (
          <div key={label} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</span>
              <Icon size={15} className={color} strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">
              {isString ? value : value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Ações Rápidas</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/clients/new" className="flex items-center gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition-all group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] group-hover:bg-[var(--color-accent)]/20 transition-colors">
              <Plus size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Adicionar Cliente</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Cadastre um novo cliente</p>
            </div>
          </Link>
          <Link href="/jobs/new" className="flex items-center gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition-all group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)] group-hover:bg-[var(--color-success)]/20 transition-colors">
              <Briefcase size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Criar Job</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Inicie um novo projeto</p>
            </div>
          </Link>
          <Link href="/oracle" className="flex items-center gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition-all group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#6366F1]/10 text-[#6366F1] group-hover:bg-[#6366F1]/20 transition-colors">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Consultar Oracle</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Converse com seus agentes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
