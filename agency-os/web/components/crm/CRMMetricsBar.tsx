import type { Lead } from '@/types/database'

interface Props {
  leads: Lead[]
}

export function CRMMetricsBar({ leads }: Props) {
  const totalLeads = leads.length
  const inNegotiation = leads.filter(l => ['negotiation', 'proposal_sent'].includes(l.stage))
  const negotiationValue = inNegotiation.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)

  const now = new Date()
  const wonThisMonth = leads.filter(l => {
    if (l.stage !== 'won') return false
    const d = new Date(l.updated_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const closed = leads.filter(l => l.stage === 'won' || l.stage === 'lost')
  const conversionRate = closed.length > 0 ? Math.round((leads.filter(l => l.stage === 'won').length / closed.length) * 100) : 0

  const metrics = [
    { label: 'Total de leads', value: totalLeads.toString(), accent: false },
    { label: 'Em negociação', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(negotiationValue), accent: true },
    { label: 'Ganhos este mês', value: wonThisMonth.toString(), accent: false },
    { label: 'Taxa de conversão', value: `${conversionRate}%`, accent: false },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
      {metrics.map(m => (
        <div key={m.label} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">{m.label}</p>
          <p className={`text-xl font-bold ${m.accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>{m.value}</p>
        </div>
      ))}
    </div>
  )
}
