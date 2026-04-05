import { cn } from '@/lib/utils'

type PostStatus = 'draft' | 'review' | 'published'

const STATUS_CONFIG: Record<PostStatus, { label: string; className: string }> = {
  draft:     { label: 'Rascunho',  className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  review:    { label: 'Revisão',   className: 'bg-blue-500/10 text-blue-400' },
  published: { label: 'Publicado', className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
}

export function PostStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as PostStatus] ?? { label: status, className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' }
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
