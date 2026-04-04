'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGENTS } from '@/lib/anthropic/agents-config'
import type { AgentId } from '@/lib/anthropic/agents-config'
import { toast } from 'sonner'
import Link from 'next/link'
import { Trash2, GripVertical, Plus } from 'lucide-react'

type Step = { agent_id: AgentId; instruction_template: string }

const AGENT_LIST = Object.entries(AGENTS).map(([id, a]) => ({ id: id as AgentId, ...a }))

export default function NewPipelinePage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [saving, setSaving] = useState(false)

  function addStep() {
    setSteps((prev) => [...prev, { agent_id: 'vera', instruction_template: '' }])
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, field: keyof Step, value: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function moveStep(i: number, dir: 'up' | 'down') {
    const next = [...steps]
    const target = dir === 'up' ? i - 1 : i + 1
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]
    setSteps(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nome é obrigatório')
    if (steps.length === 0) return toast.error('Adicione ao menos 1 agente')

    const emptyInstruction = steps.findIndex(s => !s.instruction_template.trim())
    if (emptyInstruction >= 0) {
      return toast.error(`Step ${emptyInstruction + 1}: instrução não pode ser vazia`)
    }

    setSaving(true)
    const stepsWithOrder = steps.map((s, i) => ({ ...s, order: i + 1 }))

    const { data, error } = await supabase
      .from('agent_pipelines')
      .insert({ name: name.trim(), description: description.trim() || null, steps: stepsWithOrder })
      .select('id')
      .single()

    setSaving(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success('Pipeline criado!')
    router.push(`/pipelines/${data.id}`)
  }

  const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 text-zinc-100 placeholder:text-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors'
  const label = 'block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/pipelines" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Pipelines
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-zinc-100">Novo Pipeline</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label className={label}>Nome *</label>
          <input
            className={input}
            placeholder="Ex: Post Completo — Pesquisa + Copy + Design"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Descrição */}
        <div>
          <label className={label}>Descrição</label>
          <textarea
            className={`${input} resize-none`}
            rows={2}
            placeholder="Para que serve este pipeline?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className={label + ' mb-0'}>Agentes em sequência *</label>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 px-3 py-1 text-xs text-violet-300 transition-colors"
            >
              <Plus size={12} /> Adicionar agente
            </button>
          </div>

          {steps.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
              <p className="text-sm text-zinc-500">Clique em "Adicionar agente" para montar o pipeline</p>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveStep(i, 'up')} disabled={i === 0}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-20">
                      <GripVertical size={14} />
                    </button>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <select
                    value={step.agent_id}
                    onChange={(e) => updateStep(i, 'agent_id', e.target.value)}
                    className="flex-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-100 px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
                  >
                    {AGENT_LIST.map((a) => (
                      <option key={a.id} value={a.id} className="bg-zinc-900">
                        {a.name} — {a.role}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeStep(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">
                    Instrução para este agente <span className="text-zinc-600">(use {'{'}job_title{'}'}, {'{'}client_name{'}'}, {'{'}previous_output{'}'})</span>
                  </label>
                  <textarea
                    className={`${input} resize-none`}
                    rows={3}
                    placeholder="Ex: Com base no output anterior, crie um post para Instagram com até 150 palavras para o job {job_title} do cliente {client_name}."
                    value={step.instruction_template}
                    onChange={(e) => updateStep(i, 'instruction_template', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-5 py-2 text-sm font-semibold text-white transition-colors"
          >
            {saving ? 'Salvando...' : 'Criar Pipeline'}
          </button>
          <Link
            href="/pipelines"
            className="rounded-lg border border-zinc-700 hover:border-zinc-500 px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
