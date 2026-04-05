import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DNAWizard } from '@/components/dna/DNAWizard'
import { DNADocument } from '@/components/dna/DNADocument'

export default async function ClientDNAPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, niche')
    .eq('id', id)
    .single()

  if (!client) notFound()

  // Busca o DNA Document já gerado (se existir)
  const { data: dnaMemory } = await supabase
    .from('client_memories')
    .select('id, content, created_at')
    .eq('client_id', id)
    .eq('source', 'dna_document')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      {dnaMemory ? (
        <DNADocument
          clientId={id}
          clientName={client.name}
          memoryId={dnaMemory.id}
          content={dnaMemory.content}
          createdAt={dnaMemory.created_at}
        />
      ) : (
        <DNAWizard clientId={id} clientName={client.name} niche={client.niche} />
      )}
    </div>
  )
}
