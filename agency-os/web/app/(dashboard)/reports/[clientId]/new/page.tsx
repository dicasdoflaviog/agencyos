import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReportBuilderForm from './ReportBuilderForm'

export default async function NewReportPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer mb-4"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Relatórios
        </Link>
        <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Novo Relatório</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Gerar relatório para {client.name}</p>
      </div>
      <ReportBuilderForm clientId={client.id} clientName={client.name} />
    </div>
  )
}
