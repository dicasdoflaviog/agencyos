import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientOutputList } from '@/components/client-portal/ClientOutputList'
import { FileText } from 'lucide-react'

export default async function ClientOutputsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id, name')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181B] py-16 text-center">
        <FileText size={28} className="text-[#3F3F46] mb-3" />
        <p className="text-sm text-[#A1A1AA]">Sua conta não está vinculada a nenhum cliente.</p>
        <p className="text-xs text-[#71717A] mt-1">Entre em contato com a agência.</p>
      </div>
    )
  }

  const { data: outputs } = await supabase
    .from('job_outputs')
    .select('*, job:jobs(id, title)')
    .eq('client_id', profile.client_id)
    .in('approval_stage', ['client_review', 'approved', 'published'])
    .order('created_at', { ascending: false })

  const pendingCount = outputs?.filter(o => o.approval_stage === 'client_review').length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">
          Olá{profile.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          {pendingCount > 0
            ? `Você tem ${pendingCount} conteúdo${pendingCount > 1 ? 's' : ''} aguardando sua aprovação.`
            : outputs?.length
            ? `${outputs.length} conteúdo${outputs.length > 1 ? 's' : ''} disponível${outputs.length > 1 ? 'is' : ''}.`
            : 'Nenhum conteúdo disponível ainda.'}
        </p>
      </div>
      <ClientOutputList outputs={outputs ?? []} />
    </div>
  )
}
