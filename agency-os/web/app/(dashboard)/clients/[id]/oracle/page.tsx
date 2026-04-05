import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OracleChat } from '@/components/agents/OracleChat'

export default async function OraclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  // Load most recent session for this client (if any)
  const { data: session } = await supabase
    .from('oracle_sessions')
    .select('id')
    .eq('client_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">ORACLE</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Agente de orquestração</p>
      </div>
      <OracleChat
        clientId={id}
        clientName={client.name}
        initialSessionId={session?.id}
      />
    </div>
  )
}
