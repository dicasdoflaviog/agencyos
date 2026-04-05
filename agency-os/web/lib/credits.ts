import { createAdminClient } from '@/lib/supabase/admin'

// ─── Cost table (credits per action) ─────────────────────────────────────────
export const CREDIT_COSTS = {
  oracle_message:     10,
  vox_narration:      30,
  dna_curate:         20,
  knowledge_sync:     10,
  content_generation: 15,
  apify_scrape:       30,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

// Monthly credit grants per plan
const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  starter: 500,
  pro:     1500,
  agency:  5000,
}

// ─── Lazy monthly grant ───────────────────────────────────────────────────────
// Called on every credit check — no cron job needed.
// If the current month differs from last grant month, add the monthly allocation.
async function maybeGrantMonthly(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  balance: number,
  grantedAt: string | null,
  plan: string,
  subStatus: string,
): Promise<number> {
  const now = new Date()
  const last = grantedAt ? new Date(grantedAt) : null
  const differentMonth =
    !last ||
    last.getMonth() !== now.getMonth() ||
    last.getFullYear() !== now.getFullYear()

  if (!differentMonth) return balance

  const isActive = subStatus === 'active' || subStatus === 'trialing'
  const grant = isActive ? (PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.starter) : 0
  const newBalance = balance + grant

  await admin
    .from('workspaces')
    .update({ credit_balance: newBalance, credits_granted_at: now.toISOString() })
    .eq('id', workspaceId)

  if (grant > 0) {
    await admin.from('credit_transactions').insert({
      workspace_id: workspaceId,
      amount: grant,
      type: 'monthly_grant',
      description: `Cota mensal — plano ${plan}`,
      balance_after: newBalance,
    })
  }

  return newBalance
}

// ─── Main function ────────────────────────────────────────────────────────────

export type CreditResult =
  | { ok: true;  balance: number; cost: number }
  | { ok: false; balance: number; cost: number; error: string }

export async function checkAndDeductCredits(
  workspaceId: string,
  action: CreditAction,
  description?: string,
): Promise<CreditResult> {
  const admin = createAdminClient()
  const cost = CREDIT_COSTS[action]

  const { data: ws } = await admin
    .from('workspaces')
    .select('id, credit_balance, credits_granted_at, subscriptions(plan, status)')
    .eq('id', workspaceId)
    .single()

  if (!ws) return { ok: false, balance: 0, cost, error: 'Workspace não encontrado' }

  const sub = Array.isArray(ws.subscriptions) ? ws.subscriptions[0] : ws.subscriptions
  const plan      = (sub as { plan?: string } | null)?.plan      ?? 'starter'
  const subStatus = (sub as { status?: string } | null)?.status  ?? 'trialing'

  // Check & apply monthly grant
  const balance = await maybeGrantMonthly(
    admin,
    workspaceId,
    ws.credit_balance ?? 0,
    ws.credits_granted_at ?? null,
    plan,
    subStatus,
  )

  if (balance < cost) {
    return {
      ok: false,
      balance,
      cost,
      error: `Créditos insuficientes. Saldo: ${balance}, necessário: ${cost}.`,
    }
  }

  const newBalance = balance - cost

  await admin
    .from('workspaces')
    .update({ credit_balance: newBalance })
    .eq('id', workspaceId)

  await admin.from('credit_transactions').insert({
    workspace_id: workspaceId,
    amount: -cost,
    type: 'usage',
    agent_used: action,
    description: description ?? action,
    balance_after: newBalance,
  })

  return { ok: true, balance: newBalance, cost }
}

// ─── Helper: resolve workspaceId from userId ──────────────────────────────────
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id?: string } | null)?.workspace_id ?? null
}
