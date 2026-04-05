import { cn, formatDate } from '@/lib/utils'
import type { JobOutput } from '@/types/database'

const STATUS_CONFIG = {
  pending:  { label: 'Pendente',  className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  approved: { label: 'Aprovado',  className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  rejected: { label: 'Rejeitado', className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
  revision: { label: 'Revisão',   className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
}

export function OutputCard({ output }: { output: JobOutput }) {
  const status = STATUS_CONFIG[output.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending

  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
          {output.agent_name}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', status.className)}>
            {status.label}
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">{formatDate(output.created_at)}</span>
        </div>
      </div>
      {output.input_prompt && (
        <p className="mb-1.5 truncate text-xs text-[var(--color-text-secondary)]">
          ↳ {output.input_prompt}
        </p>
      )}
      <p className="line-clamp-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {output.output_content}
      </p>
    </div>
  )
}
