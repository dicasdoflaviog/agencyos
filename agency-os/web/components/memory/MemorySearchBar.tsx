'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { ClientMemory, MemorySource } from '@/types/database'

const SOURCE_CONFIG: Record<MemorySource, { label: string; className: string }> = {
  output_approved: { label: 'Output',   className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  briefing:        { label: 'Briefing', className: 'bg-blue-500/10 text-blue-400' },
  manual:          { label: 'Manual',   className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
} as const

function SourceBadge({ source }: { source: ClientMemory['source'] }) {
  const config = source && source in SOURCE_CONFIG
    ? SOURCE_CONFIG[source as MemorySource]
    : { label: 'N/A', className: 'bg-white/[0.06] text-[#A1A1AA]' }
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export function MemorySearchBar({ clientId }: { clientId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(
        `/api/memory/search?client_id=${clientId}&q=${encodeURIComponent(query)}`
      )
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar memórias semanticamente..."
            className="w-full rounded-md border border-white/[0.07] bg-[#09090B] py-2 pl-9 pr-3 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#D97706] disabled:opacity-60"
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </form>

      {searched && (
        <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-4">
          {!results.length ? (
            <p className="text-xs text-[#A1A1AA]">
              Nenhuma memória encontrada para &ldquo;{query}&rdquo;
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#A1A1AA]">
                {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado
                {results.length !== 1 ? 's' : ''}
              </p>
              {results.map((memory) => (
                <div
                  key={memory.id}
                  className="border-t border-white/[0.07] pt-3 first:border-t-0 first:pt-0"
                >
                  <p className="line-clamp-3 text-sm text-[#FAFAFA]">{memory.content}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <SourceBadge source={memory.source} />
                    <span className="text-xs text-[#A1A1AA]">
                      {new Date(memory.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
