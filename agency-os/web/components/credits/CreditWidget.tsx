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
  const [data, setData] = useState<CreditData>({ balance: 0, plan: 'starter' })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/credits')
      if (res.ok) {
        const json = await res.json()
        setData({ balance: json.balance ?? 0, plan: json.plan ?? 'starter' })
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    window.addEventListener('credits:updated', load)
    return () => window.removeEventListener('credits:updated', load)
  }, [])

  const max = PLAN_MAX[data.plan] ?? 500
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((data.balance / max) * 100))) : 0
  const low = data.balance < max * 0.15

  return (
    <div className="mx-3 mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className={low && !loading ? 'text-amber-400' : 'text-[var(--color-accent)]'} />
          <span className="text-[11px] font-medium text-zinc-400">Créditos</span>
        </div>
        <Link
          href="/settings/billing"
          className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:opacity-70 transition-opacity"
        >
          <ShoppingCart size={10} />
          Gerenciar
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
        {loading ? (
          <div className="h-full w-1/3 rounded-full bg-white/20 animate-pulse" />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: low
                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                : 'linear-gradient(90deg, var(--color-accent,#f59e0b), #a78bfa)',
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        {loading ? (
          <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
        ) : (
          <>
            <span className={`text-[11px] font-bold tabular-nums ${low ? 'text-amber-400' : 'text-white'}`}>
              {data.balance.toLocaleString('pt-BR')} cr
            </span>
            <span className="text-[10px] text-zinc-500 capitalize">{data.plan}</span>
          </>
        )}
      </div>

      {!loading && low && (
        <p className="mt-1.5 text-[10px] text-amber-400 leading-tight">
          Saldo baixo — compre mais créditos.
        </p>
      )}
    </div>
  )
}
