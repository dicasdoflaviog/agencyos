import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, DollarSign, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ContractForm } from '@/components/contracts/ContractForm'
import { InvoiceList } from '@/components/contracts/InvoiceList'
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

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>
}) {
  const { id, contractId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: contract }, { data: invoices }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, client:clients(id, name)')
      .eq('id', contractId)
      .eq('client_id', id)
      .single(),
    supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .order('due_date', { ascending: false }),
  ])

  if (!contract) notFound()

  const status = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG]
  const paidTotal = invoices
    ?.filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0) ?? 0
  const pendingTotal = invoices
    ?.filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0) ?? 0

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/clients/${id}/contracts`}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              {contract.client?.name ?? 'Cliente'} — Contratos
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">
              Contrato
            </h1>
            <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', status.className)}>
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)] font-mono">{contractId}</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Valor</p>
          <p className="text-xl font-bold font-display text-[var(--color-text-primary)]">
            {contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Cobrança</p>
          <p className="text-xl font-bold font-display text-[var(--color-text-primary)]">
            {BILLING_LABELS[contract.billing as keyof typeof BILLING_LABELS]}
          </p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Pago</p>
          <p className="text-xl font-bold text-[var(--color-success)]">
            {paidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Pendente</p>
          <p className="text-xl font-bold text-[var(--color-accent)]">
            {pendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {/* Dates + notes info */}
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--color-text-muted)] shrink-0" />
          <span className="text-xs text-[var(--color-text-muted)]">Início:</span>
          <span className="text-sm text-[var(--color-text-primary)] font-medium">{formatDate(contract.start_date)}</span>
          {contract.end_date && (
            <>
              <span className="text-[var(--color-text-disabled)] mx-1">→</span>
              <span className="text-xs text-[var(--color-text-muted)]">Término:</span>
              <span className="text-sm text-[var(--color-text-primary)] font-medium">{formatDate(contract.end_date)}</span>
            </>
          )}
        </div>
        {contract.notes && (
          <div className="flex gap-2 border-t border-[var(--color-border-subtle)] pt-3">
            <FileText size={14} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <InvoiceList contractId={contractId} initialInvoices={invoices ?? []} />
      </div>

      {/* Edit form */}
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <DollarSign size={14} className="text-[var(--color-accent)]" />
          Editar Contrato
        </h3>
        <ContractForm clientId={id} initialData={contract} mode="edit" />
      </div>
    </div>
  )
}
