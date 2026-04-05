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
    return NextResponse.json({ balance: 0, plan: 'starter', transactions: [] })
  }

  const [{ data: workspace }, { data: transactions }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('credit_balance, plan')
      .eq('id', profile.workspace_id)
      .single(),
    supabase
      .from('credit_transactions')
      .select('id, amount, type, agent_used, description, balance_after, created_at')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return NextResponse.json({
    balance: workspace?.credit_balance ?? 0,
    plan: workspace?.plan ?? 'starter',
    transactions: transactions ?? [],
  })
}
