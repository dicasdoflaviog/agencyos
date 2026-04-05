import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

async function getOrCreateWorkspace(userId: string, userEmail: string) {
  const supabase = await createClient()

  // Check existing membership via workspace_members.workspace_id
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (member?.workspace_id) return member.workspace_id

  // Fallback: check profiles directly (handles users created before migration 014)
  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.workspace_id) return profile.workspace_id

  // No workspace yet — create one using admin client (new user has no role → RLS blocks INSERT)
  const admin = createAdminClient()

  const name = userEmail?.split('@')[0] ?? 'Minha Agência'
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36)

  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({ name, slug })
    .select('id')
    .single()

  if (!workspace || wsError) {
    console.error('[onboarding] workspace create error:', wsError?.message)
    return null
  }

  await admin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: userId, role: 'admin' })

  await admin
    .from('profiles')
    .update({ workspace_id: workspace.id, role: 'admin' })
    .eq('id', userId)

  return workspace.id
}

async function getOnboardingData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getOrCreateWorkspace(user.id, user.email ?? '')
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] p-4">
      <OnboardingWizard workspaceId={workspaceId} stepsDone={stepsDone} />
    </div>
  )
}
