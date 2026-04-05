'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dna, Palette, Type, MessageSquare, ImageIcon, ChevronRight, ChevronLeft, Loader2, Plus, X, Check } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  niche: string | null
}

const ARCHETYPES = ['Herói', 'Criador', 'Sábio', 'Explorador', 'Cuidador', 'Governante', 'Mago', 'Fora da Lei', 'Cara Comum', 'Bobo', 'Amante', 'Inocente']
const TONES = ['Profissional', 'Descontraído', 'Inspirador', 'Direto', 'Educativo', 'Ousado', 'Sofisticado', 'Empático', 'Divertido', 'Autoridade']

type Step = 'visual' | 'typography' | 'voice' | 'references'

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'visual',      label: 'Identidade Visual', icon: Palette },
  { id: 'typography',  label: 'Tipografia',        icon: Type },
  { id: 'voice',       label: 'Brand Voice',       icon: MessageSquare },
  { id: 'references',  label: 'Referências',       icon: ImageIcon },
]

interface FormData {
  // Visual
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  doNotUse: string
  // Typography
  headingFont: string
  bodyFont: string
  fontNotes: string
  // Voice
  archetype: string
  tones: string[]
  persona: string
  lexicon: string
  forbidden: string
  channelNotes: string
  // References
  competitors: string
  inspiration: string
  differentiation: string
  targetAudience: string
}

const DEFAULT: FormData = {
  primaryColor: '#F59E0B',
  secondaryColor: '#09090B',
  accentColor: '#FFFFFF',
  backgroundColor: '#09090B',
  doNotUse: '',
  headingFont: '',
  bodyFont: '',
  fontNotes: '',
  archetype: '',
  tones: [],
  persona: '',
  lexicon: '',
  forbidden: '',
  channelNotes: '',
  competitors: '',
  inspiration: '',
  differentiation: '',
  targetAudience: '',
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[#A1A1AA]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 flex-1 rounded border border-white/[0.07] bg-[#27272A] px-3 text-xs font-mono text-[#FAFAFA] focus:border-amber-500/50 focus:outline-none"
        />
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean
}) {
  const base = 'w-full rounded border border-white/[0.07] bg-[#27272A] px-3 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-amber-500/50 focus:outline-none'
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[#A1A1AA]">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`${base} py-2.5 min-h-[80px] resize-none`} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`${base} py-2.5`} />
      )}
    </div>
  )
}

export function DNAWizard({ clientId, clientName, niche }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('visual')
  const [form, setForm] = useState<FormData>(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEPS.findIndex(s => s.id === step)
  const isLast = stepIndex === STEPS.length - 1

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleTone(t: string) {
    set('tones', form.tones.includes(t)
      ? form.tones.filter(x => x !== t)
      : form.tones.length < 4 ? [...form.tones, t] : form.tones
    )
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/dna/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, niche, ...form }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao gerar DNA')
        return
      }
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
          <Dna size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Brand DNA — {clientName}</h2>
          <p className="text-xs text-[#71717A]">Capture a identidade completa da marca para gerar materiais consistentes</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = s.id === step
          const done = i < stepIndex
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-2 px-1 text-center transition-all ${
                active
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : done
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-white/[0.07] bg-[#18181B] hover:border-white/[0.15]'
              }`}
            >
              {done
                ? <Check size={14} className="text-green-400" />
                : <Icon size={14} className={active ? 'text-amber-400' : 'text-[#71717A]'} />
              }
              <span className={`hidden text-[10px] font-medium sm:block ${
                active ? 'text-amber-400' : done ? 'text-green-400' : 'text-[#71717A]'
              }`}>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-white/[0.07] bg-[#18181B] p-6 space-y-4">
        {step === 'visual' && (
          <>
            <p className="text-xs text-[#71717A] mb-2">Defina as cores que compõem a identidade visual da marca.</p>
            <div className="grid grid-cols-2 gap-4">
              <ColorSwatch label="Cor Primária" value={form.primaryColor} onChange={v => set('primaryColor', v)} />
              <ColorSwatch label="Cor Secundária" value={form.secondaryColor} onChange={v => set('secondaryColor', v)} />
              <ColorSwatch label="Cor de Destaque" value={form.accentColor} onChange={v => set('accentColor', v)} />
              <ColorSwatch label="Cor de Fundo" value={form.backgroundColor} onChange={v => set('backgroundColor', v)} />
            </div>
            <Input
              label="Cores/elementos que NÃO devem ser usados"
              value={form.doNotUse}
              onChange={v => set('doNotUse', v)}
              placeholder="Ex: nunca usar vermelho, evitar gradientes, sem fundos brancos puros"
              multiline
            />
          </>
        )}

        {step === 'typography' && (
          <>
            <p className="text-xs text-[#71717A] mb-2">Fontes utilizadas na identidade da marca.</p>
            <Input label="Fonte de Títulos (Heading)" value={form.headingFont} onChange={v => set('headingFont', v)} placeholder="Ex: Sora Bold, Montserrat 700, Playfair Display" />
            <Input label="Fonte de Corpo (Body)" value={form.bodyFont} onChange={v => set('bodyFont', v)} placeholder="Ex: Inter Regular, DM Sans 400, Nunito" />
            <Input
              label="Notas sobre tipografia"
              value={form.fontNotes}
              onChange={v => set('fontNotes', v)}
              placeholder="Ex: títulos sempre em caixa alta, nunca usar mais de 2 fontes, mínimo 16px para corpo"
              multiline
            />
          </>
        )}

        {step === 'voice' && (
          <>
            <p className="text-xs text-[#71717A] mb-2">Como a marca fala e se comporta em sua comunicação.</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#A1A1AA]">Arquétipo da Marca</label>
              <div className="flex flex-wrap gap-2">
                {ARCHETYPES.map(a => (
                  <button
                    key={a}
                    onClick={() => set('archetype', a)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      form.archetype === a
                        ? 'bg-amber-500 text-[#09090B]'
                        : 'bg-white/[0.05] text-[#A1A1AA] hover:bg-white/[0.10] hover:text-[#FAFAFA]'
                    }`}
                  >{a}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#A1A1AA]">Tom de Voz <span className="text-[#52525B]">(escolha até 4)</span></label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => {
                  const sel = form.tones.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTone(t)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        sel
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-white/[0.05] text-[#A1A1AA] border border-transparent hover:border-white/[0.1] hover:text-[#FAFAFA]'
                      }`}
                    >
                      {sel && <Check size={10} />}
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <Input label="Persona da Marca (descreva como se fosse uma pessoa)" value={form.persona} onChange={v => set('persona', v)} placeholder="Ex: Um especialista de 35 anos, confiante, fala de forma direta sem rodeios, usa dados para embasar argumentos" multiline />
            <Input label="Léxico da Marca (palavras e frases características)" value={form.lexicon} onChange={v => set('lexicon', v)} placeholder="Ex: 'resultados reais', 'sem desculpas', 'prova social', 'método comprovado'" multiline />
            <Input label="Palavras/abordagens PROIBIDAS" value={form.forbidden} onChange={v => set('forbidden', v)} placeholder="Ex: nunca usar 'barato', evitar clichês motivacionais, não fazer promessas de enriquecimento rápido" multiline />
            <Input label="Notas por canal (Instagram, Email, Anúncio...)" value={form.channelNotes} onChange={v => set('channelNotes', v)} placeholder="Ex: Instagram — mais visual e direto | Email — mais detalhado e educativo | Anúncio — foco na dor + solução" multiline />
          </>
        )}

        {step === 'references' && (
          <>
            <p className="text-xs text-[#71717A] mb-2">Contexto competitivo e de posicionamento da marca.</p>
            <Input label="Público-alvo" value={form.targetAudience} onChange={v => set('targetAudience', v)} placeholder="Ex: Empreendedores 28-45 anos, dono de pequenos negócios, buscam escalar sem contratar mais" multiline />
            <Input label="Principais concorrentes" value={form.competitors} onChange={v => set('competitors', v)} placeholder="Ex: Agência X, Ferramenta Y — o que eles fazem bem/mal" multiline />
            <Input label="Marcas de inspiração (não concorrentes)" value={form.inspiration} onChange={v => set('inspiration', v)} placeholder="Ex: Apple (minimalismo), Nubank (linguagem direta), Nike (posicionamento emocional)" multiline />
            <Input label="Diferencial competitivo da marca" value={form.differentiation} onChange={v => set('differentiation', v)} placeholder="Ex: único método que combina tráfego + produção de conteúdo em 30 dias com garantia" multiline />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setStep(STEPS[stepIndex - 1].id)}
          disabled={stepIndex === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-[#A1A1AA] transition-all hover:border-white/20 hover:text-[#FAFAFA] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} /> Anterior
        </button>

        {!isLast ? (
          <button
            onClick={() => setStep(STEPS[stepIndex + 1].id)}
            className="flex items-center gap-2 rounded-lg bg-[#27272A] px-4 py-2 text-sm font-medium text-[#FAFAFA] transition-all hover:bg-[#3F3F46]"
          >
            Próximo <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-[#09090B] shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Gerando DNA...</>
            ) : (
              <><Dna size={14} /> Gerar Brand DNA</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
