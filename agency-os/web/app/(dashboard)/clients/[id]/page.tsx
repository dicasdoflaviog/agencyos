import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientDetailToggle } from '@/components/clients/ClientDetailToggle'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:   { label: 'Ativo',     className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  paused:   { label: 'Pausado',   className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  archived: { label: 'Arquivado', className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
}

const JOB_STATUS = {
  backlog:     { label: 'Backlog',       className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  in_progress: { label: 'Em Andamento',  className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  review:      { label: 'Revisão',       className: 'bg-blue-500/10 text-blue-400' },
  done:        { label: 'Concluído',     className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  cancelled:   { label: 'Cancelado',     className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: jobs }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  if (!client) notFound()

  const status = STATUS_CONFIG[client.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-[var(--color-bg-elevated)] text-sm font-semibold text-[var(--color-text-primary)]">
          {client.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded object-cover" />
          ) : (
            client.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.className)}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Info + Editar */}
        <div className="lg:col-span-2 space-y-4">
          <ClientDetailToggle client={client} />
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Jobs recentes */}
          <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Jobs Recentes</h3>
              <Link href={`/jobs?client=${client.id}`} className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors cursor-pointer">
                Ver todos
              </Link>
            </div>
            {!jobs?.length ? (
              <p className="text-xs text-[var(--color-text-secondary)]">Nenhum job ainda.</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => {
                  const js = JOB_STATUS[job.status as keyof typeof JOB_STATUS]
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between group cursor-pointer">
                      <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors truncate max-w-[120px]">
                        {job.title}
                      </span>
                      <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', js?.className)}>
                        {js?.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
