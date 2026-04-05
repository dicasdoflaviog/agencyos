import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrendingUp, DollarSign, FileText, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:  { label: 'Ativo',      className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  paused:  { label: 'Pausado',    className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  ended:   { label: 'Encerrado',  className: 'bg-white/[0.06] text-[var(--color-text-muted)]' },
  draft:   { label: 'Rascunho',   className: 'bg-white/[0.06] text-[var(--color-text-muted)]' },
} as const

const BILLING_LABELS = {
  monthly:  'Mensal',
  project:  'Por Projeto',
  retainer: 'Retainer',
} as const

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function AdvancedFinancialPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*, client:clients(id, name)')
    .order('created_at', { ascending: false })

  const allContracts = contracts ?? []

  // Fallback: if no contracts exist, derive MRR from clients.contract_value
  let mrr = 0
  let activeCount = 0
  if (allContracts.length === 0) {
    const { data: activeClients } = await supabase
      .from('clients')
      .select('contract_value')
      .eq('contract_status', 'active')
    const clients = activeClients ?? []
    activeCount = clients.length
    mrr = clients.reduce((sum, c) => sum + (c.contract_value ?? 0), 0)
  } else {
    mrr = allContracts
      .filter((c) => c.status === 'active' && (c.billing === 'monthly' || c.billing === 'retainer'))
      .reduce((sum, c) => sum + (c.value ?? 0), 0)
    activeCount = allContracts.filter((c) => c.status === 'active').length
  }

  // Pipeline: draft contracts total value
  const arr = mrr * 12
  const pipelineValue = allContracts
    .filter((c) => c.status === 'draft')
    .reduce((sum, c) => sum + (c.value ?? 0), 0)

  const pausedCount = allContracts.filter((c) => c.status === 'paused').length
  const endedCount = allContracts.filter((c) => c.status === 'ended').length
  const draftCount = allContracts.filter((c) => c.status === 'draft').length

  const metrics = [
    {
      label: 'MRR',
      value: formatCurrency(mrr),
      sub: 'Receita Recorrente Mensal',
      icon: DollarSign,
      color: 'text-[var(--color-success)]',
      iconBg: 'bg-[var(--color-success)]/10',
    },
    {
      label: 'ARR',
      value: formatCurrency(arr),
      sub: 'Receita Recorrente Anual',
      icon: TrendingUp,
      color: 'text-[var(--color-accent)]',
      iconBg: 'bg-[var(--color-accent)]/10',
    },
    {
      label: 'Contratos Ativos',
      value: activeCount.toLocaleString('pt-BR'),
      sub: `${pausedCount} pausado${pausedCount !== 1 ? 's' : ''}, ${endedCount} encerrado${endedCount !== 1 ? 's' : ''}`,
      icon: FileText,
      color: 'text-[var(--color-text-secondary)]',
      iconBg: 'bg-white/[0.06]',
    },
    {
      label: 'Pipeline',
      value: formatCurrency(pipelineValue),
      sub: `${draftCount} rascunho${draftCount !== 1 ? 's' : ''}`,
      icon: AlertCircle,
      color: 'text-[var(--color-text-muted)]',
      iconBg: 'bg-white/[0.04]',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Financeiro Avançado</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">MRR, ARR e visão completa de contratos</p>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, sub, icon: Icon, color, iconBg }) => (
          <div key={label} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
              <div className={cn('rounded p-1.5', iconBg)}>
                <Icon size={14} className={color} strokeWidth={2} />
              </div>
            </div>
            <p className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight mb-1">{value}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Contracts table */}
      <div className="rounded-md border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-[var(--color-border-subtle)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Todos os Contratos</h2>
          <span className="text-xs text-[var(--color-text-muted)]">{allContracts.length} contrato{allContracts.length !== 1 ? 's' : ''}</span>
        </div>

        {allContracts.length === 0 ? (
          <div className="bg-[var(--color-bg-surface)] p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Nenhum contrato cadastrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-white/[0.01]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Cobrança</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Início</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] bg-[var(--color-bg-surface)]">
              {allContracts.map((contract) => {
                const st = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
                return (
                  <tr key={contract.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {contract.client?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(contract.value)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {BILLING_LABELS[contract.billing as keyof typeof BILLING_LABELS] ?? contract.billing}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {formatDate(contract.start_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', st.className)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {contract.client && (
                        <Link
                          href={`/clients/${contract.client_id}/contracts/${contract.id}`}
                          className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                        >
                          Ver →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
