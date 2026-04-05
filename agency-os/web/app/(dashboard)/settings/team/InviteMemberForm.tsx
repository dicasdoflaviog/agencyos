'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function InviteMemberForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'collaborator' | 'viewer'>('collaborator')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Informe o e-mail do convidado')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao enviar convite')
        return
      }
      toast.success('Convite enviado com sucesso!')
      setEmail('')
      setRole('collaborator')
      router.refresh()
    } catch {
      toast.error('Erro ao enviar convite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Convidar membro</h3>
      <p className="mb-4 text-xs text-[var(--color-text-secondary)]">Envie um convite por e-mail para adicionar alguém à equipe.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colaborador@empresa.com"
            required
            className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[#F59E0B]/30 transition-colors"
          />
        </div>

        <div className="w-full sm:w-44">
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Papel</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'collaborator' | 'viewer')}
            className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[#F59E0B]/30 transition-colors cursor-pointer"
          >
            <option value="collaborator">Colaborador</option>
            <option value="viewer">Visualizador</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <UserPlus size={15} strokeWidth={2.5} />
          )}
          {loading ? 'Enviando…' : 'Enviar convite'}
        </button>
      </form>
    </div>
  )
}
