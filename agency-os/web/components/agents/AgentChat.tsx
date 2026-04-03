'use client'
import { useState } from 'react'
import { Loader2, Zap, RotateCcw, Check, X } from 'lucide-react'
import { AGENTS, type AgentId } from '@/lib/anthropic/agents'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface AgentChatProps {
  agentId: AgentId
  jobId: string
  clientId: string
  onOutputSaved?: (outputId: string) => void
}

type Stage = 'idle' | 'loading' | 'output' | 'revision'

interface OutputData {
  outputId: string
  content: string
  agentName: string
}

export function AgentChat({ agentId, jobId, clientId, onOutputSaved }: AgentChatProps) {
  const agent = AGENTS[agentId]
  const [message, setMessage] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [output, setOutput] = useState<OutputData | null>(null)
  const [revisionNote, setRevisionNote] = useState('')
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'revision' | null>(null)

  async function handleRun() {
    if (!message.trim() || stage === 'loading') return
    setStage('loading')
    setOutput(null)
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, jobId, clientId, userMessage: message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOutput(data)
      setStage('output')
      onOutputSaved?.(data.outputId)
    } catch (err) {
      console.error(err)
      setStage('idle')
    }
  }

  async function patchStatus(status: string, feedback?: string) {
    if (!output) return
    const key = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'revision'
    setActionLoading(key as typeof actionLoading)
    await fetch(`/api/outputs/${output.outputId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedback }),
    })
    setActionLoading(null)
    if (status === 'approved' || status === 'rejected') {
      setStage('idle')
      setMessage('')
      setOutput(null)
    } else {
      setStage('revision')
    }
  }

  async function handleRevisionSubmit() {
    if (!output || !revisionNote.trim()) return
    await patchStatus('revision', revisionNote)
    setRevisionNote('')
    setStage('idle')
    setMessage('')
    setOutput(null)
  }

  const inputClass = 'bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B] resize-none'

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F59E0B] text-[11px] font-bold text-[#0A0A0A]">
          {agent.name[0]}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">{agent.name}</p>
          <p className="text-[11px] text-[#A1A1AA]">{agent.role}</p>
        </div>
      </div>

      {/* Input */}
      {stage !== 'output' && stage !== 'revision' && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Brief ou mensagem para ${agent.name}…`}
            className={inputClass}
            rows={5}
            disabled={stage === 'loading'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleRun()
            }}
          />
          <Button
            onClick={handleRun}
            disabled={!message.trim() || stage === 'loading'}
            className="self-end bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] cursor-pointer disabled:opacity-50"
          >
            {stage === 'loading' ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Processando…
              </>
            ) : (
              <>
                <Zap size={14} className="mr-1.5" strokeWidth={2.5} />
                Acionar
              </>
            )}
          </Button>
        </div>
      )}

      {/* Output */}
      {stage === 'output' && output && (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-white/[0.07] bg-[#0D0D0D] p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#D4D4D8] font-sans">
              {output.content}
            </pre>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={actionLoading === 'approve'}
              onClick={() => patchStatus('approved')}
              className="bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 hover:bg-[#22C55E]/20 cursor-pointer"
            >
              {actionLoading === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="mr-1" />}
              Salvar aprovado
            </Button>
            <Button
              size="sm"
              disabled={actionLoading === 'revision'}
              onClick={() => patchStatus('revision')}
              variant="ghost"
              className="border border-white/10 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.05] cursor-pointer"
            >
              {actionLoading === 'revision' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} className="mr-1" />}
              Pedir revisão
            </Button>
            <Button
              size="sm"
              disabled={actionLoading === 'reject'}
              onClick={() => patchStatus('rejected')}
              variant="ghost"
              className="border border-white/10 text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/5 cursor-pointer"
            >
              {actionLoading === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} className="mr-1" />}
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* Revision note */}
      {stage === 'revision' && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="Descreva o que precisa ser ajustado…"
            className={cn(inputClass, 'border-[#F59E0B]/30')}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleRevisionSubmit}
              disabled={!revisionNote.trim()}
              className="bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] cursor-pointer"
            >
              Enviar feedback
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStage('output')}
              className="border border-white/10 text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
            >
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
