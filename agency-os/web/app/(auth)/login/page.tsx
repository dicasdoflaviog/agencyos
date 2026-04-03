'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <div className="w-full max-w-[400px] rounded-lg border border-white/[0.07] bg-[#18181B] p-8">
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
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
            />
          </div>
          {error && (
            <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 px-3 py-2 rounded">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] transition-colors duration-150 cursor-pointer mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
