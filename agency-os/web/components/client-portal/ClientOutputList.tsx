import { ClientOutputCard } from './ClientOutputCard'
import type { JobOutput } from '@/types/database'

interface Props {
  outputs: (JobOutput & { job?: { id: string; title: string } | null })[]
}

export function ClientOutputList({ outputs }: Props) {
  if (!outputs.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-16">
        <p className="text-sm text-[var(--color-text-secondary)]">Nenhum conteúdo disponível ainda.</p>
      </div>
    )
  }

  const pending = outputs.filter(o => o.approval_stage === 'client_review')
  const rest = outputs.filter(o => o.approval_stage !== 'client_review')

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-3">
            Aguardando sua aprovação ({pending.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map(output => (
              <ClientOutputCard key={output.id} output={output} highlight />
            ))}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
            Histórico
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map(output => (
              <ClientOutputCard key={output.id} output={output} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
