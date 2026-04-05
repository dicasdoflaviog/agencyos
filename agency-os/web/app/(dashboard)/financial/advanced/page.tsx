import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrendingUp, DollarSign, FileText, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:  { label: 'Ativo',      className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  paused:  { label: 'Pausado',    className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  ended:   { label: 'Encerrado',  className: 'bg-white/[0.06] text-[#71717A]' },
  draft:   { label: 'Rascunho',   className: 'bg-white/[0.06] text-[#71717A]' },
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

  // MRR: monthly + retainer active contracts
  const mrr = allContracts
    .filter((c) => c.status === 'active' && (c.billing === 'monthly' || c.billing === 'retainer'))
    .reduce((sum, c) => sum + (c.value ?? 0), 0)

  const arr = mrr * 12

  // Active contracts count
  const activeCount = allContracts.filter((c) => c.status === 'active').length

  // Pipeline: draft contracts total value
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
      color: 'text-[#22C55E]',
      iconBg: 'bg-[#22C55E]/10',
    },
    {
      label: 'ARR',
      value: formatCurrency(arr),
      sub: 'Receita Recorrente Anual',
      icon: TrendingUp,
      color: 'text-[#F59E0B]',
      iconBg: 'bg-[#F59E0B]/10',
    },
    {
      label: 'Contratos Ativos',
      value: activeCount.toLocaleString('pt-BR'),
      sub: `${pausedCount} pausado${pausedCount !== 1 ? 's' : ''}, ${endedCount} encerrado${endedCount !== 1 ? 's' : ''}`,
      icon: FileText,
      color: 'text-[#A1A1AA]',
      iconBg: 'bg-white/[0.06]',
    },
    {
      label: 'Pipeline',
      value: formatCurrency(pipelineValue),
      sub: `${draftCount} rascunho${draftCount !== 1 ? 's' : ''}`,
      icon: AlertCircle,
      color: 'text-[#71717A]',
      iconBg: 'bg-white/[0.04]',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">Financeiro Avançado</h1>
        <p className="mt-0.5 text-sm text-[#71717A]">MRR, ARR e visão completa de contratos</p>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, sub, icon: Icon, color, iconBg }) => (
          <div key={label} className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#71717A] uppercase tracking-wider">{label}</span>
              <div className={cn('rounded p-1.5', iconBg)}>
                <Icon size={14} className={color} strokeWidth={2} />
              </div>
            </div>
            <p className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight mb-1">{value}</p>
            <p className="text-xs text-[#71717A]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Contracts table */}
      <div className="rounded-md border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.07]">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Todos os Contratos</h2>
          <span className="text-xs text-[#71717A]">{allContracts.length} contrato{allContracts.length !== 1 ? 's' : ''}</span>
        </div>

        {allContracts.length === 0 ? (
          <div className="bg-[#18181B] p-10 text-center">
            <p className="text-sm text-[#71717A]">Nenhum contrato cadastrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.01]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Cobrança</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Início</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#71717A] uppercase tracking-wider">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] bg-[#18181B]">
              {allContracts.map((contract) => {
                const st = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
                return (
                  <tr key={contract.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#FAFAFA]">
                        {contract.client?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#FAFAFA]">
                      {formatCurrency(contract.value)}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {BILLING_LABELS[contract.billing as keyof typeof BILLING_LABELS] ?? contract.billing}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
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
                          className="text-xs text-[#F59E0B] hover:text-[#D97706] transition-colors"
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
