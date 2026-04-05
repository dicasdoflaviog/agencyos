import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ContractForm } from '@/components/contracts/ContractForm'

export default async function NewContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/clients/${id}/contracts`}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            Contratos de {client.name}
          </Link>
        </div>
        <h1 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Novo Contrato</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
          Criando contrato para <span className="text-[var(--color-text-secondary)] font-medium">{client.name}</span>
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
        <ContractForm clientId={id} mode="create" />
      </div>
    </div>
  )
}
