import Link from 'next/link'
import { type Client } from '@/types/database'
import { formatCurrency, cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:   { label: 'Ativo',     className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  paused:   { label: 'Pausado',   className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  archived: { label: 'Arquivado', className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
}

export function ClientCard({ client }: { client: Client }) {
  const status = STATUS_CONFIG[client.status]

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group flex flex-col rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 transition-colors duration-150 hover:border-[var(--color-border-default)] cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        {/* Logo / Initials */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-[var(--color-bg-elevated)] text-sm font-semibold text-[var(--color-text-primary)]">
          {client.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded object-cover" />
          ) : (
            client.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.className)}>
          {status.label}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-white">
          {client.name}
        </h3>
        {client.niche && (
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{client.niche}</p>
        )}
      </div>

      {client.contract_value != null && (
        <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
          <p className="text-xs font-medium text-[var(--color-text-primary)]">
            {formatCurrency(client.contract_value)}
            <span className="ml-1 text-[var(--color-text-secondary)] font-normal">/mês</span>
          </p>
        </div>
      )}
    </Link>
  )
}
