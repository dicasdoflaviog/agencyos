import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OracleChat } from '@/components/agents/OracleChat'

export default async function OraclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: history } = await supabase
    .from('agent_conversations')
    .select('role, content')
    .eq('job_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#FAFAFA]">ORACLE</h1>
        <p className="text-sm text-[#A1A1AA] mt-0.5">Agente de orquestração</p>
      </div>
      <OracleChat
        clientName={client.name}
        initialHistory={(history ?? []).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }))}
      />
    </div>
  )
}
