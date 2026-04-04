'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  count: number
}

interface Props {
  data: DataPoint[]
}

export function UsageChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[#71717A]">
        Sem dados de uso ainda
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717A', fontSize: 11 }}
          tickFormatter={v => v.slice(5)}
        />
        <YAxis tick={{ fill: '#71717A', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}
          labelStyle={{ color: '#A1A1AA', fontSize: 11 }}
          itemStyle={{ color: '#F59E0B' }}
        />
        <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
