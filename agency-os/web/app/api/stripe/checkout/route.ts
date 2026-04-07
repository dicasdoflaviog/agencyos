import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { price_id?: string; workspace_id?: string }
  const { price_id, workspace_id } = body

  if (!price_id) {
    return NextResponse.json({ error: 'price_id is required' }, { status: 400 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ url: '/settings/billing?demo=true' })
  }

  // Fetch workspace_id from DB if not provided
  let resolvedWorkspaceId = workspace_id
  if (!resolvedWorkspaceId) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    resolvedWorkspaceId = ws?.id
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('line_items[0][price]', price_id)
  params.append('line_items[0][quantity]', '1')
  params.append('subscription_data[trial_period_days]', '14')
  if (resolvedWorkspaceId) {
    params.append('subscription_data[metadata][workspace_id]', resolvedWorkspaceId)
  }
  params.append('customer_email', user.email ?? '')
  params.append('success_url', `${baseUrl}/settings/billing?success=true`)
  params.append('cancel_url', `${baseUrl}/settings/billing`)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const err = await response.json() as { error?: { message?: string } }
    return NextResponse.json({ error: err.error?.message ?? 'Stripe error' }, { status: 500 })
  }

  const session = await response.json() as { url: string }
  return NextResponse.json({ url: session.url })
}
