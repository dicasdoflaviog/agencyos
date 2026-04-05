import { createClient } from '@/lib/supabase/server'
import { WorkspaceSettingsForm } from '@/components/workspace/WorkspaceSettingsForm'
import type { Workspace } from '@/types/database'

export const metadata = { title: 'Workspace | Agency OS' }

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--color-text-primary)]">
          Configurações do Workspace
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Personalize a identidade e o domínio do seu workspace
        </p>
      </div>
      <div className="max-w-2xl rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
        <WorkspaceSettingsForm initialData={(workspace as Workspace) ?? null} />
      </div>
    </div>
  )
}
