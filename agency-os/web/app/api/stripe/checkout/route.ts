import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json() as { price_id?: string; workspace_id?: string }
  const { price_id } = body

  if (!price_id) {
    return NextResponse.json({ error: 'price_id is required' }, { status: 400 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ url: '/settings/billing?demo=true' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('line_items[0][price]', price_id)
  params.append('line_items[0][quantity]', '1')
  params.append('subscription_data[trial_period_days]', '14')
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
