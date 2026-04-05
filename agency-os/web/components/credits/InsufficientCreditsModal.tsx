'use client'

import { useEffect, useState } from 'react'
import { Zap, X, ArrowUpCircle, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface InsufficientPayload {
  balance: number
  cost: number
  error?: string
}

export function InsufficientCreditsModal() {
  const [payload, setPayload] = useState<InsufficientPayload | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<InsufficientPayload>).detail
      setPayload(detail)
    }
    window.addEventListener('credits:insufficient', handler)
    return () => window.removeEventListener('credits:insufficient', handler)
  }, [])

  if (!payload) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setPayload(null)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl p-6">
        <button
          onClick={() => setPayload(null)}
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto mb-4">
          <Zap size={22} className="text-amber-400" />
        </div>

        <h2 className="text-center text-base font-semibold text-[var(--color-text)] mb-1">
          Créditos insuficientes
        </h2>
        <p className="text-center text-sm text-[var(--color-text-secondary)] mb-5">
          Esta ação custa <strong className="text-[var(--color-text)]">{payload.cost} cr</strong>, mas
          seu saldo é <strong className="text-amber-400">{payload.balance} cr</strong>.
        </p>

        {/* Balance display */}
        <div className="rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-3 mb-5 flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-secondary)]">Saldo atual</span>
          <span className="text-sm font-bold text-amber-400 tabular-nums">{payload.balance} créditos</span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Link
            href="/settings/billing"
            onClick={() => setPayload(null)}
            className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--color-accent)] text-black text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <ShoppingCart size={15} />
            Comprar Créditos
          </Link>
          <Link
            href="/settings/billing?tab=upgrade"
            onClick={() => setPayload(null)}
            className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
          >
            <ArrowUpCircle size={15} />
            Fazer Upgrade de Plano
          </Link>
        </div>
      </div>
    </div>
  )
}
