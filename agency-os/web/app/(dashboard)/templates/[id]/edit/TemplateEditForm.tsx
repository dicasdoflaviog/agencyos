'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGENTS, type AgentId } from '@/lib/anthropic/agents-config'
import type { ContentType, JobTemplate } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

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

export default function TemplateEditForm({ template }: { template: JobTemplate }) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [contentType, setContentType] = useState<ContentType | ''>(template.content_type ?? '')
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>(
    (template.default_agents ?? []) as AgentId[]
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function toggleAgent(id: AgentId) {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nome é obrigatório')

    setSaving(true)
    const { error } = await supabase
      .from('job_templates')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        content_type: contentType || null,
        default_agents: selectedAgents,
      })
      .eq('id', template.id)

    setSaving(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success('Template atualizado!')
    router.push('/templates')
  }

  async function handleDelete() {
    if (!confirm('Deletar este template? Esta ação não pode ser desfeita.')) return
    setDeleting(true)
    const { error } = await supabase.from('job_templates').delete().eq('id', template.id)
    setDeleting(false)
    if (error) return toast.error('Erro ao deletar: ' + error.message)
    toast.success('Template deletado')
    router.push('/templates')
  }

  const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 text-zinc-100 placeholder:text-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors'
  const label = 'block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/templates" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Templates
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-zinc-100">Editar Template</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={label}>Nome *</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className={label}>Descrição</label>
          <textarea
            className={`${input} resize-none`}
            rows={2}
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
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] disabled:opacity-60 px-5 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <Link
            href="/templates"
            className="rounded-lg border border-zinc-700 hover:border-zinc-500 px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </Link>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 hover:border-red-500/60 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Deletando...' : 'Deletar'}
          </button>
        </div>
      </form>
    </div>
  )
}
