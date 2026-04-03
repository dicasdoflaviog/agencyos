import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/clients/ClientForm'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:   { label: 'Ativo',     className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  paused:   { label: 'Pausado',   className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  archived: { label: 'Arquivado', className: 'bg-white/[0.06] text-[#A1A1AA]' },
}

const JOB_STATUS = {
  backlog:     { label: 'Backlog',       className: 'bg-white/[0.06] text-[#A1A1AA]' },
  in_progress: { label: 'Em Andamento',  className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  review:      { label: 'Revisão',       className: 'bg-blue-500/10 text-blue-400' },
  done:        { label: 'Concluído',     className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  cancelled:   { label: 'Cancelado',     className: 'bg-[#EF4444]/10 text-[#EF4444]' },
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: jobs }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  if (!client) notFound()

  const status = STATUS_CONFIG[client.status as keyof typeof STATUS_CONFIG]

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer mb-4"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Clientes
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#27272A] text-sm font-semibold text-[#FAFAFA]">
            {client.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded object-cover" />
            ) : (
              client.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">{client.name}</h2>
              <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.className)}>
                {status.label}
              </span>
            </div>
            {client.niche && <p className="text-sm text-[#A1A1AA]">{client.niche}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Info + Editar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-6">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Editar Dados</h3>
            <ClientForm initialData={client} mode="edit" />
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Contrato */}
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Contrato</h3>
            <div className="space-y-2">
              {client.contract_value != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Valor mensal</span>
                  <span className="font-medium text-[#FAFAFA]">{formatCurrency(client.contract_value)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#A1A1AA]">Status</span>
                <span className={cn('text-xs font-medium rounded px-2 py-0.5',
                  client.contract_status === 'active'  ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                  client.contract_status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                  'bg-[#EF4444]/10 text-[#EF4444]'
                )}>
                  {client.contract_status === 'active' ? 'Em dia' : client.contract_status === 'pending' ? 'Pendente' : 'Atrasado'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#A1A1AA]">Cliente desde</span>
                <span className="text-[#FAFAFA]">{formatDate(client.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Jobs recentes */}
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">Jobs Recentes</h3>
              <Link href={`/jobs?client=${client.id}`} className="text-xs text-[#F59E0B] hover:text-[#D97706] transition-colors cursor-pointer">
                Ver todos
              </Link>
            </div>
            {!jobs?.length ? (
              <p className="text-xs text-[#A1A1AA]">Nenhum job ainda.</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => {
                  const js = JOB_STATUS[job.status as keyof typeof JOB_STATUS]
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between group cursor-pointer">
                      <span className="text-xs text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors truncate max-w-[120px]">
                        {job.title}
                      </span>
                      <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', js.className)}>
                        {js.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
