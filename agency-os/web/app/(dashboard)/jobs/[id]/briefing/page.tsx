import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BriefingForm from '@/components/briefing/BriefingForm'
import type { JobBriefing } from '@/types/database'

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, client_id')
    .eq('id', id)
    .single()

  if (!job) redirect('/jobs')

  const { data: briefing } = await supabase
    .from('job_briefings')
    .select('*')
    .eq('job_id', id)
    .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-xs text-zinc-500 mb-1">
          <a href={`/jobs/${id}`} className="hover:text-zinc-300 transition-colors">
            ← Voltar para o job
          </a>
        </p>
        <h1 className="text-xl font-bold text-zinc-100">
          {briefing ? 'Editar briefing' : 'Criar briefing'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">{job.title}</p>
      </div>

      <BriefingForm jobId={id} existing={briefing as JobBriefing | null} />
    </div>
  )
}
