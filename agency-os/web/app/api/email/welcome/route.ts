import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'email e name são obrigatórios' }, { status: 400 })
    }

    await sendWelcomeEmail(email, name)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/welcome]', err)
    return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
  }
}
