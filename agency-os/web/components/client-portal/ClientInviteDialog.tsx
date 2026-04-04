'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Loader2, Copy, X } from 'lucide-react'

interface Props {
  clientId: string
}

export function ClientInviteDialog({ clientId }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/client-portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, email }),
      })
      const data = await res.json() as { token?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar convite')
      setInviteToken(data.token ?? null)
      toast.success('Convite criado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const inviteUrl = inviteToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/client-portal/accept?token=${inviteToken}` : ''

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded border border-white/[0.07] bg-[#27272A] px-3 py-1.5 text-sm font-medium text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
      >
        <UserPlus size={14} />
        Convidar para Portal
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-white/[0.07] bg-[#18181B] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#FAFAFA]">Convidar para Portal</h2>
          <button onClick={() => { setOpen(false); setInviteToken(null); setEmail('') }} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
            <X size={18} />
          </button>
        </div>

        {inviteToken ? (
          <div className="space-y-4">
            <p className="text-sm text-[#A1A1AA]">Convite criado! Compartilhe o link abaixo:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 rounded border border-white/[0.07] bg-[#27272A] px-3 py-2 text-xs text-[#FAFAFA] truncate"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copiado!') }}
                className="flex items-center gap-1.5 rounded border border-white/[0.07] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
            <button
              onClick={() => { setOpen(false); setInviteToken(null); setEmail('') }}
              className="w-full rounded bg-[#27272A] px-4 py-2 text-sm font-medium text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">E-mail do cliente</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                required
                className="w-full rounded border border-white/[0.07] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded border border-white/[0.07] px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D97706] disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Criar convite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
