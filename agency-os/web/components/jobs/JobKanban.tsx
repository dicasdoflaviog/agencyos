import { type Job } from '@/types/database'
import { JobCard } from './JobCard'

const COLUMNS = [
  { key: 'backlog',     label: 'Backlog' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'review',     label: 'Revisão' },
  { key: 'done',       label: 'Concluído' },
] as const

export function JobKanban({ jobs }: { jobs: Job[] }) {
  const grouped = COLUMNS.map((col) => ({
    ...col,
    jobs: jobs.filter((j) => j.status === col.key),
  }))

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {grouped.map(({ key, label, jobs: colJobs }) => (
        <div key={key} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">{label}</span>
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-xs font-medium text-[#A1A1AA]">
              {colJobs.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {colJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {colJobs.length === 0 && (
              <div className="rounded-md border border-dashed border-white/[0.07] p-4 text-center">
                <p className="text-xs text-[#A1A1AA]">Sem jobs</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
