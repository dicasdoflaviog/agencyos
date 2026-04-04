import { Brain } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MemorySearchBar } from '@/components/memory/MemorySearchBar'
import { MemoryList } from '@/components/memory/MemoryList'

interface ClientMemory {
  id: string
  client_id: string
  content: string
  source: 'output_approved' | 'briefing' | 'manual' | null
  source_id: string | null
  created_at: string
}

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: memories } = await supabase
    .from('client_memories')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#F59E0B]/10">
            <Brain size={16} className="text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Memória IA</h2>
            <p className="text-sm text-[#A1A1AA]">
              Contexto e conhecimento acumulado sobre este cliente
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <MemorySearchBar clientId={id} />
      </div>

      <MemoryList memories={(memories ?? []) as ClientMemory[]} />
    </div>
  )
}
