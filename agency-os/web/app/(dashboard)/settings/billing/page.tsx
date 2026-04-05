import { createClient } from '@/lib/supabase/server'
import { CreditCard } from 'lucide-react'
import { PlanCard } from '@/components/billing/PlanCard'
import { BillingPortalButton } from '@/components/billing/BillingPortalButton'

const PLANS = [
  {
    plan: 'starter' as const,
    price: 'R$497',
    priceId: process.env.STRIPE_PRICE_ID_STARTER ?? 'price_starter',
    features: [
      '1 usuário',
      '3 clientes ativos',
      'Agendamento de posts',
      'CMS básico',
      'Suporte por email',
    ],
  },
  {
    plan: 'pro' as const,
    price: 'R$997',
    priceId: process.env.STRIPE_PRICE_ID_PRO ?? 'price_pro',
    features: [
      '5 usuários',
      'Clientes ilimitados',
      'Analytics avançado',
      'CRM integrado',
      'Relatórios automáticos',
      'Suporte prioritário',
    ],
  },
  {
    plan: 'agency' as const,
    price: 'R$1997',
    priceId: process.env.STRIPE_PRICE_ID_AGENCY ?? 'price_agency',
    features: [
      'Usuários ilimitados',
      'White-label',
      'Multi-workspace',
      'API access',
      'Onboarding dedicado',
      'SLA 99.9%',
    ],
  },
]

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentPlan = subscription?.plan ?? null
  const subStatus = subscription?.status ?? null
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null
  const customerId = subscription?.stripe_customer_id ?? null

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <CreditCard size={20} className="text-[#F59E0B]" />
          <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">Faturamento</h2>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          Gerencie sua assinatura e plano de cobrança.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-[#18181B] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Plano Atual</p>
            <p className="mt-1 text-xl font-bold font-display text-[#FAFAFA]">
              {currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : 'Teste Gratuito'}
            </p>
            {subStatus && (
              <p className="mt-0.5 text-sm text-zinc-400">
                Status: <span className="text-zinc-200 font-medium capitalize">{subStatus}</span>
                {periodEnd && (
                  <> · Renova em <span className="text-zinc-200 font-medium">{periodEnd}</span></>
                )}
              </p>
            )}
          </div>
          {customerId && (
            <BillingPortalButton customerId={customerId} />
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map(p => (
          <PlanCard
            key={p.plan}
            plan={p.plan}
            price={p.price}
            features={p.features}
            current={currentPlan === p.plan}
            priceId={p.priceId}
          />
        ))}
      </div>
    </div>
  )
}
