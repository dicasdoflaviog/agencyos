'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Contract } from '@/components/contracts/ContractCard'

interface ContractFormProps {
  clientId: string
  initialData?: Contract
  mode: 'create' | 'edit'
}

export function ContractForm({ clientId, initialData, mode }: ContractFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [value, setValue] = useState(initialData?.value?.toString() ?? '')
  const [billing, setBilling] = useState<Contract['billing']>(initialData?.billing ?? 'monthly')
  const [startDate, setStartDate] = useState(initialData?.start_date ?? '')
  const [endDate, setEndDate] = useState(initialData?.end_date ?? '')
  const [status, setStatus] = useState<Contract['status']>(initialData?.status ?? 'draft')
  const [notes, setNotes] = useState(initialData?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        client_id: clientId,
        value: Number(value),
        billing,
        start_date: startDate,
        end_date: endDate || null,
        status,
        notes: notes || null,
      }

      const url = mode === 'create' ? '/api/contracts' : `/api/contracts/${initialData!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar contrato')

      toast.success(mode === 'create' ? 'Contrato criado!' : 'Contrato atualizado!')
      router.push(`/clients/${clientId}/contracts`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Value */}
        <div className="space-y-1.5">
          <Label htmlFor="value" className="text-xs font-medium text-[var(--color-text-secondary)]">
            Valor (R$) <span className="text-[var(--color-error)]">*</span>
          </Label>
          <Input
            id="value"
            type="number"
            min="0"
            step="0.01"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="5000.00"
            className="bg-white/[0.04] border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus-visible:border-[var(--color-accent)]/50 focus-visible:ring-0"
          />
        </div>

        {/* Billing type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--color-text-secondary)]">
            Tipo de Cobrança <span className="text-[var(--color-error)]">*</span>
          </Label>
          <Select value={billing} onValueChange={(v) => setBilling(v as Contract['billing'])}>
            <SelectTrigger className="bg-white/[0.04] border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:ring-0 focus:border-[var(--color-accent)]/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-bg-surface)] border-[var(--color-border-default)]">
              <SelectItem value="monthly" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Mensal</SelectItem>
              <SelectItem value="project" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Por Projeto</SelectItem>
              <SelectItem value="retainer" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Retainer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--color-text-secondary)]">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Contract['status'])}>
            <SelectTrigger className="bg-white/[0.04] border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:ring-0 focus:border-[var(--color-accent)]/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-bg-surface)] border-[var(--color-border-default)]">
              <SelectItem value="draft" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Rascunho</SelectItem>
              <SelectItem value="active" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Ativo</SelectItem>
              <SelectItem value="paused" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Pausado</SelectItem>
              <SelectItem value="ended" className="text-[var(--color-text-primary)] focus:bg-white/[0.06]">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start date */}
        <div className="space-y-1.5">
          <Label htmlFor="start_date" className="text-xs font-medium text-[var(--color-text-secondary)]">
            Data de Início <span className="text-[var(--color-error)]">*</span>
          </Label>
          <Input
            id="start_date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white/[0.04] border-[var(--color-border-default)] text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)]/50 focus-visible:ring-0 [color-scheme:dark]"
          />
        </div>

        {/* End date */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="end_date" className="text-xs font-medium text-[var(--color-text-secondary)]">
            Data de Término <span className="text-[var(--color-text-disabled)] text-[10px] font-normal">(opcional)</span>
          </Label>
          <Input
            id="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white/[0.04] border-[var(--color-border-default)] text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)]/50 focus-visible:ring-0 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs font-medium text-[var(--color-text-secondary)]">
          Observações <span className="text-[var(--color-text-disabled)] text-[10px] font-normal">(opcional)</span>
        </Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detalhes do contrato, condições especiais..."
          className="bg-white/[0.04] border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus-visible:border-[var(--color-accent)]/50 focus-visible:ring-0 resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={loading}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-semibold"
        >
          {loading && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {mode === 'create' ? 'Criar Contrato' : 'Salvar Alterações'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.04]"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
