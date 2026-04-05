'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Workspace } from '@/types/database'

export function WorkspaceSettingsForm({ initialData }: { initialData: Workspace | null }) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(initialData?.name ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? '')
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color ?? '#F59E0B')
  const [domain, setDomain] = useState(initialData?.domain ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          domain: domain || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao salvar')
      }
      toast.success('Workspace atualizado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          Nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do workspace"
          required
          className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="meu-workspace"
          className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
      </div>

      {/* Primary color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          Cor Principal
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-0.5"
          />
          <div
            className="h-9 w-9 rounded border border-[var(--color-border-subtle)]"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">{primaryColor}</span>
        </div>
      </div>

      {/* Logo URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          URL do Logo
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 rounded object-contain" />
        )}
      </div>

      {/* Domain */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          Domínio
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="app.minhaagencia.com.br"
          className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  )
}
