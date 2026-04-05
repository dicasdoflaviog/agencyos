'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, UploadCloud } from 'lucide-react'

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
  const [logoUploading, setLogoUploading] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [memberEmail, setMemberEmail] = useState('')

  async function handleUploadLogo(file: File | undefined) {
    if (!file) return
    setLogoUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('workspace_id', workspaceId)
      const res = await fetch('/api/upload/logo', { method: 'POST', body: form })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Erro no upload')
      setLogoUrl(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleFinishOnboarding() {
    const res = await fetch(`/api/workspaces/${workspaceId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Erro ao finalizar onboarding')
    router.refresh()
    router.push('/')
  }

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
      try {
        await handleFinishOnboarding()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao finalizar onboarding')
        setLoading(false)
      }
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
        // logo_url already saved during upload via /api/upload/logo
        // Only validate that upload happened; skip if user chose to skip
        if (logoUrl) {
          await fetch('/api/workspaces/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, logo_url: logoUrl }),
          })
        }
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
        <h1 className="text-2xl font-bold font-display text-[var(--color-text-primary)]">Configuração inicial</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Vamos deixar sua agência pronta em 5 passos</p>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
          <span>{stepsDone.length} de {STEPS.length} concluídos</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.07]">
          <div
            className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all duration-500"
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
              className={`h-1 flex-1 rounded-sm ${done ? 'bg-[var(--color-accent)]' : active ? 'bg-[var(--color-accent)]/50' : 'bg-white/[0.07]'}`}
            />
          )
        })}
      </div>

      {currentStep < STEPS.length && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Passo {currentStep + 1} de {STEPS.length}
          </div>
          <h2 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">{STEPS[currentStep].label}</h2>
          <p className="mb-6 text-sm text-[var(--color-text-secondary)]">{STEPS[currentStep].description}</p>

          {STEPS[currentStep].id === 'agency_name' && (
            <input
              type="text"
              placeholder="Ex: Studio Digital Criativo"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-[var(--color-accent)]/50 focus:outline-none"
            />
          )}

          {STEPS[currentStep].id === 'logo' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-800 overflow-hidden">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    : <UploadCloud size={22} className="text-zinc-500" />
                  }
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={e => handleUploadLogo(e.target.files?.[0])}
                    disabled={logoUploading}
                    className="w-full cursor-pointer text-xs text-[var(--color-text-secondary)] file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:text-xs file:font-medium file:text-[var(--color-text-inverse)] hover:file:bg-[var(--color-accent-hover)] disabled:opacity-50"
                  />
                  {logoUploading && (
                    <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">Fazendo upload...</p>
                  )}
                  {logoUrl && !logoUploading && (
                    <p className="mt-1.5 text-xs text-emerald-400">✓ Logo enviado com sucesso</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {STEPS[currentStep].id === 'first_client' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-[var(--color-accent)]/50 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-[var(--color-accent)]/50 focus:outline-none"
              />
            </div>
          )}

          {STEPS[currentStep].id === 'first_job' && (
            <input
              type="text"
              placeholder="Ex: Campanha de Janeiro"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-[var(--color-accent)]/50 focus:outline-none"
            />
          )}

          {STEPS[currentStep].id === 'invite_member' && (
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)}
              className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-[var(--color-accent)]/50 focus:outline-none"
            />
          )}

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => markStepDone(STEPS[currentStep].id)}
              className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
              type="button"
            >
              Pular este passo
            </button>
            <button
              onClick={handleStep}
              disabled={loading}
              className="rounded bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
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
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Configuração concluída!</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Sua agência está pronta para começar.</p>
        </div>
      )}
    </div>
  )
}
