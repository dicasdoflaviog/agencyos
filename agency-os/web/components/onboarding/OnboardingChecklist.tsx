'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Circle } from 'lucide-react'

const STEP_LABELS: Record<string, string> = {
  agency_name: 'Nome da agência',
  logo: 'Logo da agência',
  first_client: 'Primeiro cliente',
  first_job: 'Primeiro job',
  invite_member: 'Convidar membro',
}

const ALL_STEPS = ['agency_name', 'logo', 'first_client', 'first_job', 'invite_member']

interface ProgressData {
  steps_done: string[]
  completed_at: string | null
}

export function OnboardingChecklist() {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onboarding/progress')
      .then(r => r.json())
      .then((data: ProgressData) => setProgress(data))
      .catch(() => setProgress(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !progress) return null
  if (progress.completed_at) return null

  const stepsDone = progress.steps_done ?? []
  const percent = Math.round((stepsDone.length / ALL_STEPS.length) * 100)

  return (
    <div className="mb-6 rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#FAFAFA]">Configure sua agência</h3>
        <span className="text-xs font-medium text-[#F59E0B]">{percent}%</span>
      </div>

      <div className="mb-4 h-1.5 w-full rounded-full bg-white/[0.07]">
        <div
          className="h-1.5 rounded-full bg-[#F59E0B] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mb-4 space-y-2">
        {ALL_STEPS.map(step => {
          const done = stepsDone.includes(step)
          return (
            <div key={step} className="flex items-center gap-2 text-sm">
              {done
                ? <CheckCircle size={14} className="flex-shrink-0 text-[#F59E0B]" />
                : <Circle size={14} className="flex-shrink-0 text-[#52525B]" />
              }
              <span className={done ? 'text-[#A1A1AA] line-through' : 'text-[#FAFAFA]'}>
                {STEP_LABELS[step]}
              </span>
            </div>
          )
        })}
      </div>

      <Link
        href="/onboarding"
        className="inline-block rounded bg-[#F59E0B] px-4 py-1.5 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-[#D97706]"
      >
        Continuar configuração →
      </Link>
    </div>
  )
}
