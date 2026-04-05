'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import { Loader2, Save } from 'lucide-react'

const LEAD_STAGES = [
  { value: 'lead',       label: 'Lead' },
  { value: 'qualified',  label: 'Qualificado' },
  { value: 'proposal',   label: 'Proposta' },
  { value: 'negotiation',label: 'Negociação' },
  { value: 'won',        label: 'Ganho' },
  { value: 'lost',       label: 'Perdido' },
]

const SOURCE_OPTIONS = [
  { value: 'instagram',  label: 'Instagram' },
  { value: 'linkedin',   label: 'LinkedIn' },
  { value: 'referral',   label: 'Indicação' },
  { value: 'website',    label: 'Site' },
  { value: 'cold_email', label: 'Cold Email' },
  { value: 'other',      label: 'Outro' },
]

const schema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  company:     z.string().optional(),
  email:       z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone:       z.string().optional(),
  source:      z.string().optional(),
  stage:       z.string().optional(),
  deal_value:  z.union([z.number().positive(), z.nan(), z.undefined()]).optional()
                 .transform(v => (v === undefined || Number.isNaN(v)) ? undefined : v),
  notes:       z.string().optional(),
})

type FormData = {
  name: string
  company?: string
  email?: string
  phone?: string
  source?: string
  stage?: string
  deal_value?: number
  notes?: string
}

interface Lead {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  stage: string
  deal_value?: number | null
  notes?: string | null
}

interface Props {
  lead?: Lead
  onClose: () => void
  onSaved: () => void
}

export default function LeadForm({ lead, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = Boolean(lead?.id)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:       lead?.name ?? '',
      company:    lead?.company ?? '',
      email:      lead?.email ?? '',
      phone:      lead?.phone ?? '',
      source:     lead?.source ?? '',
      stage:      lead?.stage ?? 'lead',
      deal_value: lead?.deal_value ?? undefined,
      notes:      lead?.notes ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const url    = isEdit ? `/api/crm/leads/${lead!.id}` : '/api/crm/leads'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao salvar lead')
      }

      toast.success(isEdit ? 'Lead atualizado!' : 'Lead criado!')
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
            Nome <span className="text-[var(--color-error)]">*</span>
          </Label>
          <Input
            {...register('name')}
            placeholder="João Silva"
            className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] h-9"
          />
          {errors.name && <p className="text-xs text-[var(--color-error)]">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Empresa</Label>
          <Input
            {...register('company')}
            placeholder="Acme Ltda."
            className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">E-mail</Label>
          <Input
            {...register('email')}
            type="email"
            placeholder="joao@empresa.com"
            className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] h-9"
          />
          {errors.email && <p className="text-xs text-[var(--color-error)]">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Telefone</Label>
          <Input
            {...register('phone')}
            type="tel"
            placeholder="+55 11 9xxxx-xxxx"
            className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Stage</Label>
          <Select
            defaultValue={lead?.stage ?? 'lead'}
            onValueChange={(v) => setValue('stage', v)}
          >
            <SelectTrigger className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)]">
              {LEAD_STAGES.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-[var(--color-text-primary)] focus:bg-white/[0.05]">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Origem</Label>
          <Select
            defaultValue={lead?.source ?? ''}
            onValueChange={(v) => setValue('source', v)}
          >
            <SelectTrigger className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] h-9">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)]">
              {SOURCE_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-[var(--color-text-primary)] focus:bg-white/[0.05]">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Valor do Negócio (R$)</Label>
        <Input
          {...register('deal_value')}
          type="number"
          step="0.01"
          min="0"
          placeholder="5000"
          className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] h-9"
        />
        {errors.deal_value && <p className="text-xs text-[var(--color-error)]">{errors.deal_value.message}</p>}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Notas</Label>
        <Textarea
          {...register('notes')}
          placeholder="Contexto relevante sobre este lead..."
          rows={3}
          className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={loading}
          className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
          {isEdit ? 'Salvar Alterações' : 'Criar Lead'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
