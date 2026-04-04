'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

interface Props {
  workspaceId: string
  stepsDone: string[]
}

const STEPS = [
  { id: 'agency_name', label: 'Nome da Agência', description: 'Como se chama sua agência?' },
  { id: 'logo', label: 'Logo da Agência', description: 'Faça upload do logo' },
  { id: 'first_client', label: 'Primeiro Cliente', description: 'Adicione seu primeiro cliente' },
  { id: 'first_job', label: 'Primeiro Job', description: 'Crie seu primeiro job' },
  { id: 'invite_member', label: 'Convidar Membro', description: 'Convide alguém do seu time' },
]

export function OnboardingWizard({ workspaceId, stepsDone: initialStepsDone }: Props) {
  const router = useRouter()
  const [stepsDone, setStepsDone] = useState<string[]>(initialStepsDone)
  const [currentStep, setCurrentStep] = useState(() => {
    const firstIncomplete = STEPS.findIndex(s => !initialStepsDone.includes(s.id))
    return firstIncomplete === -1 ? 0 : firstIncomplete
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [agencyName, setAgencyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [memberEmail, setMemberEmail] = useState('')

  async function markStepDone(stepId: string) {
    const newSteps = [...new Set([...stepsDone, stepId])]
    setStepsDone(newSteps)

    const allDone = STEPS.every(s => newSteps.includes(s.id))

    await fetch('/api/onboarding/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, steps_done: newSteps, completed: allDone }),
    })

    if (allDone) {
      router.push('/')
      return
    }

    const nextStep = STEPS.findIndex((s, i) => i > currentStep && !newSteps.includes(s.id))
    if (nextStep !== -1) setCurrentStep(nextStep)
    else setCurrentStep(STEPS.length)
  }

  async function handleStep() {
    setLoading(true)
    setError(null)

    try {
      const step = STEPS[currentStep]

      if (step.id === 'agency_name') {
        if (!agencyName.trim()) { setError('Informe o nome da agência'); setLoading(false); return }
        await fetch('/api/workspaces/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: workspaceId, name: agencyName.trim() }),
        })
      }

      if (step.id === 'logo') {
        if (!logoUrl.trim()) { setError('Informe a URL do logo'); setLoading(false); return }
        await fetch('/api/workspaces/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: workspaceId, logo_url: logoUrl.trim() }),
        })
      }

      if (step.id === 'first_client') {
        if (!clientName.trim()) { setError('Informe o nome do cliente'); setLoading(false); return }
        await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: clientName.trim(), email: clientEmail.trim() || undefined }),
        })
      }

      if (step.id === 'first_job') {
        if (!jobTitle.trim()) { setError('Informe o título do job'); setLoading(false); return }
        await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: jobTitle.trim() }),
        })
      }

      if (step.id === 'invite_member') {
        if (!memberEmail.trim()) { setError('Informe o email do membro'); setLoading(false); return }
        await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: memberEmail.trim(), role: 'collaborator' }),
        })
      }

      await markStepDone(step.id)
    } catch {
      setError('Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const progress = (stepsDone.length / STEPS.length) * 100

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Configuração inicial</h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">Vamos deixar sua agência pronta em 5 passos</p>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-[#A1A1AA]">
          <span>{stepsDone.length} de {STEPS.length} concluídos</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.07]">
          <div
            className="h-1.5 rounded-full bg-[#F59E0B] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-8 flex gap-2">
        {STEPS.map((step, i) => {
          const done = stepsDone.includes(step.id)
          const active = i === currentStep
          return (
            <div
              key={step.id}
              className={`h-1 flex-1 rounded-sm ${done ? 'bg-[#F59E0B]' : active ? 'bg-[#F59E0B]/50' : 'bg-white/[0.07]'}`}
            />
          )
        })}
      </div>

      {currentStep < STEPS.length && (
        <div className="rounded-lg border border-white/[0.07] bg-[#18181B] p-6">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[#71717A]">
            Passo {currentStep + 1} de {STEPS.length}
          </div>
          <h2 className="mb-1 text-lg font-semibold text-[#FAFAFA]">{STEPS[currentStep].label}</h2>
          <p className="mb-6 text-sm text-[#A1A1AA]">{STEPS[currentStep].description}</p>

          {STEPS[currentStep].id === 'agency_name' && (
            <input
              type="text"
              placeholder="Ex: Studio Digital Criativo"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              className="w-full rounded border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#F59E0B]/50 focus:outline-none"
            />
          )}

          {STEPS[currentStep].id === 'logo' && (
            <input
              type="url"
              placeholder="https://exemplo.com/logo.png"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              className="w-full rounded border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#F59E0B]/50 focus:outline-none"
            />
          )}

          {STEPS[currentStep].id === 'first_client' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full rounded border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#F59E0B]/50 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                className="w-full rounded border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#F59E0B]/50 focus:outline-none"
              />
            </div>
          )}

          {STEPS[currentStep].id === 'first_job' && (
            <input
              type="text"
              placeholder="Ex: Campanha de Janeiro"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              className="w-full rounded border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#F59E0B]/50 focus:outline-none"
            />
          )}

          {STEPS[currentStep].id === 'invite_member' && (
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)}
              className="w-full rounded border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#F59E0B]/50 focus:outline-none"
            />
          )}

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => markStepDone(STEPS[currentStep].id)}
              className="text-sm text-[#71717A] transition-colors hover:text-[#A1A1AA]"
              type="button"
            >
              Pular este passo
            </button>
            <button
              onClick={handleStep}
              disabled={loading}
              className="rounded bg-[#F59E0B] px-5 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#D97706] disabled:opacity-50"
              type="button"
            >
              {loading ? 'Salvando...' : 'Continuar →'}
            </button>
          </div>
        </div>
      )}

      {currentStep >= STEPS.length && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Check size={24} className="text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Configuração concluída!</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">Sua agência está pronta para começar.</p>
        </div>
      )}
    </div>
  )
}
