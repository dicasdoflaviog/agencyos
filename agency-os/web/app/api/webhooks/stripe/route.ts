import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface StripeEvent {
  type: string
  data: {
    object: Record<string, unknown>
  }
}

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = signature.split(',')
  const tPart = parts.find(p => p.startsWith('t='))
  const v1Part = parts.find(p => p.startsWith('v1='))
  if (!tPart || !v1Part) return false

  const timestamp = tPart.slice(2)
  const expectedSig = v1Part.slice(3)
  const signedPayload = `${timestamp}.${payload}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === expectedSig
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const body = await request.text()

  if (webhookSecret) {
    const signature = request.headers.get('stripe-signature') ?? ''
    const valid = await verifyStripeSignature(body, signature, webhookSecret)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let event: StripeEvent
  try {
    event = JSON.parse(body) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        customer?: string
        subscription?: string
        metadata?: { workspace_id?: string }
      }
      if (session.customer && session.subscription) {
        await supabase.from('subscriptions').upsert({
          workspace_id: session.metadata?.workspace_id ?? null,
          stripe_customer_id: session.customer,
          stripe_sub_id: session.subscription,
          plan: 'starter',
          status: 'trialing',
        }, { onConflict: 'stripe_sub_id' })
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string
        status: string
        current_period_end?: number
        items?: { data: Array<{ price: { id: string } }> }
      }
      const priceId = sub.items?.data[0]?.price.id ?? ''
      const plan = resolvePlan(priceId)
      await supabase
        .from('subscriptions')
        .update({
          status: sub.status,
          plan,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        })
        .eq('stripe_sub_id', sub.id)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string }
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_sub_id', sub.id)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string }
      if (invoice.subscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_sub_id', invoice.subscription)
      }
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}

function resolvePlan(priceId: string): 'starter' | 'pro' | 'agency' {
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_ID_AGENCY) return 'agency'
  return 'starter'
}
