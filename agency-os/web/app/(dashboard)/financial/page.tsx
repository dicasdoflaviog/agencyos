import { createClient } from '@/lib/supabase/server'

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const metadata = { title: 'Financeiro | Agency OS' }

export default async function FinancialPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, niche, contract_value, contract_status, status, created_at')
    .order('contract_value', { ascending: false })

  const activeClients = clients?.filter((c) => c.status === 'active') ?? []
  const mrr = activeClients.reduce((sum, c) => sum + (c.contract_value ?? 0), 0)
  const overdueCount = activeClients.filter((c) => c.contract_status === 'overdue').length

  const STATUS_MAP: Record<string, { label: string; className: string }> = {
    active:  { label: 'Ativo',    className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
    pending: { label: 'Pendente', className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
    overdue: { label: 'Atrasado', className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Financeiro</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Receita recorrente mensal dos contratos ativos</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">MRR</p>
          <p className="text-3xl font-bold font-display tracking-tight text-[var(--color-accent)]">{fmt(mrr)}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Clientes com contrato</p>
          <p className="text-3xl font-bold font-display tracking-tight text-[var(--color-text-primary)]">{activeClients.length}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Contratos em atraso</p>
          <p className={`text-3xl font-bold font-display tracking-tight ${overdueCount > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--color-border-subtle)]">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Nicho</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Contrato / mês</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {clients?.map((client) => {
              const s = STATUS_MAP[client.contract_status] ?? STATUS_MAP.pending
              return (
                <tr key={client.id} className="bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-surface)]/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{client.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{client.niche ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-text-primary)]">
                    {client.contract_value ? fmt(client.contract_value) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {!clients?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  Nenhum cliente cadastrado ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
