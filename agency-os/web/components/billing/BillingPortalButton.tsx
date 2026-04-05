'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface BillingPortalButtonProps {
  customerId: string
}

export function BillingPortalButton({ customerId }: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Erro ao abrir portal')
      }
      router.push(data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir portal Stripe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Redirecionando...' : 'Gerenciar assinatura'}
    </button>
  )
}
