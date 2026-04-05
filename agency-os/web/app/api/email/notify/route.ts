import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, subject, body, ctaLabel, ctaUrl, type } = await req.json()

    if (!email || !subject || !body) {
      return NextResponse.json({ error: 'email, subject e body são obrigatórios' }, { status: 400 })
    }

    await sendNotificationEmail({ to: email, title: subject, body, ctaLabel, ctaUrl, type })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/notify]', err)
    return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
  }
}
