import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DNAWizard } from '@/components/dna/DNAWizard'
import { DNADocument } from '@/components/dna/DNADocument'
import { DNAStructured } from '@/components/dna/DNAStructured'
import { KnowledgeFiles } from '@/components/dna/KnowledgeFiles'
import { DNATabNav } from '@/components/dna/DNATabNav'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ClientDNAPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab = 'structured' } = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, niche')
    .eq('id', id)
    .single()

  if (!client) notFound()

  // Fetch all data in parallel
  const [{ data: dnaMemory }, { data: structuredDNA }, { data: knowledgeFiles }] =
    await Promise.all([
      supabase
        .from('client_memories')
        .select('id, content, created_at')
        .eq('client_id', id)
        .eq('source', 'dna_document')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('client_dna')
        .select('*')
        .eq('client_id', id)
        .maybeSingle(),
      supabase
        .from('knowledge_files')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ])

  return (
    <div>
      <Suspense>
        <DNATabNav clientId={id} />
      </Suspense>

      {tab === 'structured' && (
        <DNAStructured clientId={id} initialData={structuredDNA} />
      )}

      {tab === 'document' && (
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
            <DNAWizard
              clientId={id}
              clientName={client.name}
              niche={client.niche}
              syncedFilesCount={(knowledgeFiles ?? []).filter(f => f.sync_status === 'synced').length}
            />
          )}
        </div>
      )}

      {tab === 'knowledge' && (
        <KnowledgeFiles clientId={id} initialFiles={knowledgeFiles ?? []} />
      )}
    </div>
  )
}
