import { ClientForm } from '@/components/clients/ClientForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewClientPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer mb-4"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Clientes
        </Link>
        <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Novo Cliente</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Preencha os dados do cliente</p>
      </div>
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
        <ClientForm mode="create" />
      </div>
    </div>
  )
}
