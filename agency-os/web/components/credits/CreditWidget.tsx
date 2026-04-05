'use client'

import { useEffect, useState } from 'react'
import { Zap, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface CreditData {
  balance: number
  plan: string
}

const PLAN_MAX: Record<string, number> = {
  starter: 500,
  pro: 1500,
  agency: 5000,
}

export function CreditWidget() {
  const [data, setData] = useState<CreditData | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/credits')
      if (res.ok) setData(await res.json())
    } catch { /* silent */ }
  }

  useEffect(() => {
    load()
    // Reload after credit operations
    window.addEventListener('credits:updated', load)
    return () => window.removeEventListener('credits:updated', load)
  }, [])

  if (!data) return null

  const max = PLAN_MAX[data.plan] ?? 500
  const pct = Math.max(0, Math.min(100, Math.round((data.balance / max) * 100)))
  const low = data.balance < max * 0.15

  return (
    <div className="mx-3 mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className={low ? 'text-amber-400' : 'text-[var(--color-accent)]'} />
          <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Créditos</span>
        </div>
        <Link
          href="/settings/billing"
          className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:opacity-80 transition-opacity"
        >
          <ShoppingCart size={10} />
          Comprar
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: low
              ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
              : 'linear-gradient(90deg, var(--color-accent), #a78bfa)',
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold tabular-nums ${low ? 'text-amber-400' : 'text-[var(--color-text)]'}`}>
          {data.balance.toLocaleString('pt-BR')} cr
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] capitalize">{data.plan}</span>
      </div>

      {low && (
        <p className="mt-1.5 text-[10px] text-amber-400 leading-tight">
          Créditos baixos — faça upgrade para continuar.
        </p>
      )}
    </div>
  )
}
