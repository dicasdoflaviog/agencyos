import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { email, role } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
  }
  if (!['collaborator', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  const { error } = await supabase.from('invite_tokens').insert({
    email: email.toLowerCase().trim(),
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/team/invite/accept?token=${token}`

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@agencyos.app',
        to: email,
        subject: 'Você foi convidado para a equipe',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Convite para equipe</h2>
            <p style="color:#71717a;margin-bottom:24px">
              Você foi convidado para colaborar. Clique no botão abaixo para aceitar o convite.
            </p>
            <a href="${acceptUrl}"
               style="display:inline-block;background:#F59E0B;color:#0A0A0A;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none">
              Aceitar convite
            </a>
            <p style="margin-top:24px;font-size:12px;color:#a1a1aa">
              Este convite expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo.
            </p>
          </div>
        `,
      })
    } catch (mailErr) {
      console.error('[invite] Failed to send email:', mailErr)
      // Non-fatal — token already created
    }
  }

  return NextResponse.json({ success: true, token }, { status: 201 })
}
