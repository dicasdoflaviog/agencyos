interface ClientMemory {
  id: string
  client_id: string
  content: string
  source: 'output_approved' | 'briefing' | 'manual' | null
  source_id: string | null
  created_at: string
}

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  output_approved: { label: 'Output',   className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  briefing:        { label: 'Briefing', className: 'bg-blue-500/10 text-blue-400' },
  manual:          { label: 'Manual',   className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
}

export function MemoryList({ memories }: { memories: ClientMemory[] }) {
  if (!memories.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-white/[0.07] bg-[#18181B] py-12 text-center">
        <p className="text-sm font-medium text-[#FAFAFA]">Nenhuma memória registrada</p>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Memórias são criadas automaticamente a partir de outputs aprovados e briefings
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {memories.map((memory) => {
        const src = memory.source && memory.source in SOURCE_CONFIG
          ? SOURCE_CONFIG[memory.source]
          : { label: 'N/A', className: 'bg-white/[0.06] text-[#A1A1AA]' }

        return (
          <div key={memory.id} className="rounded-md border border-white/[0.07] bg-[#18181B] p-4">
            <p className="line-clamp-3 text-sm text-[#FAFAFA]">{memory.content}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${src.className}`}>
                {src.label}
              </span>
              <span className="text-xs text-[#A1A1AA]">
                {new Date(memory.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
