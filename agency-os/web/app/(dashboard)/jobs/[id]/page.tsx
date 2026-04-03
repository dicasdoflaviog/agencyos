import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JobForm } from '@/components/jobs/JobForm'
import { AgentInterface } from '@/components/agents/AgentInterface'
import { OutputCard } from '@/components/agents/OutputCard'
import { cn, formatDate } from '@/lib/utils'

const STATUS_CONFIG = {
  backlog:     { label: 'Backlog',      className: 'bg-white/[0.06] text-[#A1A1AA]' },
  in_progress: { label: 'Em Andamento', className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  review:      { label: 'Revisão',      className: 'bg-blue-500/10 text-blue-400' },
  done:        { label: 'Concluído',    className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  cancelled:   { label: 'Cancelado',   className: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Baixa',   className: 'bg-white/[0.06] text-[#A1A1AA]' },
  normal: { label: 'Normal',  className: 'bg-blue-500/10 text-blue-400' },
  high:   { label: 'Alta',    className: 'bg-[#F97316]/10 text-[#F97316]' },
  urgent: { label: 'Urgente', className: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: job }, { data: outputs }, { data: clients }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(id, name, logo_url)').eq('id', id).single(),
    supabase.from('job_outputs').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
  ])

  if (!job) notFound()

  const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG]
  const priority = PRIORITY_CONFIG[job.priority as keyof typeof PRIORITY_CONFIG]

  return (
    <div>
      <div className="mb-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer mb-4">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Jobs
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight truncate">{job.title}</h2>
            {job.client && (
              <p className="mt-1 text-sm text-[#A1A1AA]">
                <Link href={`/clients/${job.client.id}`} className="hover:text-[#FAFAFA] transition-colors cursor-pointer">
                  {job.client.name}
                </Link>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('rounded px-2 py-0.5 text-xs font-medium', priority.className)}>{priority.label}</span>
            <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.className)}>{status.label}</span>
            {job.due_date && (
              <span className="text-xs text-[#A1A1AA]">Prazo: {formatDate(job.due_date)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Agentes — ocupa 3 colunas */}
        <div className="xl:col-span-3 space-y-4">
          <AgentInterface jobId={job.id} clientId={job.client_id} />

          {/* Outputs */}
          {outputs && outputs.length > 0 && (
            <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
                Outputs ({outputs.length})
              </h3>
              <div className="space-y-3">
                {outputs.map((output) => (
                  <OutputCard key={output.id} output={output} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editar job — ocupa 2 colunas */}
        <div className="xl:col-span-2">
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Editar Job</h3>
            <JobForm clients={clients ?? []} initialData={job} mode="edit" />
          </div>
        </div>
      </div>
    </div>
  )
}
