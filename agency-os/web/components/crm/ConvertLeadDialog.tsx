'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserCheck, X } from 'lucide-react'

interface Props {
  leadId: string
  leadName: string
}

export function ConvertLeadDialog({ leadId, leadName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleConvert() {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
      })
      const data = await res.json() as { client_id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao converter lead')
      toast.success('Lead convertido em cliente!')
      router.push(`/clients/${data.client_id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded bg-[#F59E0B] px-3 py-1.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D97706] transition-colors"
      >
        <UserCheck size={14} />
        Converter em Cliente
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-white/[0.07] bg-[#18181B] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#FAFAFA]">Converter Lead em Cliente</h2>
          <button onClick={() => setOpen(false)} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-[#A1A1AA] mb-6">
          Deseja converter <span className="text-[#FAFAFA] font-medium">{leadName}</span> em um cliente? Isso criará um novo registro de cliente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded border border-white/[0.07] px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConvert}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D97706] disabled:opacity-60 transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
