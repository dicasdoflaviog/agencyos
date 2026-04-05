import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.workspace_id) {
    return NextResponse.json({ balance: 0, plan: 'starter', transactions: [], usage: {} })
  }

  const wsId = profile.workspace_id

  const [{ data: workspace }, { data: subscription }, { data: transactions }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('credit_balance, credits_granted_at')
      .eq('id', wsId)
      .single(),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('credit_transactions')
      .select('id, amount, type, agent_used, description, balance_after, created_at')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Calcular uso deste mês por agente
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthlyUsage: Record<string, number> = {}
  let totalSpentThisMonth = 0

  for (const tx of transactions ?? []) {
    if (tx.type === 'usage' && tx.created_at >= monthStart) {
      const key = tx.agent_used ?? 'other'
      monthlyUsage[key] = (monthlyUsage[key] ?? 0) + Math.abs(tx.amount)
      totalSpentThisMonth += Math.abs(tx.amount)
    }
  }

  return NextResponse.json({
    balance: workspace?.credit_balance ?? 0,
    plan: subscription?.plan ?? 'starter',
    planStatus: subscription?.status ?? 'trialing',
    periodEnd: subscription?.current_period_end ?? null,
    grantedAt: workspace?.credits_granted_at ?? null,
    transactions: (transactions ?? []).slice(0, 20),
    usage: {
      thisMonth: totalSpentThisMonth,
      byAgent: monthlyUsage,
    },
  })
}
