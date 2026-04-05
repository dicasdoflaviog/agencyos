'use client'
import { useState } from 'react'
import { BookOpen, Mic2, ShieldCheck, Ban, CheckCircle2, Pencil, X, ToggleLeft, ToggleRight, Sparkles, AlertCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientDNA {
  id?: string
  client_id?: string
  biografia?: string | null
  biografia_active?: boolean
  voz?: string | null
  voz_active?: boolean
  credenciais?: string | null
  credenciais_active?: boolean
  proibidas?: string | null
  proibidas_active?: boolean
}

interface Props {
  clientId: string
  initialData: ClientDNA | null
}

type PillarKey = 'biografia' | 'voz' | 'credenciais' | 'proibidas'

// ─── Pillar config ────────────────────────────────────────────────────────────

const PILLARS: Array<{
  key: PillarKey
  label: string
  description: string
  placeholder: string
  icon: React.ElementType
  color: string
  accentBg: string
}> = [
  {
    key: 'biografia',
    label: 'Biografia do Autor / Empresa',
    description: 'História, missão, visão e marcos principais.',
    placeholder: '## História\n\nDescreva a origem e o propósito do negócio...\n\n## Missão\n\n## Marcos Principais\n- Ano X: ...',
    icon: BookOpen,
    color: 'text-blue-400',
    accentBg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    key: 'voz',
    label: 'Voz do Autor / Marca',
    description: 'Estilo de escrita, adjetivos de personalidade e tom.',
    placeholder: '## Personalidade\n- Autoritário mas acessível\n- Direto, sem rodeios\n\n## Tom\n- Informal com clientes, formal em relatórios\n\n## Ritmo\n- Frases curtas. Parágrafos de no máximo 3 linhas.',
    icon: Mic2,
    color: 'text-purple-400',
    accentBg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    key: 'credenciais',
    label: 'Credenciais & Provas',
    description: 'Números, prêmios, aparições e evidências de autoridade.',
    placeholder: '## Resultados\n- +500 clientes atendidos\n- R$ 10M gerenciados em tráfego\n\n## Prêmios\n- Melhor agência 2023 — XYZ\n\n## Aparições\n- Podcast X, Evento Y',
    icon: ShieldCheck,
    color: 'text-green-400',
    accentBg: 'bg-green-500/10 border-green-500/20',
  },
  {
    key: 'proibidas',
    label: 'Palavras & Frases Proibidas',
    description: 'O que a marca NUNCA diz. Guia para todos os agentes.',
    placeholder: '## Termos Proibidos\n- "Barato" (use "acessível" ou "custo-benefício")\n- "Garantia de resultado"\n- Gírias: "top", "mitou"\n\n## Conceitos Banidos\n- Prometer métricas sem dados',
    icon: Ban,
    color: 'text-red-400',
    accentBg: 'bg-red-500/10 border-red-500/20',
  },
]

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ dna }: { dna: ClientDNA }) {
  const filled = PILLARS.filter(p => (dna[p.key] ?? '').trim().length > 0).length
  const pct = Math.round((filled / 4) * 100)
  const color = pct === 100 ? 'bg-[var(--color-success)]' : pct >= 50 ? 'bg-[var(--color-accent)]' : 'bg-blue-500'

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          DNA {pct === 100 ? '100% Completo 🎉' : `${pct}% Completo`}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{filled} de 4 pilares preenchidos</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct < 100 && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {PILLARS.filter(p => !(dna[p.key] ?? '').trim()).map(p => p.label).join(', ')} ainda {filled === 3 ? 'está' : 'estão'} pendente{filled === 3 ? '' : 's'}.
        </p>
      )}
    </div>
  )
}

// ─── Single Pillar Card ───────────────────────────────────────────────────────

function PillarCard({
  pillar, dna, onSave,
}: {
  pillar: typeof PILLARS[0]
  dna: ClientDNA
  onSave: (key: PillarKey, content: string, active: boolean) => Promise<void>
}) {
  const activeKey = `${pillar.key}_active` as keyof ClientDNA
  const content = (dna[pillar.key] as string) ?? ''
  const active = (dna[activeKey] as boolean) ?? true

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftActive, setDraftActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const Icon = pillar.icon
  const isEmpty = content.trim().length === 0

  function startEdit() {
    setDraft(content)
    setDraftActive(active)
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(pillar.key, draft, draftActive)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className={`rounded-lg border bg-[var(--color-bg-surface)] overflow-hidden transition-opacity ${!active && !editing ? 'opacity-60' : ''}`}
      style={{ borderColor: isEmpty ? 'var(--color-border-subtle)' : undefined }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${pillar.accentBg}`}>
            <Icon size={15} className={pillar.color} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">{pillar.label}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{pillar.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!editing && (
            <>
              <button
                onClick={() => onSave(pillar.key, content, !active)}
                title={active ? 'Desativar pilar' : 'Ativar pilar'}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {active
                  ? <ToggleRight size={20} className="text-[var(--color-accent)]" />
                  : <ToggleLeft size={20} />
                }
              </button>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40 transition-all"
              >
                <Pencil size={11} />
                Editar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-[var(--color-border-subtle)] px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            {/* Active toggle in edit mode */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDraftActive(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {draftActive
                  ? <ToggleRight size={16} className="text-[var(--color-accent)]" />
                  : <ToggleLeft size={16} />
                }
                {draftActive ? 'Pilar Ativo' : 'Pilar Inativo'}
              </button>
            </div>

            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={10}
              placeholder={pillar.placeholder}
              className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none resize-y font-mono leading-relaxed"
            />
            <p className="text-[10px] text-[var(--color-text-muted)]">Suporte a Markdown: **negrito**, ## título, - lista</p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <CheckCircle2 size={12} />}
                {saving ? 'Salvando…' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
              >
                <X size={12} />
                Cancelar
              </button>
            </div>
          </div>
        ) : isEmpty ? (
          <button
            onClick={startEdit}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border-subtle)] py-6 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/30 transition-all"
          >
            <Pencil size={13} />
            Clique para preencher este pilar
          </button>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DNAStructured({ clientId, initialData }: Props) {
  const [dna, setDNA] = useState<ClientDNA>(initialData ?? {})
  const [curating, setCurating] = useState(false)
  const [curateError, setCurateError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave(key: PillarKey, content: string, active: boolean) {
    const payload: Partial<ClientDNA> = {
      [key]: content || null,
      [`${key}_active`]: active,
    }
    const res = await fetch(`/api/clients/${clientId}/dna/structured`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const { data } = await res.json()
      setDNA(data)
      showToast('Salvo com sucesso!')
    } else {
      showToast('Erro ao salvar. Tente novamente.')
    }
  }

  async function handleCurate() {
    setCurating(true)
    setCurateError(null)
    const res = await fetch(`/api/clients/${clientId}/dna/curate`, { method: 'POST' })
    const body = await res.json()
    if (res.ok && body.data) {
      setDNA(body.data)
      showToast('DNA curado com sucesso pelo ORACLE!')
    } else {
      setCurateError(body.error ?? 'Erro desconhecido')
    }
    setCurating(false)
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <ProgressBar dna={dna} />

      {/* AI Curator Button */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Curador de DNA — @ORACLE</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Analisa arquivos sincronizados e memórias para preencher os pilares automaticamente.
          </p>
        </div>
        <button
          onClick={handleCurate}
          disabled={curating}
          className="ml-4 flex shrink-0 items-center gap-2 rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 disabled:opacity-50 transition-all"
        >
          {curating
            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)]" />
            : <Sparkles size={13} />
          }
          {curating ? 'Analisando…' : 'Curar com IA'}
        </button>
      </div>

      {curateError && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {curateError}
        </div>
      )}

      {/* 4 Pillars */}
      {PILLARS.map(pillar => (
        <PillarCard key={pillar.key} pillar={pillar} dna={dna} onSave={handleSave} />
      ))}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] shadow-xl">
          <CheckCircle2 size={14} className="text-[var(--color-success)]" />
          {toast}
        </div>
      )}
    </div>
  )
}

