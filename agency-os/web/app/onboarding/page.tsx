import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

async function getOrCreateWorkspace(userId: string) {
  const supabase = await createClient()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (member?.workspace_id) return member.workspace_id

  // Auto-create workspace on first access
  const { data: user } = await supabase.auth.getUser()
  const name = user.user?.email?.split('@')[0] ?? 'Minha Agência'
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36)

  const { data: workspace } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select('id')
    .single()

  if (!workspace) return null

  await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: userId, role: 'admin' })

  await supabase
    .from('profiles')
    .update({ workspace_id: workspace.id, role: 'admin' })
    .eq('id', userId)

  return workspace.id
}

async function getOnboardingData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getOrCreateWorkspace(user.id)
  if (!workspaceId) redirect('/')

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  return { workspaceId, progress }
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
