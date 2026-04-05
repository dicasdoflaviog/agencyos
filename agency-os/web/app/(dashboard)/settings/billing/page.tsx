import { createClient } from '@/lib/supabase/server'
import { CreditCard, Zap } from 'lucide-react'
import { PlanCard } from '@/components/billing/PlanCard'
import { BillingPortalButton } from '@/components/billing/BillingPortalButton'
import { CreditBalance } from '@/components/billing/CreditBalance'

export const metadata = { title: 'Faturamento | Agency OS' }

const PLANS = [
  {
    plan: 'starter' as const,
    price: 'R$497',
    priceId: process.env.STRIPE_PRICE_ID_STARTER ?? 'price_starter',
    credits: '500 créditos/mês',
    features: [
      '1 usuário',
      '3 clientes ativos',
      '500 créditos de IA/mês',
      'Agendamento de posts',
      'CMS básico',
      'Suporte por email',
    ],
  },
  {
    plan: 'pro' as const,
    price: 'R$997',
    priceId: process.env.STRIPE_PRICE_ID_PRO ?? 'price_pro',
    credits: '1.500 créditos/mês',
    features: [
      '5 usuários',
      'Clientes ilimitados',
      '1.500 créditos de IA/mês',
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
    credits: '5.000 créditos/mês',
    features: [
      'Usuários ilimitados',
      'White-label',
      '5.000 créditos de IA/mês',
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <CreditCard size={20} className="text-[var(--color-accent)]" />
          <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Faturamento</h2>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Gerencie sua assinatura, créditos e histórico de uso de IA.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT — Credits */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-white">Créditos de IA</h3>
          </div>
          <CreditBalance />
        </div>

        {/* RIGHT — Subscription */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={15} className="text-[var(--color-text-secondary)]" />
            <h3 className="text-sm font-semibold text-white">Assinatura</h3>
          </div>

          {/* Current plan */}
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Plano Atual</p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">
              {currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : 'Sem assinatura'}
            </p>
            {subStatus && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Status: <span className="text-[var(--color-text-primary)] font-medium capitalize">{subStatus}</span>
                {periodEnd && (
                  <> · Renova em <span className="text-[var(--color-text-primary)] font-medium">{periodEnd}</span></>
                )}
              </p>
            )}
            {!subStatus && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Você está no modo de teste. Assine um plano para liberar todos os recursos.
              </p>
            )}
            {customerId && (
              <div className="mt-4">
                <BillingPortalButton customerId={customerId} />
              </div>
            )}
          </div>

          {/* Plan comparison */}
          <div className="space-y-3">
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
      </div>
    </div>
  )
}

