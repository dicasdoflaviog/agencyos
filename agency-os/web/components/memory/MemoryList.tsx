import type { ClientMemory, MemorySource } from '@/types/database'

const SOURCE_CONFIG: Record<MemorySource, { label: string; className: string }> = {
  output_approved: { label: 'Output',   className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  briefing:        { label: 'Briefing', className: 'bg-blue-500/10 text-blue-400' },
  manual:          { label: 'Manual',   className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
}

export function MemoryList({ memories }: { memories: ClientMemory[] }) {
  if (!memories.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-12 text-center">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Nenhuma memória registrada</p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Memórias são criadas automaticamente a partir de outputs aprovados e briefings
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {memories.map((memory) => {
        const src = memory.source && memory.source in SOURCE_CONFIG
          ? SOURCE_CONFIG[memory.source]
          : { label: 'N/A', className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' }

        return (
          <div key={memory.id} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
            <p className="line-clamp-3 text-sm text-[var(--color-text-primary)]">{memory.content}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${src.className}`}>
                {src.label}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {new Date(memory.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
