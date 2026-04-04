import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Plus, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ContractCard } from '@/components/contracts/ContractCard'

export default async function ClientContractsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: client }, { data: contracts }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).single(),
    supabase
      .from('contracts')
      .select('*, client:clients(id, name)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  const activeCount = contracts?.filter((c) => c.status === 'active').length ?? 0
  const totalValue = contracts
    ?.filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.value ?? 0), 0) ?? 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/clients/${id}`}
              className="text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              {client.name}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Contratos</h1>
          <p className="mt-0.5 text-sm text-[#71717A]">
            {contracts?.length ?? 0} contrato{contracts?.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <Link
          href={`/clients/${id}/contracts/new`}
          className="inline-flex items-center gap-2 rounded-md bg-[#F59E0B] hover:bg-[#D97706] px-3 py-2 text-sm font-semibold text-[#0A0A0A] transition-colors"
        >
          <Plus size={14} />
          Novo Contrato
        </Link>
      </div>

      {/* Summary cards */}
      {(contracts?.length ?? 0) > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-4">
            <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Ativos</p>
            <p className="text-2xl font-bold text-[#22C55E]">{activeCount}</p>
          </div>
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-4">
            <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Valor Ativo</p>
            <p className="text-2xl font-bold text-[#FAFAFA]">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-4">
            <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-[#FAFAFA]">{contracts?.length ?? 0}</p>
          </div>
        </div>
      )}

      {/* Contracts grid */}
      {(contracts?.length ?? 0) === 0 ? (
        <div className="rounded-md border border-dashed border-white/[0.07] bg-[#18181B] p-12 text-center">
          <p className="text-sm text-[#71717A]">Nenhum contrato encontrado para {client.name}.</p>
          <p className="mt-1 text-xs text-[#3F3F46]">Crie o primeiro contrato para este cliente.</p>
          <Link
            href={`/clients/${id}/contracts/new`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B] hover:bg-[#D97706] px-3 py-1.5 text-xs font-semibold text-[#0A0A0A] transition-colors"
          >
            <Plus size={12} />
            Criar Contrato
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contracts!.map((contract) => (
            <ContractCard key={contract.id} contract={contract} clientId={id} />
          ))}
        </div>
      )}
    </div>
  )
}
