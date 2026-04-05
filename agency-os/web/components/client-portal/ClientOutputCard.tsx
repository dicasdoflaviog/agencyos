import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { JobOutput } from '@/types/database'

interface Props {
  output: JobOutput & { job?: { id: string; title: string } | null }
  highlight?: boolean
}

const STAGE_CONFIG = {
  client_review: { label: 'Aguardando aprovação', className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  approved:      { label: 'Aprovado',             className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  published:     { label: 'Publicado',            className: 'bg-blue-500/10 text-blue-400' },
  rejected:      { label: 'Revisão solicitada',   className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
  draft:         { label: 'Rascunho',             className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  internal_review: { label: 'Revisão interna',    className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
}

export function ClientOutputCard({ output, highlight }: Props) {
  const stage = STAGE_CONFIG[output.approval_stage as keyof typeof STAGE_CONFIG] ?? STAGE_CONFIG.draft
  const preview = output.output_content.slice(0, 200)

  return (
    <Link
      href={`/client/outputs/${output.id}`}
      className={cn(
        'block rounded-lg border p-4 transition-colors hover:bg-[var(--color-bg-elevated)] cursor-pointer',
        highlight ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5' : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{output.job?.title ?? 'Conteúdo'}</span>
        <span className={cn('shrink-0 rounded px-2 py-0.5 text-xs font-medium', stage.className)}>
          {stage.label}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
        {preview}{output.output_content.length > 200 ? '…' : ''}
      </p>
    </Link>
  )
}
