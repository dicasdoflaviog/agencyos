import Link from 'next/link'
import { Calendar, DollarSign, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Contract {
  id: string
  client_id: string
  value: number
  billing: 'monthly' | 'project' | 'retainer'
  start_date: string
  end_date: string | null
  status: 'active' | 'paused' | 'ended' | 'draft'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  client?: { id: string; name: string }
}

const STATUS_CONFIG: Record<Contract['status'], { label: string; className: string }> = {
  active:  { label: 'Ativo',   className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  paused:  { label: 'Pausado', className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  ended:   { label: 'Encerrado', className: 'bg-white/[0.06] text-[#71717A]' },
  draft:   { label: 'Rascunho', className: 'bg-white/[0.06] text-[#71717A]' },
}

const BILLING_LABELS: Record<Contract['billing'], string> = {
  monthly:  'Mensal',
  project:  'Por Projeto',
  retainer: 'Retainer',
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface ContractCardProps {
  contract: Contract
  clientId?: string
}

export function ContractCard({ contract, clientId }: ContractCardProps) {
  const status = STATUS_CONFIG[contract.status]
  const cid = clientId ?? contract.client_id

  return (
    <Link
      href={`/clients/${cid}/contracts/${contract.id}`}
      className="block rounded-md border border-white/[0.07] bg-[#18181B] p-5 hover:border-white/[0.12] hover:bg-[#1C1C1F] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded bg-[#F59E0B]/10 p-1.5">
            <FileText size={14} className="text-[#F59E0B]" />
          </div>
          <div className="min-w-0">
            {contract.client && (
              <p className="text-xs text-[#71717A] truncate">{contract.client.name}</p>
            )}
            <p className="text-xs font-medium text-[#A1A1AA]">{BILLING_LABELS[contract.billing]}</p>
          </div>
        </div>
        <span className={cn('shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', status.className)}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={14} className="text-[#A1A1AA] shrink-0" />
        <span className="text-xl font-bold text-[#FAFAFA] tracking-tight">
          {formatCurrency(contract.value)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
        <Calendar size={12} className="shrink-0" />
        <span>{formatDate(contract.start_date)}</span>
        {contract.end_date && (
          <>
            <span className="text-[#3F3F46]">→</span>
            <span>{formatDate(contract.end_date)}</span>
          </>
        )}
        {!contract.end_date && (
          <span className="text-[#3F3F46] italic">sem data de término</span>
        )}
      </div>

      {contract.notes && (
        <p className="mt-3 text-xs text-[#71717A] line-clamp-2 border-t border-white/[0.04] pt-3">
          {contract.notes}
        </p>
      )}
    </Link>
  )
}
