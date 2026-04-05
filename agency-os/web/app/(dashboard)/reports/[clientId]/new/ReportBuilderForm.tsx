'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Loader2 } from 'lucide-react'

const schema = z.object({
  title: z.string().min(3, 'Título obrigatório'),
  period_start: z.string().min(1, 'Data inicial obrigatória'),
  period_end: z.string().min(1, 'Data final obrigatória'),
  format: z.enum(['pdf', 'excel']),
})

type FormData = z.infer<typeof schema>

const SECTIONS = [
  { id: 'summary',   label: 'Resumo Executivo' },
  { id: 'outputs',   label: 'Outputs Produzidos' },
  { id: 'approvals', label: 'Aprovações' },
  { id: 'agents',    label: 'Uso de Agentes IA' },
]

interface Props {
  clientId: string
  clientName: string
}

export default function ReportBuilderForm({ clientId, clientName }: Props) {
  const router = useRouter()
  const [sections, setSections] = useState<string[]>(['summary', 'outputs'])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: `Relatório ${clientName} — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      format: 'pdf',
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
    },
  })

  function toggleSection(id: string) {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, client_id: clientId, sections }),
      })
      if (!res.ok) throw new Error('Erro ao criar relatório')
      toast.success('Relatório criado! Será gerado em breve.')
      router.push('/reports')
      router.refresh()
    } catch {
      toast.error('Erro ao criar relatório')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Título</Label>
        <Input
          {...register('title')}
          className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
        {errors.title && <p className="text-xs text-[var(--color-error)]">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Data Inicial</Label>
          <Input
            type="date"
            {...register('period_start')}
            className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]"
          />
          {errors.period_start && <p className="text-xs text-[var(--color-error)]">{errors.period_start.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Data Final</Label>
          <Input
            type="date"
            {...register('period_end')}
            className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]"
          />
          {errors.period_end && <p className="text-xs text-[var(--color-error)]">{errors.period_end.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Formato</Label>
        <Select defaultValue="pdf" onValueChange={(v) => setValue('format', v as 'pdf' | 'excel')}>
          <SelectTrigger className="bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)]">
            <SelectItem value="pdf" className="text-[var(--color-text-primary)] focus:bg-white/[0.05]">PDF</SelectItem>
            <SelectItem value="excel" className="text-[var(--color-text-primary)] focus:bg-white/[0.05]">Excel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Seções</Label>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSection(s.id)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${
                sections.includes(s.id)
                  ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border-subtle)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <div className={`h-3 w-3 rounded-sm border flex items-center justify-center ${
                sections.includes(s.id) ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-text-secondary)]'
              }`}>
                {sections.includes(s.id) && <span className="text-[var(--color-text-inverse)] text-[8px] font-bold">✓</span>}
              </div>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || sections.length === 0}
          className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileText size={14} className="mr-1.5" />}
          Gerar Relatório
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
