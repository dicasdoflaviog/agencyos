'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Images,
  DollarSign,
  Bot,
  LogOut,
  BarChart2,
  GitBranch,
  FileStack,
  TrendingUp,
  FileText,
  Settings,
  Users2,
  TrendingUpIcon,
  CreditCard,
  Store,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',           label: 'Overview',    icon: LayoutDashboard },
  { href: '/clients',    label: 'Clientes',    icon: Users },
  { href: '/jobs',       label: 'Jobs',        icon: Briefcase },
  { href: '/gallery',    label: 'Galeria',     icon: Images },
  { href: '/analytics',  label: 'Analytics',   icon: BarChart2 },
  { href: '/pipelines',  label: 'Pipelines',   icon: GitBranch },
  { href: '/templates',  label: 'Templates',   icon: FileStack },
  { href: '/financial',  label: 'Financeiro',  icon: DollarSign },
  { href: '/financial/advanced', label: 'MRR/ARR', icon: TrendingUpIcon, indent: true },
  { href: '/crm',         label: 'CRM',         icon: TrendingUp },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/reports',    label: 'Relatórios',  icon: FileText },
]

const SETTINGS_ITEMS = [
  { href: '/settings/team',      label: 'Equipe',      icon: Users2 },
  { href: '/settings/workspace', label: 'Workspace',   icon: Settings },
  { href: '/settings/billing',   label: 'Faturamento', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#18181B]">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-white/[0.07] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F59E0B]">
            <Bot size={14} className="text-[#0A0A0A]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-[#FAFAFA] tracking-tight">Agency OS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2 pt-3 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, indent }) => {
          const isActive = href === '/' ? pathname === '/' : pathname === href || (href !== '/financial' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
                indent && 'pl-6 text-xs',
                isActive
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                  : 'text-[#A1A1AA] hover:bg-white/[0.05] hover:text-[#FAFAFA]'
              )}
            >
              <Icon size={indent ? 13 : 15} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}

        {/* Settings section */}
        <div className="pt-3 mt-1 border-t border-white/[0.07]">
          <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#71717A]">Configurações</p>
          {SETTINGS_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
                  isActive
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                    : 'text-[#A1A1AA] hover:bg-white/[0.05] hover:text-[#FAFAFA]'
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.07] p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-sm font-medium text-[#A1A1AA] transition-colors duration-150 hover:bg-white/[0.05] hover:text-[#FAFAFA] cursor-pointer"
        >
          <LogOut size={15} strokeWidth={2} />
          Sair
        </button>
      </div>
    </aside>
  )
}
