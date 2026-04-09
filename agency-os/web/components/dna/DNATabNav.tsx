'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Layers, FileCode2, FolderOpen, Palette, ShoppingBag, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'structured', label: 'DNA Estruturado',          icon: Layers      },
  { key: 'document',   label: 'Documento Gerado',         icon: FileCode2   },
  { key: 'knowledge',  label: 'Arquivos de Conhecimento', icon: FolderOpen  },
  { key: 'styleguide', label: 'Styleguide',               icon: Palette     },
  { key: 'products',   label: 'Produtos & Ofertas',       icon: ShoppingBag },
  { key: 'creative',   label: 'Criativos (ATLAS)',        icon: Wand2       },
]

export function DNATabNav({ clientId }: { clientId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'structured'

  return (
    <div className="flex items-center gap-1 mb-6 border-b border-[var(--color-border-subtle)] overflow-x-auto">
      {TABS.map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={`/clients/${clientId}/dna?tab=${key}`}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
            activeTab === key
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20'
          )}
        >
          <Icon size={14} strokeWidth={activeTab === key ? 2.5 : 2} />
          {label}
        </Link>
      ))}
    </div>
  )
}
