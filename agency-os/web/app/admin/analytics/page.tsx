import { createAdminClient } from '@/lib/supabase/admin'
import { UsageChart } from '@/components/admin/UsageChart'

async function getUsageEvents() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data } = await supabase
    .from('usage_events')
    .select('event_type, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  return data ?? []
}

interface UsageRow { created_at: string; event_type: string }

function groupByDay(events: UsageRow[]) {
  const map = new Map<string, number>()
  for (const e of events) {
    const day = e.created_at.slice(0, 10)
    map.set(day, (map.get(day) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }))
}

export default async function AdminAnalyticsPage() {
  const events = await getUsageEvents()
  const chartData = groupByDay(events)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Eventos de uso dos últimos 30 dias</p>
      </div>

      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Eventos por dia</h2>
        <UsageChart data={chartData} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">Total de eventos</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{events.length.toLocaleString('pt-BR')}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">Dias com atividade</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{chartData.length}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">Média diária</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {chartData.length > 0 ? Math.round(events.length / chartData.length) : 0}
          </p>
        </div>
      </div>
    </div>
  )
}
