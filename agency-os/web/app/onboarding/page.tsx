import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

async function getOnboardingData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member?.workspace_id) redirect('/')

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .maybeSingle()

  return { workspaceId: member.workspace_id, progress }
}

export default async function OnboardingPage() {
  const { workspaceId, progress } = await getOnboardingData()

  if (progress?.completed_at) redirect('/')

  const stepsDone = (progress?.steps_done ?? []) as string[]

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] p-4">
      <OnboardingWizard workspaceId={workspaceId} stepsDone={stepsDone} />
    </div>
  )
}
