import { createClient } from '@/lib/supabase/server'

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

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
    active:  { label: 'Ativo',    className: 'bg-[#22C55E]/10 text-[#22C55E]' },
    pending: { label: 'Pendente', className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
    overdue: { label: 'Atrasado', className: 'bg-[#EF4444]/10 text-[#EF4444]' },
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">Financeiro</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">Receita recorrente mensal dos contratos ativos</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">MRR</p>
          <p className="text-3xl font-bold font-display tracking-tight text-[#F59E0B]">{fmt(mrr)}</p>
        </div>
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Clientes ativos</p>
          <p className="text-3xl font-bold font-display tracking-tight text-[#FAFAFA]">{activeClients.length}</p>
        </div>
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Contratos em atraso</p>
          <p className={`text-3xl font-bold font-display tracking-tight ${overdueCount > 0 ? 'text-[#EF4444]' : 'text-[#FAFAFA]'}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-white/[0.07]">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#18181B]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Nicho</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Contrato / mês</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {clients?.map((client) => {
              const s = STATUS_MAP[client.contract_status] ?? STATUS_MAP.pending
              return (
                <tr key={client.id} className="bg-[#09090B] hover:bg-[#18181B]/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#FAFAFA]">{client.name}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{client.niche ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#FAFAFA]">
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
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#A1A1AA]">
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
