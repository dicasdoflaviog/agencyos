import { createClient } from '@/lib/supabase/server'
import { WorkspaceSettingsForm } from '@/components/workspace/WorkspaceSettingsForm'
import type { Workspace } from '@/types/database'

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
        <h2 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
          Configurações do Workspace
        </h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Personalize a identidade e o domínio do seu workspace
        </p>
      </div>
      <div className="max-w-2xl rounded-md border border-white/[0.07] bg-[#18181B] p-6">
        <WorkspaceSettingsForm initialData={(workspace as Workspace) ?? null} />
      </div>
    </div>
  )
}
