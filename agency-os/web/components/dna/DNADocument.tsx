'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dna, RefreshCw, Copy, Check, Clock } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  memoryId: string
  content: string
  createdAt: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">{title}</h3>
      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  )
}

function parseDocument(content: string): { title: string; body: string }[] {
  // Split by markdown H2 (## Section) or bold headings (**Section**)
  const sections: { title: string; body: string }[] = []
  const lines = content.split('\n')
  let current: { title: string; lines: string[] } | null = null

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/)
    const bold = line.match(/^\*\*(.+)\*\*\s*$/)
    const heading = h2?.[1] ?? bold?.[1]

    if (heading) {
      if (current) sections.push({ title: current.title, body: current.lines.join('\n').trim() })
      current = { title: heading, lines: [] }
    } else if (current) {
      current.lines.push(line)
    } else if (line.trim()) {
      current = { title: 'Visão Geral', lines: [line] }
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join('\n').trim() })

  // Fallback: single block
  if (sections.length === 0) return [{ title: 'Brand DNA', body: content }]
  return sections
}

export function DNADocument({ clientId, clientName, memoryId, content, createdAt }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const sections = parseDocument(content)
  const date = new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await fetch(`/api/clients/${clientId}/dna/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memoryId }),
      })
      router.refresh()
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Dna size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Brand DNA — {clientName}</h2>
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Clock size={11} />
              <span>Gerado em {date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-all hover:border-white/20 hover:text-[var(--color-text-primary)]"
          >
            {copied ? <><Check size={12} className="text-green-400" /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-400 transition-all hover:bg-amber-500/10 disabled:opacity-50"
          >
            <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
            Refazer
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((s, i) => (
          <Section key={i} title={s.title}>{s.body || '—'}</Section>
        ))}
      </div>
    </div>
  )
}
