import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JobForm } from '@/components/jobs/JobForm'
import { AgentInterface } from '@/components/agents/AgentInterface'
import { OutputCard } from '@/components/agents/OutputCard'
import BriefingCard from '@/components/briefing/BriefingCard'
import { cn, formatDate } from '@/lib/utils'

const STATUS_CONFIG = {
  backlog:     { label: 'Backlog',      className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  in_progress: { label: 'Em Andamento', className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  review:      { label: 'Revisão',      className: 'bg-blue-500/10 text-blue-400' },
  done:        { label: 'Concluído',    className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  cancelled:   { label: 'Cancelado',   className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Baixa',   className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  normal: { label: 'Normal',  className: 'bg-blue-500/10 text-blue-400' },
  high:   { label: 'Alta',    className: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' },
  urgent: { label: 'Urgente', className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: job }, { data: outputs }, { data: clients }, { data: briefing }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(id, name, logo_url)').eq('id', id).single(),
    supabase.from('job_outputs').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
    supabase.from('job_briefings').select('*').eq('job_id', id).maybeSingle(),
  ])

  if (!job) notFound()

  const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG]
  const priority = PRIORITY_CONFIG[job.priority as keyof typeof PRIORITY_CONFIG]

  return (
    <div>
      <div className="mb-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer mb-4">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Jobs
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight truncate">{job.title}</h2>
            {job.client && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                <Link href={`/clients/${job.client.id}`} className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                  {job.client.name}
                </Link>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('rounded px-2 py-0.5 text-xs font-medium', priority.className)}>{priority.label}</span>
            <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.className)}>{status.label}</span>
            {job.due_date && (
              <span className="text-xs text-[var(--color-text-secondary)]">Prazo: {formatDate(job.due_date)}</span>
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
            <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
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

        {/* Sidebar direita — ocupa 2 colunas */}
        <div className="xl:col-span-2 space-y-4">
          {/* Briefing */}
          {briefing ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <BriefingCard briefing={briefing as any} jobId={id} />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-center">
              <p className="text-sm text-zinc-400 font-medium">Sem briefing</p>
              <p className="text-xs text-zinc-600 mt-1 mb-3">Crie um briefing para melhorar os outputs dos agentes</p>
              <Link
                href={`/jobs/${id}/briefing`}
                className="inline-flex items-center rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] transition-colors"
              >
                + Criar briefing
              </Link>
            </div>
          )}

          {/* Editar job */}
          <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Editar Job</h3>
            <JobForm clients={clients ?? []} initialData={job} mode="edit" />
          </div>
        </div>
      </div>
    </div>
  )
}
