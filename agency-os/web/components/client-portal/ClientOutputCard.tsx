import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { JobOutput } from '@/types/database'

interface Props {
  output: JobOutput & { job?: { id: string; title: string } | null }
  highlight?: boolean
}

const STAGE_CONFIG = {
  client_review: { label: 'Aguardando aprovação', className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  approved:      { label: 'Aprovado',             className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  published:     { label: 'Publicado',            className: 'bg-blue-500/10 text-blue-400' },
  rejected:      { label: 'Revisão solicitada',   className: 'bg-[#EF4444]/10 text-[#EF4444]' },
  draft:         { label: 'Rascunho',             className: 'bg-white/[0.06] text-[#A1A1AA]' },
  internal_review: { label: 'Revisão interna',    className: 'bg-white/[0.06] text-[#A1A1AA]' },
}

export function ClientOutputCard({ output, highlight }: Props) {
  const stage = STAGE_CONFIG[output.approval_stage as keyof typeof STAGE_CONFIG] ?? STAGE_CONFIG.draft
  const preview = output.output_content.slice(0, 200)

  return (
    <Link
      href={`/client/outputs/${output.id}`}
      className={cn(
        'block rounded-lg border p-4 transition-colors hover:bg-[#27272A] cursor-pointer',
        highlight ? 'border-[#F59E0B]/20 bg-[#F59E0B]/5' : 'border-white/[0.07] bg-[#18181B]'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-[#FAFAFA] truncate">{output.job?.title ?? 'Conteúdo'}</span>
        <span className={cn('shrink-0 rounded px-2 py-0.5 text-xs font-medium', stage.className)}>
          {stage.label}
        </span>
      </div>
      <p className="text-xs text-[#A1A1AA] line-clamp-3 leading-relaxed">
        {preview}{output.output_content.length > 200 ? '…' : ''}
      </p>
    </Link>
  )
}
