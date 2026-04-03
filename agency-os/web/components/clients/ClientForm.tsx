'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import type { Client } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  niche: z.string().optional(),
  contract_value: z.string().optional(),
  contract_status: z.enum(['active', 'pending', 'overdue']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ClientFormProps {
  initialData?: Partial<Client>
  mode: 'create' | 'edit'
}

export function ClientForm({ initialData, mode }: ClientFormProps) {
  const router = useRouter()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(initialData?.logo_url ?? '')
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      niche: initialData?.niche ?? '',
      contract_value: initialData?.contract_value?.toString() ?? '',
      contract_status: initialData?.contract_status ?? 'active',
      notes: initialData?.notes ?? '',
    },
  })

  const nameValue = watch('name')

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setValue('name', val)
    if (mode === 'create') {
      setValue('slug', slugify(val))
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function uploadLogo(clientId: string): Promise<string | null> {
    if (!logoFile) return logoPreview || null

    const formData = new FormData()
    formData.append('file', logoFile)
    formData.append('clientId', clientId)

    const res = await fetch('/api/upload/logo', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      console.error('[uploadLogo] API error:', json)
      toast.error(`Erro no upload do logo: ${json.error ?? res.statusText}`)
      return null
    }

    return json.url as string
  }

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const payload = {
      name: data.name,
      slug: data.slug,
      niche: data.niche || null,
      contract_value: data.contract_value ? parseFloat(data.contract_value) : null,
      contract_status: data.contract_status,
      notes: data.notes || null,
    }

    if (mode === 'create') {
      const { data: created, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()
        .single()
      if (error) {
        toast.error('Erro ao criar cliente', { description: error.message })
      } else if (created) {
        const logo_url = await uploadLogo(created.id)
        if (logo_url) await supabase.from('clients').update({ logo_url }).eq('id', created.id)
        toast.success('Cliente criado com sucesso!')
        router.push(`/clients/${created.id}`)
      }
    } else if (initialData?.id) {
      const logo_url = await uploadLogo(initialData.id)
      const { error } = await supabase
        .from('clients')
        .update({ ...payload, ...(logo_url !== null ? { logo_url } : {}) })
        .eq('id', initialData.id)
      if (error) {
        toast.error('Erro ao salvar', { description: error.message })
      } else {
        toast.success('Cliente atualizado!')
        router.refresh()
      }
    }
  }

  const inputClass = 'bg-white/[0.04] border-white/10 text-[#FAFAFA] placeholder:text-[#A1A1AA]/50 focus:border-[#F59E0B]'
  const labelClass = 'text-[#A1A1AA] text-xs font-medium uppercase tracking-wider'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      {/* Logo upload */}
      <div className="space-y-1.5">
        <Label className={labelClass}>Logo</Label>
        <div className="flex items-center gap-3">
          {logoPreview ? (
            <div className="relative h-12 w-12 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="Logo" className="h-12 w-12 rounded object-cover border border-white/10" />
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreview('') }}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-white/10 bg-white/[0.02] text-[#A1A1AA] flex-shrink-0">
              <Upload size={14} />
            </div>
          )}
          <label className="cursor-pointer rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#A1A1AA] hover:bg-white/[0.07] hover:text-[#FAFAFA] transition-colors">
            {logoPreview ? 'Trocar logo' : 'Selecionar logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoChange} className="hidden" />
          </label>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className={labelClass}>Nome *</Label>
        <Input
          {...register('name')}
          onChange={handleNameChange}
          placeholder="Nome do cliente"
          className={inputClass}
        />
        {errors.name && <p className="text-xs text-[#EF4444]">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Slug</Label>
        <Input {...register('slug')} placeholder="nome-do-cliente" className={inputClass} />
        {errors.slug && <p className="text-xs text-[#EF4444]">{errors.slug.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Nicho</Label>
        <Input {...register('niche')} placeholder="Ex: Moda, Saúde, Tech..." className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Valor do contrato (R$)</Label>
          <Input {...register('contract_value')} type="number" step="0.01" placeholder="0,00" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Status do contrato</Label>
          <Select
            defaultValue={initialData?.contract_status ?? 'active'}
            onValueChange={(v) => setValue('contract_status', v as 'active' | 'pending' | 'overdue')}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#27272A] border-white/[0.07] text-[#FAFAFA]">
              <SelectItem value="active">Em dia</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Notas</Label>
        <Textarea {...register('notes')} placeholder="Observações sobre o cliente..." className={`${inputClass} resize-none`} rows={3} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] cursor-pointer"
        >
          {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Cliente' : 'Salvar Alterações'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="border border-white/10 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.05] cursor-pointer"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
