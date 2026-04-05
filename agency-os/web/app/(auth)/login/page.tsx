'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

type View = 'login' | 'forgot' | 'forgot_sent'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha inválidos')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setView('forgot_sent')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <div className="w-full max-w-[400px] rounded-lg border border-white/[0.07] bg-[#18181B] p-8">

        {/* ── LOGIN ── */}
        {view === 'login' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Agency OS</h1>
              <p className="mt-1 text-sm text-[#A1A1AA]">Acesso interno da agência</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => { setError(''); setView('forgot') }}
                    className="text-xs text-[#F59E0B] hover:text-[#D97706] transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
                />
              </div>
              {error && (
                <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 px-3 py-2 rounded">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] transition-colors duration-150 cursor-pointer mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <>
            <button
              onClick={() => { setError(''); setView('login') }}
              className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#A1A1AA] mb-6 transition-colors"
            >
              <ArrowLeft size={13} /> Voltar
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#FAFAFA]">Redefinir senha</h2>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
                />
              </div>
              {error && (
                <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 px-3 py-2 rounded">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] transition-colors cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
            </form>
          </>
        )}

        {/* ── EMAIL SENT ── */}
        {view === 'forgot_sent' && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#FAFAFA] mb-2">Email enviado!</h2>
            <p className="text-sm text-[#A1A1AA] mb-6">
              Verifique sua caixa de entrada em <span className="text-[#FAFAFA]">{email}</span> e
              clique no link para redefinir sua senha.
            </p>
            <button
              onClick={() => { setView('login'); setEmail('') }}
              className="text-sm text-[#F59E0B] hover:text-[#D97706] transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

