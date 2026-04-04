import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_invite', req.nextUrl.origin))
  }

  const supabase = createAdminClient()

  // Find valid, unused invite
  const { data: invite, error: inviteErr } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteErr || !invite) {
    return NextResponse.redirect(new URL('/login?error=invalid_invite', req.nextUrl.origin))
  }

  // Mark invite as used
  await supabase
    .from('invite_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Look up profile by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', invite.email)
    .single()

  if (profile) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (!existing) {
      await supabase.from('workspace_members').insert({
        user_id: profile.id,
        role: invite.role,
        invited_by: invite.invited_by,
        accepted_at: new Date().toISOString(),
      })
    } else {
      // Update role if already member
      await supabase
        .from('workspace_members')
        .update({ role: invite.role })
        .eq('user_id', profile.id)
    }
  }

  return NextResponse.redirect(new URL('/login?message=invite_accepted', req.nextUrl.origin))
}
