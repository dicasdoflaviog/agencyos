'use client'
import { useState, useRef } from 'react'
import { Upload, RefreshCw, Download, Trash2, FileText, CheckCircle2, AlertCircle, Clock, Code2, FileJson, FileCode } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface KnowledgeFile {
  id: string
  name: string
  file_type: string
  file_size: number | null
  sync_status: 'pending' | 'syncing' | 'synced' | 'error'
  sync_error?: string | null
  synced_at?: string | null
  created_at: string
}

interface Props {
  clientId: string
  initialFiles: KnowledgeFile[]
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG: Record<KnowledgeFile['sync_status'], { label: string; icon: React.ElementType; className: string }> = {
  pending:  { label: 'Pendente',        icon: Clock,         className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  syncing:  { label: 'Sincronizando…',  icon: RefreshCw,     className: 'bg-blue-500/10 text-blue-400' },
  synced:   { label: 'Sincronizado',    icon: CheckCircle2,  className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  error:    { label: 'Erro',            icon: AlertCircle,   className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
}

const TYPE_COLORS: Record<string, string> = {
  PDF:  'bg-red-500/10 text-red-400 border-red-500/20',
  TXT:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DOCX: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20',
  HTML: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CSS:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  JSON: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  MD:   'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  HTML: Code2,
  CSS:  FileCode,
  JSON: FileJson,
  MD:   FileText,
}

export function KnowledgeFiles({ clientId, initialFiles }: Props) {
  const router = useRouter()
  const [files, setFiles] = useState<KnowledgeFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/clients/${clientId}/knowledge`, { method: 'POST', body: form })
    if (res.ok) {
      const { data } = await res.json()
      setFiles(prev => [data, ...prev])
    }
    setUploading(false)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }

  async function syncFile(fileId: string) {
    setSyncingId(fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, sync_status: 'syncing' } : f))
    const res = await fetch(`/api/clients/${clientId}/knowledge/${fileId}/sync`, { method: 'POST' })
    const body = await res.json()
    const synced = res.ok
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, sync_status: synced ? 'synced' : 'error', sync_error: body.error ?? null, synced_at: synced ? new Date().toISOString() : null }
        : f
    ))
    setSyncingId(null)
    // Refresh server data so Styleguide tab picks up the new HTML/CSS content
    if (synced) router.refresh()
  }

  async function downloadFile(fileId: string, fileName: string) {
    const res = await fetch(`/api/clients/${clientId}/knowledge/${fileId}`)
    if (!res.ok) return
    const { url } = await res.json()
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
  }

  async function deleteFile(fileId: string) {
    if (!confirm('Remover este arquivo?')) return
    setDeletingId(fileId)
    const res = await fetch(`/api/clients/${clientId}/knowledge/${fileId}`, { method: 'DELETE' })
    if (res.ok) setFiles(prev => prev.filter(f => f.id !== fileId))
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-all ${
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx,.doc,.html,.css,.json,.md"
          className="hidden"
          onChange={handleFileInput}
        />
        {uploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)]" />
        ) : (
          <Upload size={20} className="text-[var(--color-text-muted)]" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {uploading ? 'Enviando arquivo…' : 'Clique ou arraste um arquivo'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">PDF, TXT, DOCX, HTML, CSS, JSON ou MD — até 10 MB</p>
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-6 py-10 text-center">
          <FileText size={28} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum arquivo enviado ainda.</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Envie documentos para que o ORACLE use como contexto.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                <th className="px-5 py-3 text-left">Arquivo</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Tamanho</th>
                <th className="px-4 py-3 text-left">Upload</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => {
                const status = STATUS_CONFIG[file.sync_status]
                const StatusIcon = status.icon
                const typeClass = TYPE_COLORS[file.file_type] ?? 'bg-white/5 text-[var(--color-text-muted)] border-white/10'
                const isSyncing = syncingId === file.id
                const isDeleting = deletingId === file.id

                return (
                  <tr key={file.id} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-elevated)]/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => { const Icon = TYPE_ICONS[file.file_type] ?? FileText; return <Icon size={14} className="shrink-0 text-[var(--color-text-muted)]" /> })()}
                        <span className="truncate font-medium text-[var(--color-text-primary)] max-w-[180px]" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold ${typeClass}`}>
                        {file.file_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatBytes(file.file_size)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(file.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        <StatusIcon size={10} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Sincronizando…' : status.label}
                      </span>
                      {file.sync_status === 'error' && file.sync_error && (
                        <p className="mt-1 text-[10px] text-[var(--color-error)]">{file.sync_error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => syncFile(file.id)}
                          disabled={isSyncing || isDeleting}
                          title="Sincronizar com IA"
                          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 disabled:opacity-40 transition-all"
                        >
                          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => downloadFile(file.id, file.name)}
                          title="Download"
                          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-blue-400 hover:border-blue-500/40 transition-all"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => deleteFile(file.id)}
                          disabled={isSyncing || isDeleting}
                          title="Remover"
                          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/40 disabled:opacity-40 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-[var(--color-text-muted)]">
        💡 Após sincronizar, os arquivos ficam disponíveis como contexto para o ORACLE ao conversar sobre este cliente.
      </p>
    </div>
  )
}
