import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ConvertLeadDialog } from '@/components/crm/ConvertLeadDialog'
import { formatDate } from '@/lib/utils'
import type { Lead, LeadActivity } from '@/types/database'

const STAGE_LABELS = {
  prospect: 'Prospecto',
  contacted: 'Contatado',
  proposal_sent: 'Proposta enviada',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: '📞',
  email: '✉️',
  meeting: '🤝',
  note: '📝',
  stage_change: '🔄',
  whatsapp: '💬',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: lead }, { data: activities }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, assigned_profile:profiles(id, name, avatar_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!lead) notFound()

  const typedLead = lead as Lead
  const typedActivities = (activities ?? []) as LeadActivity[]

  return (
    <div>
      <Link href="/crm" className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors mb-4">
        <ArrowLeft size={13} strokeWidth={2} />
        Voltar para CRM
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-[#FAFAFA] tracking-tight">{typedLead.name}</h2>
          {typedLead.company && <p className="text-sm text-[#A1A1AA]">{typedLead.company}</p>}
          <span className="mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B]">
            {STAGE_LABELS[typedLead.stage]}
          </span>
        </div>
        {typedLead.stage !== 'won' && typedLead.converted_client_id == null && (
          <ConvertLeadDialog leadId={typedLead.id} leadName={typedLead.name} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Atividades</h3>
            {!typedActivities.length ? (
              <p className="text-xs text-[#A1A1AA]">Nenhuma atividade registrada.</p>
            ) : (
              <div className="space-y-3">
                {typedActivities.map(act => (
                  <div key={act.id} className="flex gap-3">
                    <span className="text-base">{ACTIVITY_ICONS[act.type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#FAFAFA]">{act.title}</p>
                      {act.body && <p className="text-xs text-[#A1A1AA] mt-0.5">{act.body}</p>}
                      <p className="text-xs text-[#A1A1AA] mt-1">{formatDate(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Detalhes</h3>
            <div className="space-y-2">
              {typedLead.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">E-mail</span>
                  <span className="text-[#FAFAFA] text-xs truncate max-w-[150px]">{typedLead.email}</span>
                </div>
              )}
              {typedLead.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Telefone</span>
                  <span className="text-[#FAFAFA] text-xs">{typedLead.phone}</span>
                </div>
              )}
              {typedLead.deal_value != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Valor</span>
                  <span className="text-[#FAFAFA] font-medium text-xs">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(typedLead.deal_value)}
                  </span>
                </div>
              )}
              {typedLead.source && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Origem</span>
                  <span className="text-[#FAFAFA] text-xs">{typedLead.source}</span>
                </div>
              )}
              {typedLead.expected_close && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Previsão</span>
                  <span className="text-[#FAFAFA] text-xs">{formatDate(typedLead.expected_close)}</span>
                </div>
              )}
            </div>
          </div>

          {typedLead.notes && (
            <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Notas</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">{typedLead.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
