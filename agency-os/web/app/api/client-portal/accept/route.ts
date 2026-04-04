import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/client/login', req.url))

  const supabase = createAdminClient()

  const { data: invite } = await supabase
    .from('client_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return NextResponse.redirect(new URL('/client/login?error=invalid_token', req.url))
  }

  await supabase
    .from('client_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Look up user by listing users and filtering (admin API)
  const { data: usersData } = await supabase.auth.admin.listUsers()
  const authUser = usersData?.users?.find(u => u.email === invite.email)

  if (authUser) {
    await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        name: invite.email.split('@')[0],
        role: 'client',
        client_id: invite.client_id,
      })
  }

  return NextResponse.redirect(new URL('/client/login?invited=1', req.url))
}
