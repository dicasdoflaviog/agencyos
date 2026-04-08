'use client'

import { useState } from 'react'
import { Check, Trash2, Loader2, Download } from 'lucide-react'

interface AtlasMessageProps {
  imageBase64: string
  mimeType: string
  assetId?: string
  format?: string
  prompt?: string
}

export function AtlasMessage({ imageBase64, mimeType, assetId, format, prompt }: AtlasMessageProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>('pending')
  const imageSrc = `data:${mimeType};base64,${imageBase64}`

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!assetId) return
    setStatus('loading')
    await fetch('/api/agents/atlas/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action }),
    })
    setStatus(action)
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] max-w-sm">
      <div className="relative w-full aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={prompt ?? 'ATLAS criativo'} className="h-full w-full object-cover" />

        {status === 'approved' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
              <Check size={16} /> Aprovado — na galeria
            </span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {format && (
          <span className="text-[10px] rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
            {format}
          </span>
        )}
        {prompt && (
          <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">{prompt}</p>
        )}

        {status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('approved')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 py-1.5 text-xs font-semibold hover:bg-emerald-500/25 transition-all"
            >
              <Check size={12} /> Aprovar
            </button>
            <a
              href={imageSrc}
              download={`atlas-${Date.now()}.png`}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] px-3 py-1.5 text-xs hover:text-[var(--color-text-primary)] transition-all"
            >
              <Download size={12} />
            </a>
            <button
              onClick={() => handleAction('rejected')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 text-xs hover:bg-red-500/20 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-[var(--color-text-muted)]">
            <Loader2 size={12} className="animate-spin" /> Salvando...
          </div>
        )}

        {status === 'rejected' && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">Descartado</p>
        )}
      </div>
    </div>
  )
}
