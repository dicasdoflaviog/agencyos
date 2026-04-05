'use client'
import { useState } from 'react'
import Link from 'next/link'

interface WorkspaceRow {
  id: string
  name: string
  slug: string
  created_at: string
}

interface Props {
  workspaces: WorkspaceRow[]
}

export function WorkspaceTable({ workspaces }: Props) {
  const [search, setSearch] = useState('')

  const filtered = workspaces.filter(
    ws => ws.name.toLowerCase().includes(search.toLowerCase()) || ws.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-[var(--color-accent)]/50 focus:outline-none"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Nome</th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Slug</th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Criada</th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ws => (
              <tr key={ws.id} className="border-b border-[var(--color-border-subtle)] transition-colors hover:bg-white/[0.02]">
                <td className="py-3 font-medium text-[var(--color-text-primary)]">{ws.name}</td>
                <td className="py-3 text-[var(--color-text-secondary)]">{ws.slug}</td>
                <td className="py-3 text-[var(--color-text-secondary)]">{new Date(ws.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="py-3">
                  <Link href={`/admin/workspaces/${ws.id}`} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
                    Detalhes →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            {search ? 'Nenhum resultado encontrado' : 'Nenhuma workspace'}
          </div>
        )}
      </div>
    </div>
  )
}
