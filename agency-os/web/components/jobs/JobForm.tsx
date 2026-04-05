'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Client, Job } from '@/types/database'

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface JobFormProps {
  clients: Pick<Client, 'id' | 'name'>[]
  initialData?: Partial<Job>
  mode: 'create' | 'edit'
}

export function JobForm({ clients, initialData, mode }: JobFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      client_id: initialData?.client_id ?? '',
      priority: initialData?.priority ?? 'normal',
      due_date: initialData?.due_date ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const payload = {
      title: data.title,
      description: data.description || null,
      client_id: data.client_id,
      priority: data.priority,
      due_date: data.due_date || null,
    }

    if (mode === 'create') {
      const { data: created, error } = await supabase
        .from('jobs')
        .insert({ ...payload, status: 'backlog' })
        .select()
        .single()
      if (error) {
        toast.error('Erro ao criar job', { description: error.message })
      } else if (created) {
        toast.success('Job criado!')
        router.push(`/jobs/${created.id}`)
      }
    } else if (initialData?.id) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', initialData.id)
      if (error) {
        toast.error('Erro ao salvar', { description: error.message })
      } else {
        toast.success('Job atualizado!')
        router.refresh()
      }
    }
  }

  const inputClass = 'bg-white/[0.04] border-white/10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)]'
  const labelClass = 'text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      <div className="space-y-1.5">
        <Label className={labelClass}>Título *</Label>
        <Input {...register('title')} placeholder="Título do job" className={inputClass} />
        {errors.title && <p className="text-xs text-[var(--color-error)]">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Descrição</Label>
        <Textarea {...register('description')} placeholder="Descreva o job..." className={`${inputClass} resize-none`} rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Cliente *</Label>
        <Select
          defaultValue={initialData?.client_id ?? ''}
          onValueChange={(v) => setValue('client_id', v)}
        >
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Selecionar cliente" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.client_id && <p className="text-xs text-[var(--color-error)]">{errors.client_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Prioridade</Label>
          <Select
            defaultValue={initialData?.priority ?? 'normal'}
            onValueChange={(v) => setValue('priority', v as 'low' | 'normal' | 'high' | 'urgent')}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Prazo</Label>
          <Input {...register('due_date')} type="date" className={inputClass} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] cursor-pointer">
          {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Job' : 'Salvar'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} className="border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.05] cursor-pointer">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
