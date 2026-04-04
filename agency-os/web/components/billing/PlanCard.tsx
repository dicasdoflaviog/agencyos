'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Plan = 'starter' | 'pro' | 'agency'

interface PlanCardProps {
  plan: Plan
  price: string
  features: string[]
  current: boolean
  priceId: string
}

const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

export function PlanCard({ plan, price, features, current, priceId }: PlanCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border p-6 transition-all',
        current
          ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-lg shadow-[#F59E0B]/10'
          : 'border-zinc-800 bg-[#18181B] hover:border-zinc-700',
      )}
    >
      {current && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-[#F59E0B] px-3 py-0.5 text-xs font-semibold text-[#09090B]">
            Plano atual
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className={cn('text-lg font-bold', current ? 'text-[#F59E0B]' : 'text-[#FAFAFA]')}>
          {PLAN_LABELS[plan]}
        </h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={cn('text-3xl font-extrabold', current ? 'text-[#F59E0B]' : 'text-[#FAFAFA]')}>
            {price}
          </span>
          <span className="text-sm text-zinc-500">/mês</span>
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
            <Check size={15} className={cn('mt-0.5 shrink-0', current ? 'text-[#F59E0B]' : 'text-zinc-500')} strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>

      {current ? (
        <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 py-2 text-center text-sm font-semibold text-[#F59E0B]">
          Assinado
        </div>
      ) : (
        <form action="/api/stripe/checkout" method="POST">
          <input type="hidden" name="price_id" value={priceId} />
          <SubscribeButton priceId={priceId} />
        </form>
      )}
    </div>
  )
}

function SubscribeButton({ priceId }: { priceId: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price_id: priceId }),
        })
        const data = await res.json() as { url?: string }
        if (data.url) window.location.href = data.url
      }}
      className="w-full rounded-lg bg-zinc-700 py-2 text-sm font-semibold text-[#FAFAFA] transition-colors hover:bg-zinc-600"
    >
      Assinar
    </button>
  )
}
