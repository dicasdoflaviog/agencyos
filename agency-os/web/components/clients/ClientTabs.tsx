'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, BarChart2, Brain, BookOpen, LayoutDashboard, CalendarDays, Sparkles, ImageIcon, Video, Mic, Dna } from 'lucide-react'

const TABS = [
  { label: 'Overview',    suffix: '',            icon: LayoutDashboard },
  { label: 'DNA',         suffix: '/dna',        icon: Dna },
  { label: 'Contratos',   suffix: '/contracts',  icon: FileText },
  { label: 'CMS',         suffix: '/cms',        icon: BookOpen },
  { label: 'Agenda',      suffix: '/schedule',   icon: CalendarDays },
  { label: 'Métricas',    suffix: '/metrics',    icon: BarChart2 },
  { label: 'Memória IA',  suffix: '/memory',     icon: Brain },
  { label: 'ORACLE',      suffix: '/oracle',     icon: Sparkles },
  { label: 'Criativos',   suffix: '/creative',   icon: ImageIcon },
  { label: 'VULCAN',      suffix: '/video',      icon: Video },
  { label: 'VOX',         suffix: '/voice',      icon: Mic },
]

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname()
  const base = `/clients/${clientId}`

  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border-subtle)] mb-6">
      {TABS.map(({ label, suffix, icon: Icon }) => {
        const href = `${base}${suffix}`
        const isActive = suffix === ''
          ? pathname === base
          : pathname.startsWith(`${base}${suffix}`)

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              isActive
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20'
            )}
          >
            <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
