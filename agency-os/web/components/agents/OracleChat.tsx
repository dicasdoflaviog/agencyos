'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Save, Mic, Copy, Check } from 'lucide-react'

type AgentType = 'oracle' | 'vera' | 'atlas' | 'vox'

type Message = {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  agent?: AgentType
  agentLabel?: string
}

const AGENT_STYLES: Record<AgentType, { color: string; bg: string; border: string }> = {
  oracle: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/20' },
  vera:   { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  atlas:  { color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20' },
  vox:    { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
}

const AGENT_ICONS: Record<AgentType, string> = {
  oracle: '✦', vera: 'V', atlas: 'A', vox: '◎',
}

interface OracleChatProps {
  jobId?: string
  clientId?: string
  clientName?: string
  initialHistory?: Message[]
}

export function OracleChat({ jobId, clientId, clientName, initialHistory = [] }: OracleChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialHistory)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [savedIdx, setSavedIdx]   = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    const history = messages.slice(-10)

    try {
      const res = await fetch('/api/agents/oracle/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, job_id: jobId, client_id: clientId, history }),
      })

      if (!res.ok) {
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
        content: `⚠️ ${msg.includes('GEMINI_API_KEY') ? 'Chave Gemini não configurada no servidor.' : msg}`,
        agent: 'oracle',
      }])
    } finally {
      setIsLoading(false)
    }
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
    <div className="flex flex-col h-[600px] bg-[#09090B] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] bg-[#18181B]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
          <Sparkles size={16} className="text-[#F59E0B]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">ORACLE</p>
          <p className="text-xs text-[#A1A1AA]">{clientName ? `Contexto: ${clientName}` : 'Orquestra VERA · ATLAS · VOX'}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-[#A1A1AA]">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
              <Bot size={24} className="text-[#F59E0B]" />
            </div>
            <p className="text-[#FAFAFA] font-medium">Como posso ajudar?</p>
            <p className="text-sm text-[#A1A1AA] max-w-xs">
              Descreva o que precisa. Eu identifico a melhor IA e orquestro automaticamente.
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
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-white/[0.07] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-white/20 transition-colors text-left"
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] text-[#52525B]">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const agent = msg.agent ?? 'oracle'
          const style = AGENT_STYLES[agent]
          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isUser ? 'bg-[#27272A] text-[#A1A1AA]' : `${style.bg} ${style.color}`}`}>
                {isUser ? <User size={13} /> : AGENT_ICONS[agent]}
              </div>
              <div className="flex flex-col gap-1 max-w-[80%]">
                {!isUser && msg.agentLabel && !msg.streaming && (
                  <span className={`text-[10px] font-mono font-semibold ${style.color}`}>
                    {msg.agentLabel}
                  </span>
                )}
                <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-[#27272A] text-[#FAFAFA] rounded-tr-none' : `bg-[#18181B] border ${style.border} text-[#FAFAFA] rounded-tl-none`}`}>
                  {msg.content}
                  {msg.streaming && <span className={`inline-block w-1 h-4 ml-0.5 animate-pulse ${style.color.replace('text-', 'bg-')}`} />}
                </div>

                {/* Action buttons */}
                {!isUser && !msg.streaming && msg.content && !msg.content.startsWith('⚠️') && (
                  <div className="flex gap-1.5 mt-0.5">
                    <button
                      onClick={() => copyText(msg.content, i)}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-[#71717A] hover:text-[#FAFAFA] transition-colors"
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
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
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

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <Loader2 size={14} className="text-[#F59E0B] animate-spin" />
            </div>
            <div className="bg-[#18181B] rounded-xl rounded-tl-none px-4 py-2.5 border border-white/[0.05]">
              <div className="flex gap-1 items-center">
                <span className="text-[10px] text-[#52525B] mr-1">Analisando...</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#A1A1AA] animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#A1A1AA] animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#A1A1AA] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.07]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva o que precisa... (Enter para enviar)"
            rows={1}
            className="flex-1 resize-none rounded-lg bg-[#18181B] border border-white/[0.07] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#F59E0B]/40 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B] text-[#0A0A0A] hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="mt-2 flex gap-3">
          {(['vera','atlas','vox','oracle'] as AgentType[]).map(a => {
            const s = AGENT_STYLES[a]
            return (
              <span key={a} className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${s.bg} ${s.color}`}>
                {a.toUpperCase()}
              </span>
            )
          })}
          <span className="text-[9px] text-[#52525B] ml-auto">auto-roteamento ativo</span>
        </div>
      </div>
    </div>
  )
}

