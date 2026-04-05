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
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer mb-4">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Jobs
        </Link>
        <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">Novo Job</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">Crie um job para um cliente</p>
      </div>
      <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-6">
        <JobForm clients={clients ?? []} mode="create" />
      </div>
    </div>
  )
}
