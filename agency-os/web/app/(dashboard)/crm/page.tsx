import { createClient } from '@/lib/supabase/server'
import { CRMKanban } from '@/components/crm/CRMKanban'
import { CRMMetricsBar } from '@/components/crm/CRMMetricsBar'
import type { Lead } from '@/types/database'

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, assigned_profile:profiles(id, name, avatar_url), tags:lead_tag_assignments(tag:lead_tags(id, name, color))')
    .order('created_at', { ascending: false })

  const normalizedLeads: Lead[] = (leads ?? []).map(l => ({
    ...l,
    tags: (l.tags as { tag: { id: string; name: string; color: string } }[])?.map(t => t.tag) ?? [],
  }))

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">CRM</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">{normalizedLeads.length} lead{normalizedLeads.length !== 1 ? 's' : ''}</p>
      </div>
      <CRMMetricsBar leads={normalizedLeads} />
      <CRMKanban leads={normalizedLeads} />
    </div>
  )
}
