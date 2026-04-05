'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase exchanges the code from URL automatically on load
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <div className="w-full max-w-[400px] rounded-lg border border-white/[0.07] bg-[#18181B] p-8">

        {done ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#FAFAFA] mb-2">Senha redefinida!</h2>
            <p className="text-sm text-[#A1A1AA]">Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-[#FAFAFA]">Nova senha</h1>
              <p className="mt-1 text-sm text-[#A1A1AA]">Escolha uma senha forte para sua conta.</p>
            </div>

            {!ready && (
              <p className="text-xs text-[#A1A1AA] bg-white/[0.04] px-3 py-2 rounded mb-4">
                Validando link... Se demorar, tente abrir o link do email novamente.
              </p>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    type={show ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#A1A1AA]"
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
                  Confirmar Senha
                </Label>
                <Input
                  type={show ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
                />
              </div>

              {error && (
                <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 px-3 py-2 rounded">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || !ready}
                className="w-full bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] transition-colors cursor-pointer"
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
