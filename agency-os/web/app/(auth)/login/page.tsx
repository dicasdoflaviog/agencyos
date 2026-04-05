'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'

type View = 'login' | 'signup' | 'signup_sent' | 'forgot' | 'forgot_sent'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function reset(v: View) { setError(''); setView(v) }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou senha inválidos'); setLoading(false) }
    else { router.push('/'); router.refresh() }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    })
    setLoading(false)
    if (error) { setError(error.message) } else {
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name.trim() }),
      }).catch(() => {/* silent — não bloqueia o fluxo */})
      setView('signup_sent')
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setView('forgot_sent')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
      <div className="w-full max-w-[400px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-8">

        {/* ── LOGIN ── */}
        {view === 'login' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Agency OS</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Acesso interno da agência</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:ring-[#F59E0B]/20" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider">Senha</Label>
                  <button type="button" onClick={() => reset('forgot')}
                    className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    className="bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:ring-[#F59E0B]/20 pr-10" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 px-3 py-2 rounded">{error}</p>}
              <Button type="submit" disabled={loading}
                className="w-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer mt-2">
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
              Não tem conta?{' '}
              <button onClick={() => reset('signup')} className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors">
                Criar conta
              </button>
            </p>
          </>
        )}

        {/* ── SIGN UP ── */}
        {view === 'signup' && (
          <>
            <button onClick={() => reset('login')} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-6 transition-colors">
              <ArrowLeft size={13} /> Voltar
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-bold font-display text-[var(--color-text-primary)]">Criar conta</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Preencha os dados para acessar o Agency OS.</p>
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider">Nome completo</Label>
                <Input type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required
                  className="bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:ring-[#F59E0B]/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider">Email</Label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:ring-[#F59E0B]/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    className="bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:ring-[#F59E0B]/20 pr-10" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 px-3 py-2 rounded">{error}</p>}
              <Button type="submit" disabled={loading}
                className="w-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer">
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>
          </>
        )}

        {/* ── SIGNUP SENT ── */}
        {view === 'signup_sent' && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Verifique seu email</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Enviamos um link de confirmação para{' '}
              <span className="text-[var(--color-text-primary)]">{email}</span>.
              Clique no link para ativar sua conta.
            </p>
            <button onClick={() => reset('login')} className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
              Voltar ao login
            </button>
          </div>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <>
            <button onClick={() => reset('login')} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-6 transition-colors">
              <ArrowLeft size={13} /> Voltar
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-bold font-display text-[var(--color-text-primary)]">Redefinir senha</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Enviaremos um link para redefinir sua senha.</p>
            </div>
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider">Email</Label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:ring-[#F59E0B]/20" />
              </div>
              {error && <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 px-3 py-2 rounded">{error}</p>}
              <Button type="submit" disabled={loading}
                className="w-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer">
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
            </form>
          </>
        )}

        {/* ── FORGOT SENT ── */}
        {view === 'forgot_sent' && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Email enviado!</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Verifique sua caixa de entrada em{' '}
              <span className="text-[var(--color-text-primary)]">{email}</span> e clique no link para redefinir sua senha.
            </p>
            <button onClick={() => reset('login')} className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
              Voltar ao login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

