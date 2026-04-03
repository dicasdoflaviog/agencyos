import Link from 'next/link'
import { type Job } from '@/types/database'
import { formatDate, cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

const PRIORITY_CONFIG = {
  low:    { label: 'Baixa',   className: 'bg-white/[0.06] text-[#A1A1AA]' },
  normal: { label: 'Normal',  className: 'bg-blue-500/10 text-blue-400' },
  high:   { label: 'Alta',    className: 'bg-[#F97316]/10 text-[#F97316]' },
  urgent: { label: 'Urgente', className: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

export function JobCard({ job }: { job: Job }) {
  const priority = PRIORITY_CONFIG[job.priority]
  const isOverdue = job.due_date && new Date(job.due_date) < new Date()

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col rounded-md border border-white/[0.07] bg-[#18181B] p-4 transition-colors duration-150 hover:border-white/[0.12] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-[#FAFAFA] group-hover:text-white leading-snug line-clamp-2">
          {job.title}
        </p>
        <span className={cn('flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium', priority.className)}>
          {priority.label}
        </span>
      </div>

      {job.client && (
        <p className="text-xs text-[#A1A1AA] mb-3">{job.client.name}</p>
      )}

      {job.due_date && (
        <div className={cn('flex items-center gap-1 text-xs mt-auto', isOverdue ? 'text-[#EF4444]' : 'text-[#A1A1AA]')}>
          {isOverdue && <AlertCircle size={11} strokeWidth={2} />}
          {formatDate(job.due_date)}
        </div>
      )}
    </Link>
  )
}
