import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientOutputList } from '@/components/client-portal/ClientOutputList'

export default async function ClientOutputsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) {
    return (
      <div className="text-center py-12">
        <p className="text-[#A1A1AA] text-sm">Sua conta não está vinculada a nenhum cliente.</p>
      </div>
    )
  }

  const { data: outputs } = await supabase
    .from('job_outputs')
    .select('*, job:jobs(id, title)')
    .eq('client_id', profile.client_id)
    .in('approval_stage', ['client_review', 'approved', 'published'])
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Meus Conteúdos</h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">{outputs?.length ?? 0} conteúdo{(outputs?.length ?? 0) !== 1 ? 's' : ''}</p>
      </div>
      <ClientOutputList outputs={outputs ?? []} />
    </div>
  )
}
