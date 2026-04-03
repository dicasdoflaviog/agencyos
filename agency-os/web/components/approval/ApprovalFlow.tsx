'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { ApprovalStage, OutputApprovalEvent } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const STAGES: { value: ApprovalStage; label: string; color: string }[] = [
  { value: 'draft', label: 'Rascunho', color: 'text-zinc-400 bg-zinc-800' },
  { value: 'internal_review', label: 'Revisão interna', color: 'text-yellow-400 bg-yellow-500/10' },
  { value: 'client_review', label: 'Revisão do cliente', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'approved', label: 'Aprovado', color: 'text-green-400 bg-green-500/10' },
  { value: 'published', label: 'Publicado', color: 'text-violet-400 bg-violet-500/10' },
  { value: 'rejected', label: 'Rejeitado', color: 'text-red-400 bg-red-500/10' },
]

const NEXT_STAGES: Partial<Record<ApprovalStage, ApprovalStage[]>> = {
  draft: ['internal_review', 'rejected'],
  internal_review: ['client_review', 'approved', 'rejected'],
  client_review: ['approved', 'rejected'],
  approved: ['published'],
  rejected: ['draft'],
}

type Props = {
  outputId: string
  currentStage: ApprovalStage
  history: OutputApprovalEvent[]
  onStageChange?: (newStage: ApprovalStage) => void
}

export default function ApprovalFlow({ outputId, currentStage, history, onStageChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [selectedStage, setSelectedStage] = useState<ApprovalStage | null>(null)

  const currentStageInfo = STAGES.find((s) => s.value === currentStage)
  const nextOptions = NEXT_STAGES[currentStage] ?? []

  async function handleAdvance() {
    if (!selectedStage) return
    setLoading(true)

    try {
      const res = await fetch(`/api/outputs/${outputId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_stage: selectedStage, notes }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao atualizar estágio')
      }

      toast.success(`Output avançado para: ${STAGES.find((s) => s.value === selectedStage)?.label}`)
      setNotes('')
      setSelectedStage(null)
      onStageChange?.(selectedStage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Estágio atual */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Estágio atual:</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${currentStageInfo?.color}`}>
          {currentStageInfo?.label}
        </span>
      </div>

      {/* Ações disponíveis */}
      {nextOptions.length > 0 && (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium text-zinc-400">Avançar para:</p>
          <div className="flex flex-wrap gap-2">
            {nextOptions.map((stage) => {
              const s = STAGES.find((st) => st.value === stage)
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(stage === selectedStage ? null : stage)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                    selectedStage === stage
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : `border-zinc-700 ${s?.color} hover:border-zinc-500`
                  }`}
                >
                  {s?.label}
                </button>
              )
            })}
          </div>

          {selectedStage && (
            <>
              <Textarea
                placeholder="Observações (opcional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleAdvance}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Salvando...' : `Confirmar → ${STAGES.find((s) => s.value === selectedStage)?.label}`}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Timeline de aprovação */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">Histórico</p>
          <div className="space-y-2">
            {history.map((event) => (
              <div key={event.id} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 mt-1.5" />
                  <div className="flex-1 w-px bg-zinc-800" />
                </div>
                <div className="pb-2">
                  <p className="text-zinc-300">
                    {event.from_stage ? (
                      <>
                        <span className="text-zinc-500">{STAGES.find((s) => s.value === event.from_stage)?.label}</span>
                        {' → '}
                        <span className="font-medium">{STAGES.find((s) => s.value === event.to_stage)?.label}</span>
                      </>
                    ) : (
                      <span className="font-medium">{STAGES.find((s) => s.value === event.to_stage)?.label}</span>
                    )}
                  </p>
                  {event.notes && <p className="text-zinc-500 mt-0.5">{event.notes}</p>}
                  <p className="text-zinc-600 mt-0.5">
                    {new Date(event.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
