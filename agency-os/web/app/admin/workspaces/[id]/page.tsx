import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

async function getWorkspaceDetail(id: string) {
  const supabase = createAdminClient()

  const [{ data: workspace }, { data: subscription }, { data: members }, { data: jobs }] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', id).single(),
    supabase.from('subscriptions').select('*').eq('workspace_id', id).maybeSingle(),
    supabase.from('workspace_members').select('id, role, accepted_at, created_at').eq('workspace_id', id),
    supabase.from('jobs').select('id, title, status, created_at').eq('workspace_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  return { workspace, subscription, members: members ?? [], jobs: jobs ?? [] }
}

export default async function AdminWorkspaceDetailPage({ params }: Props) {
  const { id } = await params
  const { workspace, subscription, members, jobs } = await getWorkspaceDetail(id)
  if (!workspace) notFound()

  const planColors: Record<string, string> = {
    starter: 'text-blue-400',
    pro: 'text-purple-400',
    agency: 'text-[#F59E0B]',
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/workspaces" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA]">← Workspaces</Link>
        <span className="text-[#52525B]">/</span>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">{workspace.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription */}
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Assinatura</h2>
          {subscription ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#A1A1AA]">Plano</dt>
                <dd className={`font-medium ${planColors[subscription.plan] ?? 'text-[#FAFAFA]'}`}>{subscription.plan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1AA]">Status</dt>
                <dd className={subscription.status === 'active' ? 'text-green-400' : 'text-[#A1A1AA]'}>{subscription.status}</dd>
              </div>
              {subscription.current_period_end && (
                <div className="flex justify-between">
                  <dt className="text-[#A1A1AA]">Renova em</dt>
                  <dd className="text-[#FAFAFA]">{new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-[#71717A]">Sem assinatura ativa</p>
          )}
        </div>

        {/* Members */}
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Membros ({members.length})</h2>
          <div className="space-y-2">
            {members.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-[#A1A1AA]">{m.role}</span>
                <span className="text-xs text-[#52525B]">{m.accepted_at ? 'Ativo' : 'Pendente'}</span>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-[#71717A]">Nenhum membro</p>}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Jobs Recentes</h2>
          {jobs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Título</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Status</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-b border-white/[0.04]">
                    <td className="py-2 text-[#FAFAFA]">{j.title}</td>
                    <td className="py-2 text-[#A1A1AA]">{j.status}</td>
                    <td className="py-2 text-[#A1A1AA]">{new Date(j.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-[#71717A]">Nenhum job</p>
          )}
        </div>
      </div>
    </div>
  )
}
