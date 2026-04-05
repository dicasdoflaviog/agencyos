import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

async function getWorkspaces() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

async function getSubscriptions() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('subscriptions').select('workspace_id, plan, status')
  return data ?? []
}

export default async function AdminWorkspacesPage() {
  const [workspaces, subscriptions] = await Promise.all([getWorkspaces(), getSubscriptions()])

  const subMap = new Map(subscriptions.map(s => [s.workspace_id, s]))

  const planColors: Record<string, string> = {
    starter: 'bg-blue-500/10 text-blue-400',
    pro: 'bg-purple-500/10 text-purple-400',
    agency: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Workspaces</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{workspaces.length} workspaces cadastradas</p>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Plano</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Criada em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {workspaces.map(ws => {
              const sub = subMap.get(ws.id)
              return (
                <tr key={ws.id} className="border-b border-[var(--color-border-subtle)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{ws.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{ws.slug}</td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${planColors[sub.plan] ?? 'bg-white/5 text-[var(--color-text-secondary)]'}`}>
                        {sub.plan}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${sub?.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-[var(--color-text-secondary)]'}`}>
                      {sub?.status ?? 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{new Date(ws.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/workspaces/${ws.id}`} className="text-xs text-[var(--color-accent)] hover:underline">
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {workspaces.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Nenhuma workspace encontrada</div>
        )}
      </div>
    </div>
  )
}
