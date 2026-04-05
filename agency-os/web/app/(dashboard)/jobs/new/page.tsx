import { createClient } from '@/lib/supabase/server'
import { JobForm } from '@/components/jobs/JobForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewJobPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer mb-4">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Jobs
        </Link>
        <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Novo Job</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Crie um job para um cliente</p>
      </div>
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
        <JobForm clients={clients ?? []} mode="create" />
      </div>
    </div>
  )
}
