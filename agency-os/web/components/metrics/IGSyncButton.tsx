'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface IGSyncButtonProps {
  clientId: string
  username?: string | null
}

export function IGSyncButton({ clientId, username }: IGSyncButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    const handle = username?.trim()
    if (!handle) {
      setMessage('Perfil do Instagram não configurado para este cliente.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/integrations/apify/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, username: handle }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      setStatus('success')
      setMessage(`Sincronizado: ${data.metrics.followers.toLocaleString('pt-BR')} seguidores`)
      setTimeout(() => { setStatus('idle'); setMessage('') }, 4000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Erro ao sincronizar')
      setTimeout(() => { setStatus('idle'); setMessage('') }, 5000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-white/20 hover:text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
        {status === 'loading' ? 'Sincronizando...' : '↺ Sincronizar Instagram'}
      </button>
      {status === 'success' && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 size={12} /> {message}
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} /> {message}
        </span>
      )}
    </div>
  )
}
