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
    agency: 'text-[var(--color-accent)]',
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/workspaces" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">← Workspaces</Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{workspace.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription */}
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Assinatura</h2>
          {subscription ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">Plano</dt>
                <dd className={`font-medium ${planColors[subscription.plan] ?? 'text-[var(--color-text-primary)]'}`}>{subscription.plan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">Status</dt>
                <dd className={subscription.status === 'active' ? 'text-green-400' : 'text-[var(--color-text-secondary)]'}>{subscription.status}</dd>
              </div>
              {subscription.current_period_end && (
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Renova em</dt>
                  <dd className="text-[var(--color-text-primary)]">{new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Sem assinatura ativa</p>
          )}
        </div>

        {/* Members */}
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Membros ({members.length})</h2>
          <div className="space-y-2">
            {members.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">{m.role}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{m.accepted_at ? 'Ativo' : 'Pendente'}</span>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Nenhum membro</p>}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Jobs Recentes</h2>
          {jobs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Título</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-2 text-[var(--color-text-primary)]">{j.title}</td>
                    <td className="py-2 text-[var(--color-text-secondary)]">{j.status}</td>
                    <td className="py-2 text-[var(--color-text-secondary)]">{new Date(j.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhum job</p>
          )}
        </div>
      </div>
    </div>
  )
}
