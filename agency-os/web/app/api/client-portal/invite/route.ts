import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { client_id: string; email: string }
  const { client_id, email } = body

  if (!client_id || !email) {
    return NextResponse.json({ error: 'client_id e email são obrigatórios' }, { status: 400 })
  }

  const { data: invite, error } = await supabase
    .from('client_invites')
    .insert({ client_id, email, invited_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/client-portal/accept?token=${invite.token}`
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@agencyos.app',
        to: email,
        subject: 'Convite para o Portal Agency OS',
        html: `<p>Você foi convidado para acessar o Portal Agency OS.</p><p><a href="${acceptUrl}">Clique aqui para aceitar o convite</a></p><p>Este link expira em 7 dias.</p>`,
      })
    } catch (_err) {
      // E-mail falhou mas convite foi criado
    }
  }

  return NextResponse.json({ token: invite.token, expires_at: invite.expires_at })
}
