'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bot, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ClientLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/client/outputs` }
      })
      if (error) throw error
      setSent(true)
      toast.success('Link de acesso enviado para seu e-mail!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-accent)]">
            <Bot size={16} className="text-[var(--color-text-inverse)]" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-[var(--color-text-primary)]">Agency OS</span>
        </div>

        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Portal do Cliente</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Digite seu e-mail para receber um link de acesso.
          </p>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)]/10">
                <Mail size={20} className="text-[var(--color-success)]" />
              </div>
              <p className="text-sm text-center text-[var(--color-text-secondary)]">
                Verifique sua caixa de entrada em <span className="text-[var(--color-text-primary)] font-medium">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Enviar link de acesso
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
