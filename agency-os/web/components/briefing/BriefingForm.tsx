'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { JobBriefing, ContentType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CONTENT_TYPES: { value: ContentType; label: string; emoji: string }[] = [
  { value: 'post', label: 'Post', emoji: '📸' },
  { value: 'reel', label: 'Reel', emoji: '🎬' },
  { value: 'stories', label: 'Stories', emoji: '⭕' },
  { value: 'email', label: 'E-mail', emoji: '✉️' },
  { value: 'video', label: 'Vídeo', emoji: '🎥' },
  { value: 'blog', label: 'Blog', emoji: '📝' },
  { value: 'ad', label: 'Anúncio', emoji: '📣' },
  { value: 'other', label: 'Outro', emoji: '📦' },
]

const TONE_OPTIONS = [
  'Informal e descontraído',
  'Formal e profissional',
  'Motivacional e inspirador',
  'Técnico e especializado',
  'Educativo e didático',
  'Divertido e irreverente',
  'Empático e acolhedor',
]

type Props = {
  jobId: string
  existing?: JobBriefing | null
}

export default function BriefingForm({ jobId, existing }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    content_type: existing?.content_type ?? ('post' as ContentType),
    objective: existing?.objective ?? '',
    target_audience: existing?.target_audience ?? '',
    key_message: existing?.key_message ?? '',
    tone: existing?.tone ?? '',
    restrictions: existing?.restrictions ?? '',
    deadline_notes: existing?.deadline_notes ?? '',
    reference_urls: existing?.reference_urls?.join('\n') ?? '',
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      job_id: jobId,
      content_type: form.content_type,
      objective: form.objective || null,
      target_audience: form.target_audience || null,
      key_message: form.key_message || null,
      tone: form.tone || null,
      restrictions: form.restrictions || null,
      deadline_notes: form.deadline_notes || null,
      reference_urls: form.reference_urls
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      created_by: user?.id,
    }

    let error
    if (existing) {
      ;({ error } = await supabase
        .from('job_briefings')
        .update(payload)
        .eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('job_briefings').insert(payload))
    }

    setLoading(false)

    if (error) {
      toast.error('Erro ao salvar briefing: ' + error.message)
      return
    }

    toast.success('Briefing salvo com sucesso!')
    router.push(`/jobs/${jobId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de conteúdo */}
      <div className="space-y-2">
        <Label>Tipo de conteúdo *</Label>
        <div className="grid grid-cols-4 gap-2">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => set('content_type', ct.value)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
                form.content_type === ct.value
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-zinc-700 hover:border-zinc-500 text-zinc-400'
              }`}
            >
              <span className="text-lg">{ct.emoji}</span>
              <span>{ct.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Objetivo */}
      <div className="space-y-2">
        <Label htmlFor="objective">Objetivo do conteúdo</Label>
        <Textarea
          id="objective"
          placeholder="O que este conteúdo precisa alcançar? (ex: gerar 50 leads, aumentar engajamento, divulgar lançamento)"
          value={form.objective}
          onChange={(e) => set('objective', e.target.value)}
          rows={2}
        />
      </div>

      {/* Público-alvo */}
      <div className="space-y-2">
        <Label htmlFor="target_audience">Público-alvo</Label>
        <Textarea
          id="target_audience"
          placeholder="Quem vai consumir este conteúdo? (ex: Mulheres 25-35, classe B/C, SP, interessadas em saúde e bem-estar)"
          value={form.target_audience}
          onChange={(e) => set('target_audience', e.target.value)}
          rows={2}
        />
      </div>

      {/* Mensagem principal */}
      <div className="space-y-2">
        <Label htmlFor="key_message">Mensagem principal</Label>
        <Input
          id="key_message"
          placeholder="Em 1 frase: qual é a mensagem central deste conteúdo?"
          value={form.key_message}
          onChange={(e) => set('key_message', e.target.value)}
        />
      </div>

      {/* Tom */}
      <div className="space-y-2">
        <Label>Tom de voz</Label>
        <Select value={form.tone} onValueChange={(v) => set('tone', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tom..." />
          </SelectTrigger>
          <SelectContent>
            {TONE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Restrições */}
      <div className="space-y-2">
        <Label htmlFor="restrictions">Restrições e proibições</Label>
        <Textarea
          id="restrictions"
          placeholder="O que NÃO fazer? (ex: não mencionar preço, evitar comparações com concorrentes, não usar palavra X)"
          value={form.restrictions}
          onChange={(e) => set('restrictions', e.target.value)}
          rows={2}
        />
      </div>

      {/* Prazo */}
      <div className="space-y-2">
        <Label htmlFor="deadline_notes">Observações de prazo</Label>
        <Input
          id="deadline_notes"
          placeholder="ex: publicar até sexta-feira às 18h, evitar feriados"
          value={form.deadline_notes}
          onChange={(e) => set('deadline_notes', e.target.value)}
        />
      </div>

      {/* URLs de referência */}
      <div className="space-y-2">
        <Label htmlFor="reference_urls">URLs de referência (uma por linha)</Label>
        <Textarea
          id="reference_urls"
          placeholder="https://exemplo.com/referencia&#10;https://concorrente.com/post"
          value={form.reference_urls}
          onChange={(e) => set('reference_urls', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Salvando...' : existing ? 'Atualizar briefing' : 'Criar briefing'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/jobs/${jobId}`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
