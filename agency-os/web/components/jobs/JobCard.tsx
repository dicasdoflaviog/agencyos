import Link from 'next/link'
import { type Job } from '@/types/database'
import { formatDate, cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

const PRIORITY_CONFIG = {
  low:    { label: 'Baixa',   className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  normal: { label: 'Normal',  className: 'bg-blue-500/10 text-blue-400' },
  high:   { label: 'Alta',    className: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' },
  urgent: { label: 'Urgente', className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
}

export function JobCard({ job }: { job: Job }) {
  const priority = PRIORITY_CONFIG[job.priority]
  const isOverdue = job.due_date && new Date(job.due_date) < new Date()

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 transition-colors duration-150 hover:border-[var(--color-border-default)] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-white leading-snug line-clamp-2">
          {job.title}
        </p>
        <span className={cn('flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium', priority.className)}>
          {priority.label}
        </span>
      </div>

      {job.client && (
        <p className="text-xs text-[var(--color-text-secondary)] mb-3">{job.client.name}</p>
      )}

      {job.due_date && (
        <div className={cn('flex items-center gap-1 text-xs mt-auto', isOverdue ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]')}>
          {isOverdue && <AlertCircle size={11} strokeWidth={2} />}
          {formatDate(job.due_date)}
        </div>
      )}
    </Link>
  )
}
