'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface Invoice {
  id: string
  contract_id: string
  amount: number
  due_date: string
  paid_at: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  notes: string | null
  pdf_url: string | null
  created_at: string
}

const STATUS_CONFIG: Record<Invoice['status'], { label: string; className: string }> = {
  pending:   { label: 'Pendente',   className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  paid:      { label: 'Pago',       className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  overdue:   { label: 'Atrasado',   className: 'bg-[#EF4444]/10 text-[#EF4444]' },
  cancelled: { label: 'Cancelado',  className: 'bg-white/[0.06] text-[#71717A]' },
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface InvoiceListProps {
  contractId: string
  initialInvoices: Invoice[]
}

export function InvoiceList({ contractId, initialInvoices }: InvoiceListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [showForm, setShowForm] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), due_date: dueDate, notes: notes || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar fatura')

      setInvoices((prev) => [data, ...prev])
      setAmount('')
      setDueDate('')
      setNotes('')
      setShowForm(false)
      toast.success('Fatura criada!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkPaid(invoiceId: string) {
    setMarkingPaid(invoiceId)
    try {
      const res = await fetch(`/api/contracts/${contractId}/invoices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, mark_paid: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao atualizar fatura')

      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? data : inv)))
      toast.success('Fatura marcada como paga!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setMarkingPaid(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#FAFAFA]">Faturas</h3>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="h-7 gap-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0A] font-semibold text-xs"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Cancelar' : 'Nova Fatura'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/[0.04] p-4 space-y-4"
        >
          <p className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wide">Nova Fatura</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-amount" className="text-xs text-[#A1A1AA]">
                Valor (R$) <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="inv-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/[0.04] border-white/[0.08] text-[#FAFAFA] placeholder:text-[#3F3F46] focus-visible:border-[#F59E0B]/50 focus-visible:ring-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due" className="text-xs text-[#A1A1AA]">
                Vencimento <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="inv-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-[#FAFAFA] focus-visible:border-[#F59E0B]/50 focus-visible:ring-0 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inv-notes" className="text-xs text-[#A1A1AA]">Observações</Label>
              <Textarea
                id="inv-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações opcionais..."
                className="bg-white/[0.04] border-white/[0.08] text-[#FAFAFA] placeholder:text-[#3F3F46] focus-visible:border-[#F59E0B]/50 focus-visible:ring-0 resize-none"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            size="sm"
            className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0A] font-semibold"
          >
            {submitting && <Loader2 size={12} className="mr-1.5 animate-spin" />}
            Criar Fatura
          </Button>
        </form>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-8 text-center">
          <p className="text-sm text-[#71717A]">Nenhuma fatura encontrada.</p>
          <p className="mt-1 text-xs text-[#3F3F46]">Clique em "Nova Fatura" para começar.</p>
        </div>
      ) : (
        <div className="rounded-md border border-white/[0.07] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Vencimento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Pago em</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#71717A] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {invoices.map((invoice) => {
                const st = STATUS_CONFIG[invoice.status]
                return (
                  <tr key={invoice.id} className="bg-[#18181B] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#FAFAFA]">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', st.className)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#71717A] text-xs">
                      {invoice.paid_at ? formatDateTime(invoice.paid_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button
                          onClick={() => handleMarkPaid(invoice.id)}
                          disabled={markingPaid === invoice.id}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-[#22C55E] hover:bg-[#22C55E]/10 disabled:opacity-50 transition-colors"
                        >
                          {markingPaid === invoice.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <CheckCircle2 size={11} />
                          }
                          Marcar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
