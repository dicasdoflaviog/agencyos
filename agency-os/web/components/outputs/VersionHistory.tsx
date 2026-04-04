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
      <Loader2 size={20} className="animate-spin text-[#A1A1AA]" />
    </div>
  )

  if (!versions.length) return (
    <p className="text-sm text-[#A1A1AA] text-center py-8">Nenhuma versão anterior encontrada.</p>
  )

  return (
    <div className="space-y-2">
      {versions.map(v => (
        <div key={v.id} className="rounded border border-white/[0.07] bg-[#18181B]">
          <div className="flex items-center gap-3 p-3">
            <button
              onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              {expandedId === v.id ? <ChevronDown size={14} className="text-[#A1A1AA]" /> : <ChevronRight size={14} className="text-[#A1A1AA]" />}
              <span className="text-xs font-medium text-[#FAFAFA]">v{v.version_number}</span>
              <span className="text-xs text-[#A1A1AA]">{formatDate(v.created_at)}</span>
              {v.change_note && <span className="text-xs text-[#A1A1AA] truncate max-w-[200px]">— {v.change_note}</span>}
            </button>
            <button
              onClick={() => handleRollback(v.id)}
              disabled={rollingBack === v.id}
              className="flex items-center gap-1.5 rounded border border-white/[0.07] px-2 py-1 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-white/[0.12] transition-colors disabled:opacity-50"
            >
              {rollingBack === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Restaurar
            </button>
          </div>
          {expandedId === v.id && (
            <div className="border-t border-white/[0.07] p-3">
              <p className="text-xs text-[#A1A1AA] mb-2">Diferença em relação ao conteúdo atual:</p>
              <VersionDiff oldContent={v.content} newContent={currentContent} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
