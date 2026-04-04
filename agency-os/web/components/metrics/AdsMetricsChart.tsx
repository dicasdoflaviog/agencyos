'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { AdsMetric } from '@/types/database'

export function AdsMetricsChart({ data }: { data: AdsMetric[] }) {
  // Aggregate by campaign for chart display
  const campaignMap = new Map<string, { spend: number; clicks: number; impressions: number }>()
  for (const d of data) {
    const key = d.campaign_name ?? d.campaign_id.slice(0, 12)
    const existing = campaignMap.get(key) ?? { spend: 0, clicks: 0, impressions: 0 }
    campaignMap.set(key, {
      spend: existing.spend + (d.spend ?? 0),
      clicks: existing.clicks + (d.clicks ?? 0),
      impressions: existing.impressions + (d.impressions ?? 0),
    })
  }

  const chartData = Array.from(campaignMap.entries()).map(([campaign, vals]) => ({
    campaign,
    'Gasto (R$)': +vals.spend.toFixed(2),
    Cliques: vals.clicks,
    'Impressões (k)': +(vals.impressions / 1000).toFixed(1),
  }))

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
        Performance de Anúncios
      </h3>
      <p className="mb-4 text-xs text-[#A1A1AA]">Impressões em milhares (k)</p>
      {!data.length ? (
        <p className="py-8 text-center text-xs text-[#A1A1AA]">Sem dados disponíveis</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="campaign"
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
            <Bar dataKey="Gasto (R$)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Cliques" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Impressões (k)" fill="#22C55E" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
