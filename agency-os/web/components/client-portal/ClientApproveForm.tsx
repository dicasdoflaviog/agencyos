'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { ThumbsUp, RotateCcw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  outputId: string
}

export function ClientApproveForm({ outputId }: Props) {
  const [action, setAction] = useState<'approved' | 'rejected'>('approved')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/outputs/${outputId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_stage: action, notes }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao processar aprovação')
      }
      toast.success(action === 'approved' ? 'Conteúdo aprovado!' : 'Revisão solicitada!')
      router.push('/client/outputs')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#18181B] p-6">
      <h2 className="text-sm font-semibold text-[#FAFAFA] mb-4">Sua avaliação</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAction('approved')}
            className={`flex items-center justify-center gap-2 rounded border py-3 text-sm font-medium transition-colors ${
              action === 'approved'
                ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]'
                : 'border-white/[0.07] text-[#A1A1AA] hover:border-white/[0.12] hover:text-[#FAFAFA]'
            }`}
          >
            <ThumbsUp size={15} />
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => setAction('rejected')}
            className={`flex items-center justify-center gap-2 rounded border py-3 text-sm font-medium transition-colors ${
              action === 'rejected'
                ? 'border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]'
                : 'border-white/[0.07] text-[#A1A1AA] hover:border-white/[0.12] hover:text-[#FAFAFA]'
            }`}
          >
            <RotateCcw size={15} />
            Solicitar revisão
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
            {action === 'approved' ? 'Comentário (opcional)' : 'O que precisa ser ajustado?'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={action === 'approved' ? 'Algum comentário...' : 'Descreva os ajustes necessários...'}
            className="w-full rounded border border-white/[0.07] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-[#F59E0B] resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D97706] disabled:opacity-60 transition-colors"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Confirmar
        </button>
      </form>
    </div>
  )
}
