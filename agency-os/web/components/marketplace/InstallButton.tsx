'use client'
import { useState } from 'react'
import { MarketplaceAgent } from '@/types/database'

interface Props {
  agent: MarketplaceAgent
  isInstalled: boolean
}

export function InstallButton({ agent, isInstalled: initialInstalled }: Props) {
  const [installed, setInstalled] = useState(initialInstalled)
  const [loading, setLoading] = useState(false)

  async function handleInstall() {
    if (installed || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id }),
      })
      if (res.ok) setInstalled(true)
    } finally {
      setLoading(false)
    }
  }

  const label = installed
    ? 'Instalado ✓'
    : loading
    ? 'Processando...'
    : agent.price_type === 'free'
    ? 'Instalar'
    : agent.price_type === 'subscription'
    ? 'Assinar'
    : 'Comprar'

  return (
    <button
      onClick={handleInstall}
      disabled={installed || loading}
      className={`w-full rounded px-4 py-2 text-sm font-medium transition-colors ${
        installed
          ? 'bg-green-500/10 text-green-400 cursor-default'
          : 'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed'
      }`}
    >
      {label}
    </button>
  )
}
