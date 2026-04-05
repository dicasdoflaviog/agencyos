import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MemberList } from '@/components/team/MemberList'
import { InviteMemberForm } from './InviteMemberForm'

export default async function TeamSettingsPage() {
  const supabase = await createClient()

  const [{ data: members }, { data: pendingInvites }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('*, profile:profiles(id, name, email, avatar_url)')
      .order('created_at', { ascending: true }),
    supabase
      .from('invite_tokens')
      .select('*')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Users size={20} className="text-[#F59E0B]" />
          <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">Equipe</h2>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          Gerencie os membros da sua equipe e seus níveis de acesso.
        </p>
      </div>

      <div className="space-y-5">
        <MemberList
          members={members ?? []}
          pendingInvites={pendingInvites ?? []}
        />
        <InviteMemberForm />
      </div>
    </div>
  )
}
