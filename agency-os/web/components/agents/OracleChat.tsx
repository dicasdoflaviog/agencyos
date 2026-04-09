'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Bot, User, Sparkles, Loader2, Save, Mic, Copy, Check, Paperclip, X, FileText, Image, Zap, CheckCircle2, UploadCloud, Plus, MessageSquare } from 'lucide-react'
import { type AgentType } from '@/types/agents'
import { createClient } from '@/lib/supabase/client'
import { AtlasMessage } from './AtlasMessage'
import { CreativeRenderer, type CarouselPayload } from './CreativeRenderer'

type AtlasData = {
  imageBase64: string
  mimeType: string
  assetId?: string
  format?: string
  prompt?: string
}

function parseAtlasCarouselMarker(content: string): { text: string; payload?: CarouselPayload } {
  const match = content.match(/%%ATLAS_CAROUSEL%%([\s\S]+?)%%END_CAROUSEL%%/)
  if (!match) return { text: content }
  try {
    const payload = JSON.parse(match[1]) as CarouselPayload
    const text = content.replace(/\n*%%ATLAS_CAROUSEL%%[\s\S]+?%%END_CAROUSEL%%/, '').trim()
    return { text, payload }
  } catch {
    return { text: content }
  }
}

function parseAtlasMarker(content: string): { text: string; atlasData?: AtlasData } {
  const markerMatch = content.match(/%%ATLAS_IMAGE%%([\s\S]+?)%%/)
  if (!markerMatch) return { text: content }
  try {
    const atlasData = JSON.parse(markerMatch[1]) as AtlasData
    const text = content.replace(/\n\n%%ATLAS_IMAGE%%[\s\S]+?%%/, '').trim()
    return { text, atlasData }
  } catch {
    return { text: content }
  }
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  agent?: AgentType
  agentLabel?: string
  attachmentNames?: string[]
  attachmentPreviews?: string[]  // data URLs for image thumbnails in history
}

type OrchestrationOutput = {
  agent: AgentType
  label: string
  task: string
  content: string
  output_id: string | null
  status: 'fulfilled' | 'rejected'
}

type OrchestrationResult = {
  campaign_title: string
  agents: OrchestrationOutput[]
}

const AGENT_STYLES: Record<AgentType, { color: string; bg: string; border: string }> = {
  // Orchestration — amber
  oracle:  { color: 'text-[var(--color-accent)]',   bg: 'bg-[var(--color-accent)]/10',   border: 'border-[var(--color-accent)]/20' },
  nexus:   { color: 'text-[var(--color-accent)]',   bg: 'bg-[var(--color-accent)]/10',   border: 'border-[var(--color-accent)]/20' },
  genesis: { color: 'text-[var(--color-accent)]',   bg: 'bg-[var(--color-accent)]/10',   border: 'border-[var(--color-accent)]/20' },
  lore:    { color: 'text-[var(--color-accent)]',   bg: 'bg-[var(--color-accent)]/10',   border: 'border-[var(--color-accent)]/20' },
  // Production — blue
  vance:   { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  vera:    { color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  marco:   { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  atlas:   { color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20' },
  volt:    { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  pulse:   { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  cipher:  { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  flux:    { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  // Intelligence — purple
  iris:    { color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  vector:  { color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  prism:   { color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  // Operations — emerald
  bridge:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  aegis:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  harbor:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ledger:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  // Growth — pink
  surge:   { color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  anchor:  { color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  // Media — cyan
  vox:     { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
}

const AGENT_ICONS: Record<AgentType, string> = {
  oracle: '✦', nexus: 'N', genesis: 'G', lore: 'L',
  vance: 'V', vera: 'V', marco: 'M', atlas: 'A', volt: '⚡', pulse: 'P', cipher: 'C', flux: 'F',
  iris: 'I', vector: 'Vc', prism: 'Pr',
  bridge: 'Br', aegis: 'Ae', harbor: 'H', ledger: 'Le',
  surge: 'Su', anchor: 'An',
  vox: '◎',
}

interface OracleChatProps {
  jobId?: string
  clientId?: string
  clientName?: string
  initialSessionId?: string  // pre-loaded by server pages
}

function OracleChatInner({ jobId, clientId, clientName, initialSessionId }: OracleChatProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? searchParams.get('session'))
  const [historyLoading, setHistoryLoading] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResult | null>(null)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [savedIdx, setSavedIdx]   = useState<number | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; mimeType: string; storagePath: string; previewUrl?: string; uploading?: boolean }[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Session management ──────────────────────────────────────────────────────
  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/oracle/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId ?? null, job_id: jobId ?? null }),
      })
      if (!res.ok) return
      const { id } = await res.json()
      setSessionId(id)
      const params = new URLSearchParams(searchParams.toString())
      params.set('session', id)
      router.replace(`?${params.toString()}`, { scroll: false } as Parameters<typeof router.replace>[1])
    } catch { /* non-fatal */ }
  }, [clientId, jobId, router, searchParams])

  const loadSessionHistory = useCallback(async (id: string) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/agents/oracle/sessions/${id}`)
      if (!res.ok) { await createSession(); return }
      const { messages: rows } = await res.json()
      if (!rows?.length) return
      setMessages(rows.map((r: { role: string; content: string; agent?: string }) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content,
        agent: (r.agent as AgentType) ?? 'oracle',
      })))
    } catch { /* non-fatal */ } finally {
      setHistoryLoading(false)
    }
  }, [createSession])

  useEffect(() => {
    const urlSession = searchParams.get('session')
    if (urlSession) {
      if (urlSession !== sessionId) setSessionId(urlSession)
      loadSessionHistory(urlSession)
    } else if (initialSessionId) {
      loadSessionHistory(initialSessionId)
    } else {
      createSession()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startNewSession = useCallback(async () => {
    setMessages([])
    setOrchestrationResult(null)
    setSessionId(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('session')
    router.replace(`?${params.toString()}`, { scroll: false } as Parameters<typeof router.replace>[1])
    await createSession()
  }, [createSession, router, searchParams])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, orchestrationResult])

  const MAX_FILE_BYTES = 10 * 1024 * 1024  // 10 MB per file (Storage limit — no payload restriction)
  const MAX_FILES = 10

  async function uploadFileToStorage(file: File, previewUrl?: string): Promise<{ name: string; mimeType: string; storagePath: string; previewUrl?: string } | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAttachError('Você precisa estar autenticado para anexar arquivos.'); return null }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storagePath = `${user.id}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('oracle-attachments').upload(storagePath, file)
    if (error) { setAttachError(`Erro ao enviar arquivo: ${error.message}`); return null }
    return { name: file.name, mimeType: file.type, storagePath, previewUrl }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setAttachError(null)

    const oversized = files.find(f => f.size > MAX_FILE_BYTES)
    if (oversized) {
      setAttachError(`Arquivo muito grande (máx 10 MB): ${oversized.name} (${(oversized.size / 1024 / 1024).toFixed(1)} MB)`)
      e.target.value = ''
      return
    }
    if (attachedFiles.length + files.length > MAX_FILES) {
      setAttachError(`Máximo de ${MAX_FILES} arquivos por mensagem`)
      e.target.value = ''
      return
    }

    // Add placeholders with uploading state
    const placeholders = files.map(f => ({ name: f.name, mimeType: f.type, storagePath: '', uploading: true }))
    setAttachedFiles(prev => [...prev, ...placeholders])

    const results = await Promise.all(files.map(async (file) => {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      return uploadFileToStorage(file, previewUrl)
    }))

    // Replace placeholders with real results
    setAttachedFiles(prev => {
      const next = [...prev]
      let placeholderIdx = next.findIndex(f => f.uploading && f.storagePath === '')
      for (const result of results) {
        if (placeholderIdx === -1) break
        if (result) { next[placeholderIdx] = result } else { next.splice(placeholderIdx, 1) }
        placeholderIdx = next.findIndex(f => f.uploading && f.storagePath === '')
      }
      return next
    })
    e.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items).filter(i => i.kind === 'file')
    if (!items.length) return
    if (attachedFiles.length >= MAX_FILES) { setAttachError(`Máximo de ${MAX_FILES} arquivos por mensagem`); return }
    e.preventDefault()
    setAttachError(null)

    const toProcess = items.slice(0, MAX_FILES - attachedFiles.length)

    Promise.all(toProcess.map(async (item) => {
      const file = item.getAsFile()
      if (!file) return null
      if (file.size > MAX_FILE_BYTES) {
        setAttachError(`Arquivo muito grande (máx 10 MB): ${(file.size / 1024 / 1024).toFixed(1)} MB`)
        return null
      }
      const ext = file.type.split('/')[1]?.split(';')[0] || 'png'
      const namedFile = new File([file], file.name && file.name !== 'blob' ? file.name : `colado-${Date.now()}.${ext}`, { type: file.type })
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

      // Show placeholder
      const placeholder = { name: namedFile.name, mimeType: namedFile.type, storagePath: '', uploading: true }
      setAttachedFiles(prev => [...prev, placeholder])

      const result = await uploadFileToStorage(namedFile, previewUrl)
      setAttachedFiles(prev => {
        const next = [...prev]
        const idx = next.findIndex(f => f.uploading && f.name === namedFile.name && f.storagePath === '')
        if (idx !== -1) { result ? (next[idx] = result) : next.splice(idx, 1) }
        return next
      })
    }))
  }

  const sendMessage = async () => {
    const readyFiles = attachedFiles.filter(f => !f.uploading)
    if ((!input.trim() && !readyFiles.length) || isLoading) return
    const userMsg = input.trim() || (readyFiles.length === 1 ? `Analisar arquivo: ${readyFiles[0].name}` : `Analisar ${readyFiles.length} arquivos`)
    const currentFiles = readyFiles
    setInput('')
    setAttachedFiles([])
    setOrchestrationResult(null)
    setMessages(prev => [...prev, {
      role: 'user', content: userMsg,
      attachmentNames: currentFiles.map(f => f.name),
      attachmentPreviews: currentFiles.map(f => f.previewUrl ?? '').filter(Boolean),
    }])
    setIsLoading(true)

    const history = messages.slice(-10)

    try {
      const res = await fetch('/api/agents/oracle/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          session_id: sessionId,
          job_id: jobId,
          client_id: clientId,
          history,
          ...(currentFiles.length > 0 && {
            attachments: currentFiles.map(f => ({ name: f.name, mimeType: f.mimeType, storagePath: f.storagePath }))
          })
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          const data = await res.json().catch(() => ({}))
          window.dispatchEvent(new CustomEvent('credits:insufficient', { detail: { balance: data.balance ?? 0, cost: data.cost ?? 0, error: data.error } }))
          return
        }
        const errText = await res.text()
        throw new Error(errText || `HTTP ${res.status}`)
      }
      if (!res.body) throw new Error('No body')

      const agent = (res.headers.get('X-Agent') ?? 'oracle') as AgentType
      const agentLabel = res.headers.get('X-Agent-Label') ?? 'ORACLE'

      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, agent, agentLabel }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: true, agent, agentLabel }
          return updated
        })
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: false, agent, agentLabel }
        return updated
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${msg}`,
        agent: 'oracle',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const orchestrate = async () => {
    if (!input.trim() || isOrchestrating) return
    const userMsg = input.trim()
    setInput('')
    setOrchestrationResult(null)
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsOrchestrating(true)

    try {
      const res = await fetch('/api/agents/oracle/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, job_id: jobId, client_id: clientId }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const result = await res.json() as OrchestrationResult
      setOrchestrationResult(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Orquestração falhou: ${msg}`, agent: 'oracle' }])
    } finally {
      setIsOrchestrating(false)
    }
  }

  const approveOutput = async (outputId: string) => {
    try {
      await fetch(`/api/outputs/${outputId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_stage: 'internal_review' }),
      })
      setApprovedIds(prev => new Set([...prev, outputId]))
    } catch { /* silent */ }
  }

  const copyText = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const generateAudio = (text: string) => {
    const clean = text.replace(/\[.*?\]/g, '').replace(/\*(.+?)\*/g, '$1').trim()
    setInput(`Gerar áudio: ${clean.slice(0, 100)}...`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div onPaste={handlePaste} className="flex flex-col h-[600px] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
          <Sparkles size={16} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">ORACLE</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{clientName ? `Contexto: ${clientName}` : 'Orquestra VERA · ATLAS · VOX'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {sessionId && (
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] hidden sm:block truncate max-w-[120px]" title={sessionId}>
              #{sessionId.slice(0, 8)}
            </span>
          )}
          <button
            onClick={startNewSession}
            disabled={isLoading}
            title="Nova conversa"
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] transition-colors disabled:opacity-40"
          >
            <Plus size={11} />
            Nova
          </button>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-[var(--color-text-secondary)]">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 size={16} className="text-[var(--color-accent)] animate-spin" />
            <span className="text-sm text-[var(--color-text-secondary)]">Carregando histórico...</span>
          </div>
        )}
        {!historyLoading && messages.length === 0 && !orchestrationResult && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
              <Bot size={24} className="text-[var(--color-accent)]" />
            </div>
            <p className="text-[var(--color-text-primary)] font-medium">Como posso ajudar?</p>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
              Descreva o que precisa. Use <span className="text-[var(--color-accent)] font-medium">Enviar</span> para chat ou <span className="text-violet-400 font-medium">Orquestrar</span> para acionar múltiplos agentes em paralelo.
            </p>
            <div className="grid grid-cols-1 gap-2 mt-2 w-full max-w-xs">
              {[
                { label: '✍️ Crie uma copy para Instagram', hint: '→ VERA' },
                { label: '🎨 Gere um prompt de imagem', hint: '→ ATLAS' },
                { label: '🎙️ Escreva um roteiro de áudio', hint: '→ VOX' },
                { label: '📊 Analise o briefing do cliente', hint: '→ ORACLE' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => setInput(s.label.replace(/^.{2} /, ''))}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors text-left"
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const agent = (msg.agent && msg.agent in AGENT_STYLES ? msg.agent : 'oracle') as keyof typeof AGENT_STYLES
          const style = AGENT_STYLES[agent]
          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isUser ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]' : `${style.bg} ${style.color}`}`}>
                {isUser ? <User size={13} /> : AGENT_ICONS[agent]}
              </div>
              <div className="flex flex-col gap-1 max-w-[80%]">
                {!isUser && msg.agentLabel && !msg.streaming && (
                  <span className={`text-[10px] font-mono font-semibold ${style.color}`}>
                    {msg.agentLabel}
                  </span>
                )}
                  <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-tr-none' : `bg-[var(--color-bg-surface)] border ${style.border} text-[var(--color-text-primary)] rounded-tl-none`}`}>
                  {msg.attachmentNames && msg.attachmentNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {msg.attachmentNames.map((name, ai) => (
                        <div key={ai} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] border border-[var(--color-border-default)] text-[11px] text-[var(--color-text-secondary)]">
                          {msg.attachmentPreviews?.[ai]
                            ? <img src={msg.attachmentPreviews[ai]} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                            : name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                              ? <Image size={11} />
                              : <FileText size={11} />}
                          <span className="truncate max-w-[150px]">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (() => {
                    // Carousel marker takes priority
                    const { text: carouselText, payload } = parseAtlasCarouselMarker(msg.content)
                    if (payload) {
                      return (
                        <>
                          {carouselText && (
                            <div className="oracle-prose">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{carouselText}</ReactMarkdown>
                            </div>
                          )}
                          <CreativeRenderer {...payload} />
                        </>
                      )
                    }
                    // Single image marker fallback
                    const { text, atlasData } = parseAtlasMarker(msg.content)
                    return (
                      <>
                        {text && (
                          <div className="oracle-prose">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                          </div>
                        )}
                        {atlasData && <AtlasMessage {...atlasData} />}
                      </>
                    )
                  })()}
                  {msg.streaming && <span className={`inline-block w-1 h-4 ml-0.5 animate-pulse ${style.color.replace('text-', 'bg-')}`} />}
                </div>

                {/* Action buttons */}
                {!isUser && !msg.streaming && msg.content && !msg.content.startsWith('⚠️') && (
                  <div className="flex gap-1.5 mt-0.5">
                    <button
                      onClick={() => copyText(msg.content, i)}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                      {copiedIdx === i ? 'Copiado!' : 'Copiar'}
                    </button>
                    {agent === 'vox' && (
                      <button
                        onClick={() => generateAudio(msg.content)}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Mic size={10} />
                        Gerar Áudio
                      </button>
                    )}
                    {savedIdx === i && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-1 text-emerald-400">
                        <Check size={10} /> Salvo na Galeria
                      </span>
                    )}
                    {jobId && agent !== 'oracle' && savedIdx !== i && (
                      <button
                        onClick={() => setSavedIdx(i)}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
                      >
                        <Save size={10} />
                        Salvo na Galeria
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Chat loading indicator */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
              <Loader2 size={14} className="text-[var(--color-accent)] animate-spin" />
            </div>
            <div className="bg-[var(--color-bg-surface)] rounded-xl rounded-tl-none px-4 py-2.5 border border-[var(--color-border-subtle)]">
              <div className="flex gap-1 items-center">
                <span className="text-[10px] text-[var(--color-text-muted)] mr-1">Analisando...</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Orchestration loading indicator */}
        {isOrchestrating && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="text-violet-400 animate-spin" />
              <span className="text-xs font-semibold text-violet-400">Orquestrando agentes em paralelo...</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['vance','vera','atlas','volt','pulse','marco','iris','cipher'] as AgentType[]).map((a, idx) => (
                <span
                  key={a}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 animate-pulse"
                  style={{ animationDelay: `${idx * 120}ms` }}
                >
                  {a.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Orchestration results panel */}
        {orchestrationResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Zap size={13} className="text-violet-400" />
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{orchestrationResult.campaign_title}</span>
              <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">{orchestrationResult.agents.length} agentes · {orchestrationResult.agents.filter(a => a.output_id && approvedIds.has(a.output_id)).length} aprovados</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {orchestrationResult.agents.map((output) => {
                const style = AGENT_STYLES[output.agent] ?? AGENT_STYLES.oracle
                const isApproved = output.output_id ? approvedIds.has(output.output_id) : false
                return (
                  <div
                    key={output.agent}
                    className={`rounded-xl border p-4 space-y-3 transition-all ${isApproved ? 'border-emerald-500/30 bg-emerald-500/5' : `${style.border} bg-[var(--color-bg-surface)]`}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold ${style.bg} ${style.color}`}>
                        {AGENT_ICONS[output.agent]}
                      </div>
                      <span className={`text-[11px] font-mono font-semibold ${style.color}`}>{output.label}</span>
                      {isApproved && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 size={11} /> Aprovado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] italic border-l-2 border-[var(--color-border-subtle)] pl-2">
                      {output.task}
                    </p>
                    <div className="oracle-prose text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{output.content}</ReactMarkdown>
                    </div>
                    {output.status === 'fulfilled' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(output.content)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          <Copy size={10} /> Copiar
                        </button>
                        {output.output_id && !isApproved && (
                          <button
                            onClick={() => approveOutput(output.output_id!)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle2 size={10} /> Aprovar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--color-border-subtle)]">
        {attachError && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-400">
            <X size={12} className="shrink-0" />
            <span>{attachError}</span>
            <button onClick={() => setAttachError(null)} className="ml-auto hover:text-red-300"><X size={12} /></button>
          </div>
        )}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedFiles.map((f, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)]">
                {f.previewUrl
                  ? <img src={f.previewUrl} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                  : f.mimeType === 'application/pdf'
                    ? <FileText size={12} className="shrink-0 text-red-400" />
                    : <FileText size={12} className="shrink-0" />
                }
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="hover:text-[var(--color-text-primary)] transition-colors ml-0.5">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivo (ou Cole Ctrl+V uma imagem)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.docx,.csv,.json"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Descreva o que precisa... Cole Ctrl+V para anexar imagem"
            rows={1}
            className="flex-1 resize-none rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:outline-none focus:border-[var(--color-accent)]/40 transition-colors"
          />
          {/* Orchestrate button */}
          <button
            onClick={orchestrate}
            disabled={isLoading || isOrchestrating || !input.trim()}
            title="Orquestrar múltiplos agentes em paralelo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isOrchestrating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          </button>
          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={isLoading || isOrchestrating || (!input.trim() && !attachedFiles.length)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {(['oracle','vera','atlas','vox','vance','marco','volt','pulse','iris','vector','harbor','ledger','surge'] as AgentType[]).map(a => {
            const s = AGENT_STYLES[a]
            return (
              <button
                key={a}
                onClick={() => setInput(`@${a} `)}
                className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${s.bg} ${s.color} hover:opacity-80 transition-opacity`}
                title={`Chamar ${a.toUpperCase()} diretamente`}
              >
                @{a.toUpperCase()}
              </button>
            )
          })}
          <span className="text-[9px] text-[var(--color-text-muted)] ml-auto">⚡ orquestra · ✈ envia · 22 agentes</span>

        </div>
      </div>
    </div>
  )
}

// Wrap with Suspense because useSearchParams requires it in the App Router
export function OracleChat(props: OracleChatProps) {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-[600px] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl items-center justify-center gap-2">
        <Loader2 size={20} className="text-[var(--color-accent)] animate-spin" />
        <span className="text-sm text-[var(--color-text-secondary)]">Carregando Oracle...</span>
      </div>
    }>
      <OracleChatInner {...props} />
    </Suspense>
  )
}
