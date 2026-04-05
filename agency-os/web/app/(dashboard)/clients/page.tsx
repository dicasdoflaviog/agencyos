import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClientCard } from '@/components/clients/ClientCard'
import { Button } from '@/components/ui/button'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Clientes</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {clients?.length ?? 0} cliente{(clients?.length ?? 0) !== 1 ? 's' : ''} cadastrado{(clients?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] cursor-pointer">
          <Link href="/clients/new">
            <Plus size={15} strokeWidth={2.5} className="mr-1.5" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {!clients?.length ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Nenhum cliente cadastrado</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Crie seu primeiro cliente para começar</p>
          <Button asChild className="mt-4 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold hover:bg-[var(--color-accent-hover)] cursor-pointer">
            <Link href="/clients/new">
              <Plus size={14} strokeWidth={2.5} className="mr-1.5" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
