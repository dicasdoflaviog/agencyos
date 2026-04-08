import { createClient } from '@/lib/supabase/server'
import { CRMKanban } from '@/components/crm/CRMKanban'
import { CRMMetricsBar } from '@/components/crm/CRMMetricsBar'
import type { Lead } from '@/types/database'
import Link from 'next/link'
import { Plus, Users, Bot } from 'lucide-react'

export const metadata = { title: 'CRM | Agency OS' }

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">CRM</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{normalizedLeads.length} lead{normalizedLeads.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/crm/sdr"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
        >
          <Bot size={14} />
          SDR Autônomo
        </Link>
      </div>
      {normalizedLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-20">
          <Users size={36} className="mb-3 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Nenhum lead cadastrado</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Adicione o primeiro lead para começar a usar o CRM</p>
          <Link
            href="/crm/leads/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
          >
            <Plus size={14} />
            Adicionar Lead
          </Link>
        </div>
      ) : (
        <>
          <CRMMetricsBar leads={normalizedLeads} />
          <CRMKanban leads={normalizedLeads} />
        </>
      )}
    </div>
  )
}
