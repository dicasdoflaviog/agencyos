'use client'

interface Pipeline {
  status: string
}

interface Props {
  pipelines: Pipeline[]
}

const STATUS_LABELS: Record<string, string> = {
  running: 'Em contato',
  waiting_human: 'Interesse detectado',
  converted: 'Convertidos',
  paused: 'Pausados',
  dead: 'Encerrados',
}

export function SDRMetrics({ pipelines }: Props) {
  const counts = pipelines.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  const cards = [
    { key: 'running',        label: 'Em contato',         color: '#3b82f6' },
    { key: 'waiting_human',  label: 'Interesse detectado', color: '#f59e0b' },
    { key: 'converted',      label: 'Convertidos',         color: '#22c55e' },
    { key: 'dead',           label: 'Encerrados',          color: '#6b7280' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        SDR Autônomo — Visão Geral
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {cards.map(card => (
          <div key={card.key} style={{
            background: 'var(--color-bg-surface)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '10px',
            padding: '1rem',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>
              {counts[card.key] ?? 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
        Total no pipeline: {pipelines.length} lead{pipelines.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

void STATUS_LABELS
