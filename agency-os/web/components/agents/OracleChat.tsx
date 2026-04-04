'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string; streaming?: boolean }

interface OracleChatProps {
  jobId?: string
  clientName?: string
  initialHistory?: Message[]
}

export function OracleChat({ jobId, clientName, initialHistory = [] }: OracleChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialHistory)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
        body: JSON.stringify({ message: userMsg, job_id: jobId, history }),
      })

      if (!res.ok) throw new Error('Failed')
      if (!res.body) throw new Error('No body')

      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: true }
          return updated
        })
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: false }
        return updated
      })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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
          <p className="text-xs text-[#A1A1AA]">{clientName ? `Contexto: ${clientName}` : 'Diretor de IA'}</p>
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
              Descreva o que precisa — copy, criativos, estratégia. Eu orquestro o time de agentes.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Crie uma copy para Instagram', 'Gere um criativo de produto', 'Analise o briefing do cliente'].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/[0.07] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-white/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${msg.role === 'user' ? 'bg-[#27272A]' : 'bg-[#F59E0B]/10'}`}>
              {msg.role === 'user'
                ? <User size={14} className="text-[#A1A1AA]" />
                : <Bot size={14} className="text-[#F59E0B]" />
              }
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#27272A] text-[#FAFAFA] rounded-tr-none' : 'bg-[#18181B] text-[#FAFAFA] rounded-tl-none'}`}>
              {msg.content}
              {msg.streaming && <span className="inline-block w-1 h-4 bg-[#F59E0B] ml-0.5 animate-pulse" />}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <Loader2 size={14} className="text-[#F59E0B] animate-spin" />
            </div>
            <div className="bg-[#18181B] rounded-xl rounded-tl-none px-4 py-2.5">
              <div className="flex gap-1">
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
            ref={textareaRef}
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
      </div>
    </div>
  )
}
