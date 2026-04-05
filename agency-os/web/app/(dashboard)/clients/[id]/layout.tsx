import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientTabs } from '@/components/clients/ClientTabs'

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, niche, status')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold font-display text-[#FAFAFA] tracking-tight">{client.name}</h2>
        {client.niche && (
          <p className="text-sm text-[#A1A1AA] mt-0.5">{client.niche}</p>
        )}
      </div>
      <ClientTabs clientId={id} />
      {children}
    </div>
  )
}
