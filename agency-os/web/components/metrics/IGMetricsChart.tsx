'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { IGMetric } from '@/types/database'

export function IGMetricsChart({ data }: { data: IGMetric[] }) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    Seguidores: d.followers ?? 0,
    Alcance: d.reach ?? 0,
    Impressões: d.impressions ?? 0,
  }))

  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
        Métricas do Instagram
      </h3>
      {!data.length ? (
        <p className="py-8 text-center text-xs text-[var(--color-text-secondary)]">Sem dados disponíveis</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#A1A1AA', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#A1A1AA', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181B',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: '#FAFAFA' }}
              itemStyle={{ color: '#A1A1AA' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Line
              type="monotone"
              dataKey="Seguidores"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Alcance"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Impressões"
              stroke="#22C55E"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
