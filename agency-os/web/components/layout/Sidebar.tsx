'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Images,
  DollarSign,
  Bot,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/clients',    label: 'Clientes',   icon: Users },
  { href: '/jobs',       label: 'Jobs',       icon: Briefcase },
  { href: '/gallery',    label: 'Galeria',    icon: Images },
  { href: '/financial',  label: 'Financeiro', icon: DollarSign },
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
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
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
