import { cn, formatDate } from '@/lib/utils'
import type { JobOutput } from '@/types/database'

const STATUS_CONFIG = {
  pending:  { label: 'Pendente',  className: 'bg-white/[0.06] text-[#A1A1AA]' },
  approved: { label: 'Aprovado',  className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  rejected: { label: 'Rejeitado', className: 'bg-[#EF4444]/10 text-[#EF4444]' },
  revision: { label: 'Revisão',   className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
}

export function OutputCard({ output }: { output: JobOutput }) {
  const status = STATUS_CONFIG[output.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#0D0D0D] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#F59E0B]">
          {output.agent_name}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', status.className)}>
            {status.label}
          </span>
          <span className="text-[10px] text-[#A1A1AA]">{formatDate(output.created_at)}</span>
        </div>
      </div>
      {output.input_prompt && (
        <p className="mb-1.5 truncate text-xs text-[#A1A1AA]">
          ↳ {output.input_prompt}
        </p>
      )}
      <p className="line-clamp-3 text-sm leading-relaxed text-[#D4D4D8]">
        {output.output_content}
      </p>
    </div>
  )
}
