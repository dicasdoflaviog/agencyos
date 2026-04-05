'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGENTS, type AgentId } from '@/lib/anthropic/agents-config'
import type { ContentType } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'

const AGENT_LIST = Object.entries(AGENTS).map(([id, a]) => ({ id: id as AgentId, ...a }))

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'stories', label: 'Stories' },
  { value: 'email', label: 'E-mail' },
  { value: 'video', label: 'Vídeo' },
  { value: 'blog', label: 'Blog' },
  { value: 'ad', label: 'Anúncio' },
  { value: 'other', label: 'Outro' },
]

export default function NewTemplatePage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ContentType | ''>('')
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>([])
  const [saving, setSaving] = useState(false)

  function toggleAgent(id: AgentId) {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nome é obrigatório')

    setSaving(true)
    const { data, error } = await supabase
      .from('job_templates')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        content_type: contentType || null,
        default_agents: selectedAgents,
        briefing_template: {},
      })
      .select('id')
      .single()

    setSaving(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success('Template criado!')
    router.push('/templates')
  }

  const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 text-zinc-100 placeholder:text-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors'
  const label = 'block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/templates" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Templates
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-zinc-100">Novo Template</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={label}>Nome *</label>
          <input
            className={input}
            placeholder="Ex: Post Semanal de Engajamento"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className={label}>Descrição</label>
          <textarea
            className={`${input} resize-none`}
            rows={2}
            placeholder="Quando usar este template?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Tipo de conteúdo */}
        <div>
          <label className={label}>Tipo de conteúdo</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setContentType(contentType === ct.value ? '' : ct.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  contentType === ct.value
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-black'
                    : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agentes padrão */}
        <div>
          <label className={label}>Agentes padrão</label>
          <p className="text-xs text-zinc-600 mb-3">
            Estes agentes serão sugeridos ao criar um job a partir deste template.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AGENT_LIST.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => toggleAgent(agent.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  selectedAgents.includes(agent.id)
                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                    : 'bg-white/[0.02] border-[var(--color-border-subtle)] text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <span className="font-semibold text-xs">{agent.name}</span>
                <span className="text-xs opacity-60 truncate" title={agent.role}>{agent.role}</span>
              </button>
            ))}
          </div>
          {selectedAgents.length > 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              {selectedAgents.length} agente{selectedAgents.length > 1 ? 's' : ''} selecionado{selectedAgents.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] disabled:opacity-60 px-5 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors"
          >
            {saving ? 'Salvando...' : 'Criar Template'}
          </button>
          <Link
            href="/templates"
            className="rounded-lg border border-zinc-700 hover:border-zinc-500 px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
