'use client'

import { useState } from 'react'
import { ClientForm } from './ClientForm'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Pencil, X } from 'lucide-react'
import type { Client } from '@/types/database'

const CONTRACT_STATUS = {
  active:  { label: 'Em dia',    cls: 'bg-[#22C55E]/10 text-[#22C55E]' },
  pending: { label: 'Pendente',  cls: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  overdue: { label: 'Atrasado',  cls: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

interface Props {
  client: Client & { instagram_handle?: string }
}

export function ClientDetailToggle({ client }: Props) {
  const [editing, setEditing] = useState(false)

  const cs = CONTRACT_STATUS[(client.contract_status ?? 'active') as keyof typeof CONTRACT_STATUS] ?? CONTRACT_STATUS.active

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
          {editing ? 'Editar Dados' : 'Dados do Cliente'}
        </h3>
        <button
          onClick={() => setEditing(e => !e)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            editing
              ? 'bg-white/[0.06] text-[#A1A1AA] hover:text-[#FAFAFA]'
              : 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20'
          )}
        >
          {editing ? <><X size={12} /> Cancelar</> : <><Pencil size={12} /> Editar</>}
        </button>
      </div>

      {editing ? (
        <ClientForm initialData={client} mode="edit" />
      ) : (
        <dl className="space-y-3">
          <Row label="Nome" value={client.name} />
          <Row label="Slug" value={client.slug ?? '—'} mono />
          {client.niche && <Row label="Nicho" value={client.niche} />}
          {(client as { instagram_handle?: string }).instagram_handle && (
            <Row label="Instagram" value={`@${(client as { instagram_handle?: string }).instagram_handle}`} />
          )}
          {client.contract_value != null && (
            <Row label="Contrato / mês" value={formatCurrency(client.contract_value)} />
          )}
          <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
            <dt className="text-xs text-[#71717A] uppercase tracking-wider">Status Contrato</dt>
            <dd>
              <span className={cn('rounded px-2 py-0.5 text-xs font-medium', cs.cls)}>
                {cs.label}
              </span>
            </dd>
          </div>
          <Row label="Cliente desde" value={formatDate(client.created_at)} />
          {client.notes && <Row label="Notas" value={client.notes} />}
        </dl>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-white/[0.04]">
      <dt className="text-xs text-[#71717A] uppercase tracking-wider shrink-0 mr-4">{label}</dt>
      <dd className={cn('text-sm text-[#FAFAFA] text-right', mono && 'font-mono text-xs text-[#A1A1AA]')}>{value}</dd>
    </div>
  )
}
