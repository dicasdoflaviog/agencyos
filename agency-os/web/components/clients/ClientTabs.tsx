'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, BarChart2, Brain, BookOpen, LayoutDashboard, CalendarDays } from 'lucide-react'

const TABS = [
  { label: 'Overview',    suffix: '',            icon: LayoutDashboard },
  { label: 'Contratos',   suffix: '/contracts',  icon: FileText },
  { label: 'CMS',         suffix: '/cms',        icon: BookOpen },
  { label: 'Agenda',      suffix: '/schedule',   icon: CalendarDays },
  { label: 'Métricas',    suffix: '/metrics',    icon: BarChart2 },
  { label: 'Memória IA',  suffix: '/memory',     icon: Brain },
]

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname()
  const base = `/clients/${clientId}`

  return (
    <div className="flex items-center gap-1 border-b border-white/[0.07] mb-6">
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
                ? 'border-[#F59E0B] text-[#F59E0B]'
                : 'border-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-white/20'
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
