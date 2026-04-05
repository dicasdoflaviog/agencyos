'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { VersionDiff } from './VersionDiff'
import { RotateCcw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { OutputVersion } from '@/types/database'

interface Props {
  outputId: string
  currentContent: string
}

export function VersionHistory({ outputId, currentContent }: Props) {
  const [versions, setVersions] = useState<OutputVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/outputs/${outputId}/versions`)
      .then(r => r.json())
      .then((data: OutputVersion[]) => setVersions(data))
      .catch(() => toast.error('Erro ao carregar versões'))
      .finally(() => setLoading(false))
  }, [outputId])

  async function handleRollback(versionId: string) {
    setRollingBack(versionId)
    try {
      const res = await fetch(`/api/outputs/${outputId}/versions/${versionId}/rollback`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao restaurar versão')
      toast.success('Versão restaurada! Output voltou para rascunho.')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setRollingBack(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={20} className="animate-spin text-[var(--color-text-secondary)]" />
    </div>
  )

  if (!versions.length) return (
    <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">Nenhuma versão anterior encontrada.</p>
  )

  return (
    <div className="space-y-2">
      {versions.map(v => (
        <div key={v.id} className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-3 p-3">
            <button
              onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              {expandedId === v.id ? <ChevronDown size={14} className="text-[var(--color-text-secondary)]" /> : <ChevronRight size={14} className="text-[var(--color-text-secondary)]" />}
              <span className="text-xs font-medium text-[var(--color-text-primary)]">v{v.version_number}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{formatDate(v.created_at)}</span>
              {v.change_note && <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[200px]">— {v.change_note}</span>}
            </button>
            <button
              onClick={() => handleRollback(v.id)}
              disabled={rollingBack === v.id}
              className="flex items-center gap-1.5 rounded border border-[var(--color-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] transition-colors disabled:opacity-50"
            >
              {rollingBack === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Restaurar
            </button>
          </div>
          {expandedId === v.id && (
            <div className="border-t border-[var(--color-border-subtle)] p-3">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Diferença em relação ao conteúdo atual:</p>
              <VersionDiff oldContent={v.content} newContent={currentContent} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
